const fs = require("fs");
const net = require("net");
const path = require("path");
const tls = require("tls");
const { Buffer } = require("buffer");

const ROOT = path.resolve(__dirname, "..");
const CONFIG_PATH = path.join(ROOT, "config.json");

const NEWS_FEEDS = {
  top: { label: "热点", url: "https://news.google.com/rss?hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
  world: { label: "国际", url: "https://news.google.com/rss/headlines/section/topic/WORLD?hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
  business: { label: "财经", url: "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
  technology: { label: "科技", url: "https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
  sports: { label: "体育", url: "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
  entertainment: { label: "娱乐", url: "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
  health: { label: "健康", url: "https://news.google.com/rss/headlines/section/topic/HEALTH?hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
  science: { label: "科学", url: "https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=zh-CN&gl=CN&ceid=CN:zh-Hans" },
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

function requiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing GitHub Secret: ${name}`);
  return value;
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
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { "User-Agent": "DailyMailer/1.0" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
}

async function geocode(config) {
  const city = config.content.city;
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=zh&format=json`;
  const data = await fetchJson(url);
  const place = data.results?.[0];
  if (!place) throw new Error(`找不到城市：${city}`);
  return place;
}

async function fetchWeather(config) {
  const place = await geocode(config);
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
    city: place.name,
    country: place.country,
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
      groups.push({
        category,
        label: feed.label,
        items: itemXml
          .map((item) => ({
            title: tagValue(item, "title"),
            link: tagValue(item, "link"),
            source: tagValue(item, "source"),
            pubDate: tagValue(item, "pubDate"),
          }))
          .filter((item) => item.title),
      });
    } catch (error) {
      groups.push({ category, label: feed.label, error: error.message, items: [] });
    }
  }
  return groups;
}

function renderEmailHtml(config, weather, news, generatedAt) {
  const subject = escapeHtml(config.email.subject || "今日简报");
  const parts = [
    "<!doctype html><html><head><meta charset='utf-8'>",
    "<style>body{font-family:Arial,'Microsoft YaHei',sans-serif;background:#f4f7fb;margin:0;padding:24px;color:#101a2a}",
    ".wrap{max-width:760px;margin:auto;background:#fff;border:1px solid #dde7f2;border-radius:18px;padding:28px}",
    "h1{font-size:28px;margin:0 0 8px}h2{font-size:18px;margin:28px 0 12px}.meta{color:#68778c;font-size:13px}",
    ".weather{background:#eef8f3;border-left:4px solid #21a870;border-radius:12px;padding:16px}",
    "a{color:#176bff;text-decoration:none}li{margin:10px 0}.tag{color:#68778c;font-size:12px}</style></head><body><div class='wrap'>",
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
  parts.push("<p class='meta'>由 Daily Mailer / GitHub Actions 自动发送。</p></div></body></html>");
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

function buildMimeMessage(config, briefing, mail) {
  const boundary = `boundary_${Date.now().toString(36)}`;
  return [
    `From: ${encodeHeader(config.email.fromName || "Daily Briefing")} <${mail.from}>`,
    `To: ${mail.to.join(", ")}`,
    `Subject: ${encodeHeader(config.email.subject || "今日简报")}`,
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
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error("SMTP 响应超时");
  }

  async command(line, codes = [250]) {
    this.socket.write(`${line}\r\n`);
    await this.expect(codes);
  }

  async upgradeToTls() {
    await this.command("EHLO localhost");
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

  async sendMail({ username, password, from, recipients, message }) {
    await this.command("EHLO localhost");
    if (this.security === "starttls") {
      await this.upgradeToTls();
      await this.command("EHLO localhost");
    }
    await this.command("AUTH LOGIN", [334]);
    await this.command(Buffer.from(username).toString("base64"), [334]);
    await this.command(Buffer.from(password).toString("base64"), [235]);
    await this.command(`MAIL FROM:<${from}>`);
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

async function main() {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  if (config.schedule && config.schedule.enabled === false) {
    console.log("Schedule is disabled in config.json. Skip sending.");
    return;
  }

  const mail = {
    host: requiredEnv("SMTP_HOST"),
    port: Number(process.env.SMTP_PORT || "465"),
    security: process.env.SMTP_SECURITY || "ssl",
    username: requiredEnv("SMTP_USER"),
    password: requiredEnv("SMTP_PASS"),
    from: requiredEnv("MAIL_FROM"),
    to: normalizeRecipients(requiredEnv("MAIL_TO")),
  };

  const weather = config.content.includeWeather ? await fetchWeather(config) : null;
  const news = await fetchNews(config);
  const generatedAt = new Date().toLocaleString("zh-CN", { hour12: false, timeZone: config.schedule.timezone || "Asia/Shanghai" });
  const briefing = {
    html: renderEmailHtml(config, weather, news, generatedAt),
    text: renderEmailText(config, weather, news, generatedAt),
  };

  const client = new SmtpClient({ host: mail.host, port: mail.port, security: mail.security });
  try {
    await client.connect();
    await client.sendMail({
      username: mail.username,
      password: mail.password,
      from: mail.from,
      recipients: mail.to,
      message: buildMimeMessage(config, briefing, mail),
    });
  } finally {
    client.close();
  }
console.log("Briefing sent successfully.");

}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
