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
  let text = String(value ?? "").replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1");
  for (let i = 0; i < 2; i += 1) {
    text = text
      .replace(/&nbsp;|&#160;|\u00a0/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
  }
  return text;
}

function stripTags(value) {
  return decodeXml(String(value ?? "").replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function cleanTitle(title, source) {
  const clean = stripTags(title);
  if (!source) return clean;
  const escapedSource = source.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return clean.replace(new RegExp(`\\s*(?:-|—|–|\\||　| )+\\s*${escapedSource}$`), "").trim();
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
  if (!place) throw new Error(`找不到城市：${city}。建议在 config.json 里使用英文城市名，例如 Beijing、Shanghai、Shenzhen。`);
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
      const items = itemXml
        .map((item) => {
          const source = stripTags(tagValue(item, "source"));
          const description = stripTags(tagValue(item, "description"));
          return {
            title: cleanTitle(tagValue(item, "title"), source),
            link: tagValue(item, "link"),
            source,
            description,
            pubDate: tagValue(item, "pubDate"),
          };
        })
        .filter((item) => item.title);
      groups.push({ category, label: feed.label, items, insight: buildGroupInsight(feed.label, items) });
    } catch (error) {
      groups.push({ category, label: feed.label, error: error.message, items: [], insight: "该栏目暂时获取失败。" });
    }
  }
  return groups;
}

function buildGroupInsight(label, items) {
  if (!items.length) return `${label}栏目暂时没有抓取到可用新闻。`;
  const lead = items[0]?.title || "";
  const second = items[1]?.title || "";
  if (items.length === 1) return `${label}栏目今日重点关注：“${lead}”。`;
  return `${label}栏目今日收录 ${items.length} 条要闻，重点包括“${lead}”与“${second}”。`;
}

function buildDigest(news) {
  const available = news.filter((group) => group.items.length);
  const total = available.reduce((sum, group) => sum + group.items.length, 0);
  const focus = available.flatMap((group) => group.items.slice(0, 1).map((item) => ({ ...item, label: group.label }))).slice(0, 4);
  const categoryNames = available.map((group) => group.label).join("、") || "暂无";
  return {
    total,
    focus,
    headline: total ? `今日共整理 ${total} 条新闻，覆盖 ${categoryNames}。` : "今日暂时没有抓取到新闻。",
    note: "本简报基于公开 RSS 标题、来源与摘要自动整理，未调用付费 AI。",
  };
}

