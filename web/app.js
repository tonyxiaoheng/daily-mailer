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

const DEFAULT_CONFIG = {
  schedule: { enabled: true, time: "08:00", timezone: "Asia/Shanghai" },
  email: { fromName: "Daily Briefing", subject: "今日天气与新闻简报" },
  content: {
    city: "Shanghai",
    country: "China",
    includeWeather: true,
    newsCategories: ["top", "technology"],
    maxNewsPerCategory: 5,
    language: "zh-CN",
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
  80: "阵雨",
  95: "雷暴",
};

const fields = {
  scheduleEnabled: document.querySelector("#scheduleEnabled"),
  sendTime: document.querySelector("#sendTime"),
  timezone: document.querySelector("#timezone"),
  fromName: document.querySelector("#fromName"),
  subject: document.querySelector("#subject"),
  city: document.querySelector("#city"),
  country: document.querySelector("#country"),
  maxNews: document.querySelector("#maxNews"),
  includeWeather: document.querySelector("#includeWeather"),
};

const newsChips = document.querySelector("#newsChips");
const previewFrame = document.querySelector("#previewFrame");
const previewMeta = document.querySelector("#previewMeta");
const saveHint = document.querySelector("#saveHint");
const nextRun = document.querySelector("#nextRun");
const scheduleHint = document.querySelector("#scheduleHint");

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

async function loadConfig() {
  try {
    const response = await fetch("./config.json", { cache: "no-store" });
    if (!response.ok) throw new Error("no config");
    return deepMerge(DEFAULT_CONFIG, await response.json());
  } catch {
    return DEFAULT_CONFIG;
  }
}

function fillForm(config) {
  fields.scheduleEnabled.checked = Boolean(config.schedule.enabled);
  fields.sendTime.value = config.schedule.time || "08:00";
  fields.timezone.value = config.schedule.timezone || "Asia/Shanghai";
  fields.fromName.value = config.email.fromName || "Daily Briefing";
  fields.subject.value = config.email.subject || "今日天气与新闻简报";
  fields.city.value = config.content.city || "";
  fields.country.value = config.content.country || "";
  fields.maxNews.value = config.content.maxNewsPerCategory || 5;
  fields.includeWeather.checked = Boolean(config.content.includeWeather);

  const selected = new Set(config.content.newsCategories || []);
  newsChips.innerHTML = Object.entries(NEWS_FEEDS)
    .map(([key, feed]) => `<label class="chip"><input type="checkbox" value="${key}" ${selected.has(key) ? "checked" : ""}>${feed.label}</label>`)
    .join("");
  updateScheduleSummary();
}

function collectConfig() {
  const newsCategories = [...newsChips.querySelectorAll("input:checked")].map((input) => input.value);
  return {
    schedule: {
      enabled: fields.scheduleEnabled.checked,
      time: fields.sendTime.value || "08:00",
      timezone: fields.timezone.value.trim() || "Asia/Shanghai",
    },
    email: {
      fromName: fields.fromName.value.trim() || "Daily Briefing",
      subject: fields.subject.value.trim() || "今日天气与新闻简报",
    },
    content: {
      city: fields.city.value.trim() || "Shanghai",
      country: fields.country.value.trim() || "China",
      includeWeather: fields.includeWeather.checked,
      newsCategories,
      maxNewsPerCategory: Number(fields.maxNews.value || 5),
      language: "zh-CN",
    },
  };
}

function updateScheduleSummary() {
  const config = collectConfig();
  nextRun.textContent = config.schedule.enabled ? config.schedule.time : "已暂停";
  scheduleHint.textContent = config.schedule.timezone;
}

function downloadConfig() {
  const blob = new Blob([JSON.stringify(collectConfig(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "config.json";
  link.click();
  URL.revokeObjectURL(url);
  saveHint.textContent = "已生成 config.json";
}

async function copyConfig() {
  await navigator.clipboard.writeText(JSON.stringify(collectConfig(), null, 2));
  saveHint.textContent = "配置已复制";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchWeather(config) {
  const placeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(config.content.city)}&count=1&language=zh&format=json`;
  const placeData = await fetch(placeUrl).then((response) => response.json());
  const place = placeData.results?.[0];
  if (!place) throw new Error(`找不到城市：${config.content.city}`);
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    current: "temperature_2m,relative_humidity_2m,wind_speed_10m",
    timezone: config.schedule.timezone || "auto",
    forecast_days: "1",
  });
  const weather = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`).then((response) => response.json());
  const code = Number(weather.daily.weather_code[0]);
  return {
    city: place.name,
    country: place.country,
    summary: WEATHER_CODES[code] || `天气代码 ${code}`,
    tempMax: weather.daily.temperature_2m_max[0],
    tempMin: weather.daily.temperature_2m_min[0],
    precipitation: weather.daily.precipitation_probability_max[0],
    currentTemp: weather.current?.temperature_2m ?? "-",
    wind: weather.current?.wind_speed_10m ?? "-",
  };
}

function sampleNews(config) {
  return config.content.newsCategories.map((key) => {
    const label = NEWS_FEEDS[key]?.label || key;
    const items = Array.from({ length: Math.min(config.content.maxNewsPerCategory, 4) }, (_, index) => ({
      title: `${label}焦点新闻 ${index + 1}`,
      source: "实时发送时会替换为真实来源",
      link: "#",
    }));
    return {
      label,
      insight: `${label}栏目会在邮件中自动整理重点标题、来源和对应链接。`,
      items,
    };
  });
}

async function generatePreview() {
  const config = collectConfig();
  previewMeta.textContent = "正在生成预览...";
  let weatherHtml = "";
  try {
    if (config.content.includeWeather) {
      const weather = await fetchWeather(config);
      weatherHtml = `
        <section class="mail-weather">
          <div><span>${escapeHtml(weather.city)}，${escapeHtml(weather.country)}</span><strong>${escapeHtml(weather.summary)}</strong></div>
          <div><span>温度</span><strong>${weather.tempMin} - ${weather.tempMax}°C</strong></div>
          <div><span>降水</span><strong>${weather.precipitation}%</strong></div>
          <div><span>风速</span><strong>${weather.wind} km/h</strong></div>
        </section>`;
    }
  } catch (error) {
    weatherHtml = `<section class="mail-weather warning">天气预览失败：${escapeHtml(error.message)}</section>`;
  }

  const groups = sampleNews(config);
  const focus = groups.flatMap((group) => group.items.slice(0, 1).map((item) => ({ ...item, label: group.label }))).slice(0, 4);
  const focusHtml = focus
    .map((item) => `<article class="focus-card"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.source)}</small></article>`)
    .join("");
  const newsHtml = groups
    .map(
      (group) => `
        <section class="mail-section">
          <h4>${escapeHtml(group.label)}</h4>
          <p>${escapeHtml(group.insight)}</p>
          ${group.items.map((item) => `<article><a>${escapeHtml(item.title)}</a><span>${escapeHtml(item.source)}</span></article>`).join("")}
        </section>`,
    )
    .join("");

  previewFrame.innerHTML = `
    <article class="mail-card">
      <p class="mail-date">Daily Briefing · ${new Date().toLocaleString("zh-CN", { hour12: false })}</p>
      <h3>${escapeHtml(config.email.subject)}</h3>
      <p class="mail-lede">今日将按你选择的栏目生成增强版简报：先给重点，再按类型附上来源和链接。</p>
      ${weatherHtml}
      <section class="mail-focus">${focusHtml}</section>
      ${newsHtml}
    </article>`;
  previewMeta.textContent = "增强版预览已生成";
}

document.querySelector("#downloadBtn").addEventListener("click", downloadConfig);
document.querySelector("#copyBtn").addEventListener("click", () => copyConfig().catch((error) => (saveHint.textContent = error.message)));
document.querySelector("#previewBtn").addEventListener("click", () => generatePreview().catch((error) => (previewMeta.textContent = error.message)));
document.querySelector("#settingsForm").addEventListener("input", updateScheduleSummary);
document.querySelector("#settingsForm").addEventListener("change", () => generatePreview());

loadConfig().then((config) => {
  fillForm(config);
  generatePreview();
});
