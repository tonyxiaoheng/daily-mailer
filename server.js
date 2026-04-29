const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const tls = require("tls");
const { Buffer } = require("buffer");

const ROOT = __dirname;
const WEB_DIR = path.join(ROOT, "web");
const CONFIG_PATH = path.join(ROOT, "config.json");
const LOG_PATH = path.join(ROOT, "send-log.json");

const DEFAULT_CONFIG = {
  schedule: {
    enabled: false,
    time: "08:00",
    timezone: "Asia/Shanghai",
    sendOnStartIfMissed: false,
  },
  email: {
    smtpHost: "",
    smtpPort: 465,
    security: "ssl",
    username: "",
    password: "",
    fromName: "Daily Briefing",
    fromEmail: "",
    to: "",
    subject: "今日天气与新闻简报",
  },
  content: {
    city: "Shanghai",
    country: "China",
    includeWeather: true,
    newsCategories: ["top", "technology"],
    maxNewsPerCategory: 5,
    language: "zh-CN",
  },
};

const NEWS_FEEDS = {
  top: { label: "热点", url: "https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
  world: {
    label: "国际",
    url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
  },
  business: {
    label: "财经",
    url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
  },
  technology: {
    label: "科技",
    url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
  },
  sports: {
    label: "体育",
    url: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
  },
  entertainment: {
    label: "娱乐",
    url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
  },
  health: {
    label: "健康",
    url: "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
  },
  science: {
    label: "科学",
    url: "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
  },
};

const WEATHER_CODES = {
  0: "晴朗",
  1: "大部晴朗",
  2: "局部多云",
  3: "阴天",
  45: "有雾",
  48: "霜雾",
  51: "小毛毛雨",
  53: "毛毛雨",
  55: "较强毛毛雨",
  61: "小雨",
  63: "中雨",
  65: "大雨",
  71: "小雪",
  73: "中雪",
  75: "大雪",
  80: "阵雨",
  81: "较强阵雨",
  82: "强阵雨",
  95: "雷暴",
};

let lastRunDate = "";
let lastStatus = { state: "idle", message: "等待配置", updatedAt: "" };

function deepMerge(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override || {})) {
    if (value && typeof value === "object" && !Array.isArray(value) && result[key] && typeof result[key] === "object") {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function loadConfig() {
  return deepMerge(DEFAULT_CONFIG, loadJson(CONFIG_PATH, {}));
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
}

function setStatus(state, message) {
  lastStatus = { state, message, updatedAt: new Date().toISOString().slice(0, 19) };
}

function appendLog(entry) {
  const logs = loadJson(LOG_PATH, []);
  logs.unshift(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs.slice(0, 80), null, 2), "utf8");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function fetchJson(url) {
  const response = await fetch(url, { headers: { "User-Agent": "DailyMailer/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "DailyMailer/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.text();
}

async function geocode(city, country) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    city,
  )}&count=1&language=zh&format=json`;
  const data = await fetchJson(url);
  const place = data.results?.[0];
  if (!place) throw new Error(`找不到城市：${city}`);
  if (country && !String(place.country || "").toLowerCase().includes(country.toLowerCase())) {
    setStatus("warning", `城市匹配到 ${place.name} / ${place.country}`);
  }
  return place;
}

async function fetchWeather(config) {
  const content = config.content;
  const place = await geocode(content.city, content.country);
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
    timezone: config.schedule.timezone || "auto",
    forecast_days: "1",
  });
  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
  const code = Number(data.daily.weather_code[0]);
  return {
    city: place.name || content.city,
    country: place.country || content.country,
    date: data.daily.time[0],
    summary: WEATHER_CODES[code] || `天气代码 ${code}`,
    tempMax: data.daily.temperature_2m_max[0],
    tempMin: data.daily.temperature_2m_min[0],
    precipitation: data.daily.precipitation_probability_max[0],
    currentTemp: data.current?.temperature_2m ?? "-",
    humidity: data.current?.relative_humidity_2m ?? "-",
    wind: data.current?.wind_speed_10m ?? "-",
  };
}

function tagValue(item, tag) {
  const match = item.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return decodeXml(match?.[1] || "").trim();
}

async function fetchNews(config) {
  const selected = config.content.newsCategories || [];
  const maxItems = Number(config.content.maxNewsPerCategory || 5);
  const groups = [];
  for (const category of selected) {
    const feed = NEWS_FEEDS[category];
    if (!feed) continue;
    try {
      const xml = await fetchText(feed.url);
      const itemXml = [...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].slice(0, maxItems).map((match) => match[0]);
      const items = itemXml
        .map((item) => ({
          title: tagValue(item, "title"),
          link: tagValue(item, "link"),
          source: tagValue(item, "source"),
          pubDate: tagValue(item, "pubDate"),
        }))
        .filter((item) => item.title);
      groups.push({ category, label: feed.label, items });
    } catch (error) {
      groups.push({ category, label: feed.label, error: error.message, items: [] });
    }
  }
  return groups;
}

async function buildBriefing(config) {
  const weather = config.content.includeWeather ? await fetchWeather(config) : null;
  const news = await fetchNews(config);
  const generatedAt = new Date().toLocaleString("zh-CN", { hour12: false });
  const html = renderEmailHtml(config, weather, news, generatedAt);
  const text = renderEmailText(config, weather, news, generatedAt);
  return { weather, news, html, text, generatedAt };
}

function renderEmailHtml(config, weather, news, generatedAt) {
  const subject = escapeHtml(config.email.subject || "今日简报");
  const parts = [
    "<!doctype html><html><head><meta charset='utf-8'>",
    "<style>body{font-family:Arial,'Microsoft YaHei',sans-serif;background:#f4f7fb;margin:0;padding:24px;color:#1c2635}",
    ".wrap{max-width:760px;margin:auto;background:#fff;border:1px solid #dde5ef;padding:28px}",
    "h1{font-size:26px;margin:0 0 8px}h2{font-size:18px;margin:28px 0 12px}",
    ".meta{color:#617086;font-size:13px}.weather{background:#eef7f2;border-left:4px solid #2e9f69;padding:16px}",
    "a{color:#2167c9;text-decoration:none}li{margin:10px 0}.tag{color:#617086;font-size:12px}</style></head><body><div class='wrap'>",
    `<h1>${subject}</h1><div class='meta'>生成时间：${escapeHtml(generatedAt)}</div>`,
  ];
  if (weather) {
    parts.push(
      "<h2>天气</h2>",
      "<div class='weather'>",
      `<strong>${escapeHtml(weather.city)}，${escapeHtml(weather.country)}</strong><br>`,
      `${escapeHtml(weather.summary)}，${weather.tempMin}°C - ${weather.tempMax}°C，降水概率 ${weather.precipitation}%。<br>`,
      `当前 ${weather.currentTemp}°C，湿度 ${weather.humidity}%，风速 ${weather.wind} km/h。`,
      "</div>",
    );
  }
  for (const group of news) {
    parts.push(`<h2>${escapeHtml(group.label)}</h2>`);
    if (group.error) {
      parts.push(`<p class='tag'>获取失败：${escapeHtml(group.error)}</p>`);
      continue;
    }
    parts.push("<ol>");
    for (const item of group.items) {
      parts.push(`<li><a href='${escapeHtml(item.link)}'>${escapeHtml(item.title)}</a>`);
      if (item.source) parts.push(`<div class='tag'>${escapeHtml(item.source)}</div>`);
      parts.push("</li>");
    }
    parts.push("</ol>");
  }
  parts.push("<p class='meta'>由 Daily Mailer 自动发送。</p></div></body></html>");
  return parts.join("");
}

function renderEmailText(config, weather, news, generatedAt) {
  const lines = [config.email.subject || "今日简报", `生成时间：${generatedAt}`, ""];
  if (weather) {
    lines.push(
      "天气",
      `${weather.city}，${weather.country}：${weather.summary}，${weather.tempMin}°C - ${weather.tempMax}°C，降水概率 ${weather.precipitation}%。`,
      "",
    );
  }
  for (const group of news) {
    lines.push(group.label);
    if (group.error) lines.push(`获取失败：${group.error}`);
    group.items.forEach((item, index) => lines.push(`${index + 1}. ${item.title} ${item.link}`));
    lines.push("");
  }
  return lines.join("\n");
}

function encodeHeader(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), "utf8").toString("base64")}?=`;
}

function normalizeRecipients(to) {
  return String(to || "")
    .split(/[;,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildMimeMessage(config, briefing) {
  const boundary = `boundary_${Date.now().toString(36)}`;
  const email = config.email;
  const to = normalizeRecipients(email.to).join(", ");
  return [
    `From: ${encodeHeader(email.fromName || "")} <${email.fromEmail}>`,
    `To: ${to}`,
    `Subject: ${encodeHeader(email.subject || "今日简报")}`,
    "MIME-Version: 1.0",
    `Date: ${new Date().toUTCString()}`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(briefing.text, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n"),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(briefing.html, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n"),
    `--${boundary}--`,
    "",
  ].join("\r\n");
}

class SmtpClient {
  constructor({ host, port, security }) {
    this.host = host;
    this.port = Number(port);
    this.security = security;
    this.socket = null;
    this.buffer = "";
  }

  async connect() {
    this.socket =
      this.security === "ssl"
        ? tls.connect({ host: this.host, port: this.port, servername: this.host })
        : net.connect({ host: this.host, port: this.port });
    this.socket.setEncoding("utf8");
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
    });
    await new Promise((resolve, reject) => {
      this.socket.once("connect", resolve);
      this.socket.once("error", reject);
    });
    await this.expect([220]);
  }

  async expect(codes) {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      const lines = this.buffer.split(/\r?\n/).filter(Boolean);
      const last = lines[lines.length - 1] || "";
      if (/^\d{3} /.test(last)) {
        this.buffer = "";
        const code = Number(last.slice(0, 3));
        if (!codes.includes(code)) throw new Error(`SMTP 错误：${lines.join(" | ")}`);
        return lines.join("\n");
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("SMTP 响应超时");
  }

  async command(line, codes = [250]) {
    this.socket.write(`${line}\r\n`);
    return this.expect(codes);
  }

  async upgradeToTls() {
    await this.command(`EHLO localhost`);
    await this.command("STARTTLS", [220]);
    this.socket = tls.connect({ socket: this.socket, servername: this.host });
    this.socket.setEncoding("utf8");
    this.buffer = "";
    this.socket.on("data", (chunk) => {
      this.buffer += chunk;
    });
    await new Promise((resolve, reject) => {
      this.socket.once("secureConnect", resolve);
      this.socket.once("error", reject);
    });
  }

  async sendMail({ username, password, fromEmail, recipients, message }) {
    await this.command(`EHLO localhost`);
    if (this.security === "starttls") {
      await this.upgradeToTls();
      await this.command(`EHLO localhost`);
    }
    await this.command("AUTH LOGIN", [334]);
    await this.command(Buffer.from(username).toString("base64"), [334]);
    await this.command(Buffer.from(password).toString("base64"), [235]);
    await this.command(`MAIL FROM:<${fromEmail}>`);
    for (const recipient of recipients) {
      await this.command(`RCPT TO:<${recipient}>`, [250, 251]);
    }
    await this.command("DATA", [354]);
    this.socket.write(`${message.replace(/\r?\n\./g, "\r\n..")}\r\n.\r\n`);
    await this.expect([250]);
    await this.command("QUIT", [221]);
  }

  close() {
    if (this.socket) this.socket.end();
  }
}

async function sendEmail(config, briefing) {
  const email = config.email;
  const required = ["smtpHost", "smtpPort", "username", "password", "fromEmail", "to"];
  const missing = required.filter((field) => !String(email[field] || "").trim());
  if (missing.length) throw new Error(`邮件设置未完整填写：${missing.join("、")}`);
  const recipients = normalizeRecipients(email.to);
  const client = new SmtpClient({ host: email.smtpHost, port: email.smtpPort, security: email.security });
  try {
    await client.connect();
    await client.sendMail({
      username: email.username,
      password: email.password,
      fromEmail: email.fromEmail,
      recipients,
      message: buildMimeMessage(config, briefing),
    });
  } finally {
    client.close();
  }
}

async function runDelivery(reason = "manual") {
  const config = loadConfig();
  setStatus("running", "正在生成简报");
  try {
    const briefing = await buildBriefing(config);
    setStatus("running", "正在发送邮件");
    await sendEmail(config, briefing);
    const entry = { ok: true, reason, message: "发送成功", time: new Date().toISOString().slice(0, 19) };
    appendLog(entry);
    setStatus("ok", "发送成功");
    return { ...entry, briefing };
  } catch (error) {
    const entry = { ok: false, reason, message: error.message, time: new Date().toISOString().slice(0, 19) };
    appendLog(entry);
    setStatus("error", error.message);
    return entry;
  }
}

function zonedParts(timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function schedulerLoop() {
  const config = loadConfig();
  const schedule = config.schedule;
  if (schedule.enabled) {
    const now = zonedParts(schedule.timezone);
    const today = `${now.year}-${now.month}-${now.day}`;
    const currentTime = `${now.hour}:${now.minute}`;
    if (currentTime === schedule.time && lastRunDate !== today) {
      lastRunDate = today;
      runDelivery("schedule");
    }
  }
}

function sendJson(response, payload, status = 200) {
  const data = Buffer.from(JSON.stringify(payload), "utf8");
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": data.length,
  });
  response.end(data);
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
}

function serveStatic(requestPath, response) {
  if (requestPath === "/config.json") {
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    fs.createReadStream(CONFIG_PATH).pipe(response);
    return;
  }
  const cleanPath = requestPath === "/" ? "/index.html" : requestPath;
  const target = path.resolve(WEB_DIR, `.${decodeURIComponent(cleanPath)}`);
  if (!target.startsWith(WEB_DIR) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  const types = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
  };
  response.writeHead(200, { "Content-Type": types[path.extname(target)] || "text/plain; charset=utf-8" });
  fs.createReadStream(target).pipe(response);
}

async function handleRequest(request, response) {
  try {
    const url = new URL(request.url, "http://127.0.0.1");
    if (request.method === "GET" && url.pathname === "/api/config") {
      sendJson(response, { config: loadConfig(), newsFeeds: NEWS_FEEDS });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/status") {
      sendJson(response, { status: lastStatus, logs: loadJson(LOG_PATH, []).slice(0, 20) });
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/preview") {
      const briefing = await buildBriefing(loadConfig());
      const previewUrl = `data:text/html;base64,${Buffer.from(briefing.html, "utf8").toString("base64")}`;
      sendJson(response, { ok: true, briefing, previewUrl });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/config") {
      const body = await readBody(request);
      const config = deepMerge(DEFAULT_CONFIG, body.config || {});
      saveConfig(config);
      sendJson(response, { ok: true, config });
      return;
    }
    if (request.method === "POST" && url.pathname === "/api/send-now") {
      const timeout = new Promise((resolve) =>
        setTimeout(() => resolve({ ok: true, message: "发送任务已开始，请在状态区查看结果" }), 60000),
      );
      sendJson(response, await Promise.race([runDelivery("manual"), timeout]));
      return;
    }
    serveStatic(url.pathname, response);
  } catch (error) {
    sendJson(response, { ok: false, message: error.message }, 500);
  }
}

if (!fs.existsSync(CONFIG_PATH)) saveConfig(DEFAULT_CONFIG);
setStatus("idle", "服务已启动");
setInterval(schedulerLoop, 30000);

const port = Number(process.env.PORT || 8765);
http.createServer(handleRequest).listen(port, "127.0.0.1", () => {
  console.log(`Daily Mailer running at http://127.0.0.1:${port}`);
});