function renderEmailHtml(config, weather, news, generatedAt) {
  const digest = buildDigest(news);
  const subject = escapeHtml(config.email.subject || "今日天气与新闻简报");
  const parts = [
    "<!doctype html><html><head><meta charset='utf-8'>",
    "<style>",
    "body{margin:0;padding:28px;background:#f5f7fb;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',Arial,sans-serif}",
    ".wrap{max-width:820px;margin:auto}",
    ".hero{background:linear-gradient(135deg,#101827,#26354f);color:#fff;border-radius:28px;padding:34px;box-shadow:0 28px 70px rgba(30,43,70,.24)}",
    ".kicker{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#a9c7ff;margin:0 0 10px}",
    "h1{font-size:34px;line-height:1.1;margin:0 0 14px}.hero p{margin:0;color:#d7e2ff;line-height:1.7}",
    ".panel{background:#fff;border:1px solid #e4e9f2;border-radius:24px;padding:24px;margin-top:18px;box-shadow:0 18px 44px rgba(31,45,72,.08)}",
    ".weather{display:grid;grid-template-columns:1.2fr repeat(3,1fr);gap:12px}.metric{background:#f4f7fb;border-radius:18px;padding:14px}.metric b{font-size:22px;display:block}.muted{color:#64748b;font-size:13px}",
    ".focus{display:grid;grid-template-columns:repeat(2,1fr);gap:12px}.focus a{display:block;color:#111827;text-decoration:none;font-weight:700;line-height:1.4}.pill{display:inline-block;margin-bottom:8px;padding:5px 10px;border-radius:999px;background:#edf4ff;color:#176bff;font-size:12px;font-weight:700}",
    "h2{font-size:20px;margin:0 0 14px}.insight{margin:0 0 14px;color:#475569;line-height:1.7}",
    ".item{padding:15px 0;border-top:1px solid #edf1f7}.item a{color:#176bff;text-decoration:none;font-weight:700}.item p{margin:6px 0 0;color:#64748b;line-height:1.55}.source{font-size:12px;color:#94a3b8;margin-top:6px}",
    "@media(max-width:640px){body{padding:14px}.weather,.focus{grid-template-columns:1fr}.hero{padding:24px;border-radius:22px}h1{font-size:28px}}",
    "</style></head><body><div class='wrap'>",
    `<section class='hero'><p class='kicker'>Daily Briefing</p><h1>${subject}</h1><p>${escapeHtml(digest.headline)}<br>${escapeHtml(digest.note)}</p><p class='muted' style='color:#afbdd5;margin-top:14px'>${escapeHtml(generatedAt)}</p></section>`,
  ];

  if (weather) {
    parts.push(
      "<section class='panel'><h2>今日天气</h2><div class='weather'>",
      `<div class='metric'><span class='muted'>${escapeHtml(weather.city)}，${escapeHtml(weather.country)}</span><b>${escapeHtml(weather.summary)}</b></div>`,
      `<div class='metric'><span class='muted'>温度</span><b>${weather.tempMin} - ${weather.tempMax}°C</b></div>`,
      `<div class='metric'><span class='muted'>降水</span><b>${weather.precipitation}%</b></div>`,
      `<div class='metric'><span class='muted'>风速</span><b>${weather.wind} km/h</b></div>`,
      "</div></section>",
    );
  }

  if (digest.focus.length) {
    parts.push("<section class='panel'><h2>今日重点</h2><div class='focus'>");
    for (const item of digest.focus) {
      parts.push(
        "<div class='metric'>",
        `<span class='pill'>${escapeHtml(item.label)}</span>`,
        `<a href='${escapeHtml(item.link)}'>${escapeHtml(item.title)}</a>`,
        `<div class='source'>${escapeHtml(item.source || "Google News")}</div>`,
        "</div>",
      );
    }
    parts.push("</div></section>");
  }

  for (const group of news) {
    parts.push(`<section class='panel'><h2>${escapeHtml(group.label)}</h2>`);
    if (group.error) {
      parts.push(`<p class='insight'>获取失败：${escapeHtml(group.error)}</p></section>`);
      continue;
    }
    parts.push(`<p class='insight'>${escapeHtml(group.insight)}</p>`);
    for (const item of group.items) {
      parts.push(
        "<article class='item'>",
        `<a href='${escapeHtml(item.link)}'>${escapeHtml(item.title)}</a>`,
        item.description ? `<p>${escapeHtml(item.description).slice(0, 180)}</p>` : "",
        `<div class='source'>${escapeHtml(item.source || "Google News")}</div>`,
        "</article>",
      );
    }
    parts.push("</section>");
  }

  parts.push("<p class='muted' style='text-align:center;margin:22px 0'>由 Daily Mailer / GitHub Actions 自动发送</p></div></body></html>");
  return parts.join("");
}

function renderEmailText(config, weather, news, generatedAt) {
  const digest = buildDigest(news);
  const lines = [config.email.subject || "今日天气与新闻简报", generatedAt, "", digest.headline, digest.note, ""];
  if (weather) {
    lines.push("今日天气", `${weather.city}，${weather.country}：${weather.summary}，${weather.tempMin} - ${weather.tempMax}°C，降水概率 ${weather.precipitation}%。`, "");
  }
  if (digest.focus.length) {
    lines.push("今日重点");
    digest.focus.forEach((item, index) => lines.push(`${index + 1}. [${item.label}] ${item.title} ${item.link}`));
    lines.push("");
  }
  for (const group of news) {
    lines.push(group.label, group.insight);
    if (group.error) lines.push(`获取失败：${group.error}`);
    group.items.forEach((item, index) => lines.push(`${index + 1}. ${item.title} - ${item.source || "Google News"}\n${item.link}`));
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
    `Subject: ${encodeHeader(config.email.subject || "今日天气与新闻简报")}`,
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
