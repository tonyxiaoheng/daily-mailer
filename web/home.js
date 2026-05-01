const DEFAULT_SITE = {
  contactName: "Daily Mailer Owner",
  contactEmail: "your-email@example.com",
  contactWechat: "your-wechat-id",
  contactNote: "欢迎联系我了解部署、配置和定制方式。",
};

const I18N = {
  zh: {
    navSystem: "系统",
    navWorkflow: "流程",
    navSecurity: "安全",
    navContact: "联系",
    navConfig: "配置",
    productName: "每日邮报系统",
    heroLine1: "快人一步",
    heroLine2: "先人一步",
    heroLede: "在信息抵达你之前，先把它整理成秩序。Daily Mailer 将天气、要闻与来源链接汇成一封清晨简报，让一天从判断力开始，而不是从碎片里醒来。",
    heroPrimary: "了解系统",
    heroSecondary: "查看安全设计",
    deviceTitle: "今日天气与新闻简报",
    deviceWeather: "晴朗",
    deviceNews: "条重点新闻",
    deviceFocus: "今日重点",
    deviceDesc: "先呈现最值得看的信号，再附上每条新闻的来源与链接。",
    systemTitle: "先理解世界，再开始一天。",
    systemDesc: "它不试图占据你的注意力，只负责在合适的时间，把有用信息放到你已经习惯打开的邮箱里。",
    featureScheduleTitle: "定时送达",
    featureScheduleDesc: "由 GitHub Actions 在云端运行，不依赖你的电脑开机。",
    featureBriefingTitle: "增强简报",
    featureBriefingDesc: "先给今日重点，再按类型列出新闻、来源和链接。",
    featurePagesTitle: "网页配置",
    featurePagesDesc: "访客看到介绍页，配置入口独立放在二级页面。",
    featureFreeTitle: "免费运行",
    featureFreeDesc: "基于 GitHub Pages、Actions、Open-Meteo 与 RSS。",
    learnMore: "了解详情",
    workflowTitle1: "从抓取到投递，",
    workflowTitle2: "每一步都清晰。",
    workflowDesc: "系统把复杂动作拆成四个稳定环节：获取、整理、生成、发送。访客能看懂原理，你也能放心维护。",
    step1Title: "读取公开配置",
    step1Desc: "城市、新闻类型、邮件标题来自 config.json。",
    step2Title: "抓取天气与新闻",
    step2Desc: "天气来自 Open-Meteo，新闻来自 Google News RSS。",
    step3Title: "生成增强日报",
    step3Desc: "自动清洗标题、整理来源，并输出邮件版式。",
    step4Title: "通过 Gmail 投递",
    step4Desc: "SMTP 密钥来自 GitHub Secrets，不进入公开网页。",
    securityTitle1: "公开展示",
    securityTitle2: "私密运行",
    securityDesc: "Daily Mailer 将“可以公开的信息”和“必须保密的密钥”分离。访客可以了解系统，配置页可以生成公开配置，而邮箱授权码始终留在 GitHub Secrets。",
    securityCard1Title: "邮箱密钥不入库",
    securityCard1Desc: "SMTP_PASS、Gmail 应用专用密码、收件邮箱都由 GitHub Secrets 管理。",
    securityCard2Title: "配置只含公开信息",
    securityCard2Desc: "config.json 只保存城市、栏目、标题和显示时间，适合公开仓库。",
    securityCard3Title: "配置入口独立",
    securityCard3Desc: "二级配置页带静态登录，用来降低误触和普通访客访问概率。",
    securityCard4Title: "自动流程可追踪",
    securityCard4Desc: "每次发送都能在 GitHub Actions 查看运行状态，便于排查。",
    contactTitle: "留下你的信息。",
    contactDesc: "访客可以提交姓名、邮箱和留言。纯静态网页不会真正发送表单，但会生成一份可复制的访客信息，方便后续接入表单服务。",
    contactButton: "提交访客信息",
    footerText: "Daily Mailer · 为更早的信号和更安静的清晨而建。",
    languageSettings: "语言设置",
    accessibilitySettings: "无障碍设置",
    close: "关闭",
    visitorTitle: "提交访客信息",
    visitorName: "姓名",
    visitorEmail: "邮箱",
    visitorMessage: "留言",
    visitorSubmit: "生成访客信息",
  },
  en: {
    navSystem: "System",
    navWorkflow: "Workflow",
    navSecurity: "Security",
    navContact: "Contact",
    navConfig: "Config",
    productName: "Daily Briefing System",
    heroLine1: "One step faster",
    heroLine2: "One step ahead",
    heroLede: "Before information reaches you, Daily Mailer turns it into order. Weather, headlines, sources, and links arrive as one calm morning briefing.",
    heroPrimary: "Explore system",
    heroSecondary: "View security",
    deviceTitle: "Weather and News Briefing",
    deviceWeather: "Clear",
    deviceNews: "key stories",
    deviceFocus: "Today’s focus",
    deviceDesc: "Important signals first, then sources and links for every story.",
    systemTitle: "Understand the world before the day begins.",
    systemDesc: "It does not compete for attention. It quietly delivers useful context to the inbox you already open.",
    featureScheduleTitle: "Scheduled delivery",
    featureScheduleDesc: "Runs in GitHub Actions, without keeping your own computer on.",
    featureBriefingTitle: "Enhanced briefing",
    featureBriefingDesc: "Focus first, then categorized stories with sources and links.",
    featurePagesTitle: "Web configuration",
    featurePagesDesc: "Visitors see the product page; the config studio lives separately.",
    featureFreeTitle: "Free to run",
    featureFreeDesc: "Built on GitHub Pages, Actions, Open-Meteo, and RSS.",
    learnMore: "Learn more",
    workflowTitle1: "From fetching to delivery,",
    workflowTitle2: "every step is clear.",
    workflowDesc: "The system is split into stable stages: fetch, organize, generate, and send.",
    step1Title: "Read public config",
    step1Desc: "City, categories, and subject come from config.json.",
    step2Title: "Fetch weather and news",
    step2Desc: "Weather from Open-Meteo, news from Google News RSS.",
    step3Title: "Generate the briefing",
    step3Desc: "Clean titles, organize sources, and render the email.",
    step4Title: "Deliver with Gmail",
    step4Desc: "SMTP secrets stay in GitHub Secrets, not public pages.",
    securityTitle1: "Public display",
    securityTitle2: "Private operation",
    securityDesc: "Daily Mailer separates public information from private secrets. Visitors can understand the system; credentials remain in GitHub Secrets.",
    securityCard1Title: "Mail secrets stay private",
    securityCard1Desc: "SMTP_PASS, Gmail app passwords, and recipients are managed by GitHub Secrets.",
    securityCard2Title: "Public config only",
    securityCard2Desc: "config.json stores city, categories, subject, and display time only.",
    securityCard3Title: "Separate config entrance",
    securityCard3Desc: "A secondary page with static login reduces accidental visitor access.",
    securityCard4Title: "Traceable automation",
    securityCard4Desc: "Every send can be inspected in GitHub Actions.",
    contactTitle: "Leave your information.",
    contactDesc: "Visitors can enter a name, email, and message. This static page generates copyable information for later form integration.",
    contactButton: "Submit visitor info",
    footerText: "Daily Mailer · Built for early signals and quiet mornings.",
    languageSettings: "Language",
    accessibilitySettings: "Accessibility",
    close: "Close",
    visitorTitle: "Submit visitor information",
    visitorName: "Name",
    visitorEmail: "Email",
    visitorMessage: "Message",
    visitorSubmit: "Generate visitor info",
  },
  zhHant: {
    navSystem: "系統",
    navWorkflow: "流程",
    navSecurity: "安全",
    navContact: "聯絡",
    navConfig: "配置",
    productName: "每日郵報系統",
    heroLine1: "快人一步",
    heroLine2: "先人一步",
    heroLede: "在資訊抵達你之前，先把它整理成秩序。Daily Mailer 將天氣、要聞與來源連結彙成一封清晨簡報，讓一天從判斷力開始。",
    heroPrimary: "了解系統",
    heroSecondary: "查看安全設計",
    deviceTitle: "今日天氣與新聞簡報",
    deviceWeather: "晴朗",
    deviceNews: "條重點新聞",
    deviceFocus: "今日重點",
    deviceDesc: "先呈現最值得看的訊號，再附上每條新聞的來源與連結。",
    systemTitle: "先理解世界，再開始一天。",
    systemDesc: "它不試圖佔據你的注意力，只負責在合適的時間，把有用資訊放到你已經習慣打開的信箱裡。",
    featureScheduleTitle: "定時送達",
    featureScheduleDesc: "由 GitHub Actions 在雲端執行，不依賴你的電腦開機。",
    featureBriefingTitle: "增強簡報",
    featureBriefingDesc: "先給今日重點，再按類型列出新聞、來源和連結。",
    featurePagesTitle: "網頁配置",
    featurePagesDesc: "訪客看到介紹頁，配置入口獨立放在二級頁面。",
    featureFreeTitle: "免費運行",
    featureFreeDesc: "基於 GitHub Pages、Actions、Open-Meteo 與 RSS。",
    learnMore: "了解詳情",
    workflowTitle1: "從抓取到投遞，",
    workflowTitle2: "每一步都清晰。",
    workflowDesc: "系統把複雜動作拆成四個穩定環節：獲取、整理、生成、發送。",
    step1Title: "讀取公開配置",
    step1Desc: "城市、新聞類型、郵件標題來自 config.json。",
    step2Title: "抓取天氣與新聞",
    step2Desc: "天氣來自 Open-Meteo，新聞來自 Google News RSS。",
    step3Title: "生成增強日報",
    step3Desc: "自動清洗標題、整理來源，並輸出郵件版式。",
    step4Title: "透過 Gmail 投遞",
    step4Desc: "SMTP 密鑰來自 GitHub Secrets，不進入公開網頁。",
    securityTitle1: "公開展示",
    securityTitle2: "私密運行",
    securityDesc: "Daily Mailer 將可以公開的資訊和必須保密的密鑰分離。郵箱授權碼始終留在 GitHub Secrets。",
    securityCard1Title: "郵箱密鑰不入庫",
    securityCard1Desc: "SMTP_PASS、Gmail 應用程式密碼、收件信箱都由 GitHub Secrets 管理。",
    securityCard2Title: "配置只含公開資訊",
    securityCard2Desc: "config.json 只保存城市、欄目、標題和顯示時間。",
    securityCard3Title: "配置入口獨立",
    securityCard3Desc: "二級配置頁帶靜態登入，用來降低誤觸和普通訪客訪問概率。",
    securityCard4Title: "自動流程可追蹤",
    securityCard4Desc: "每次發送都能在 GitHub Actions 查看運行狀態。",
    contactTitle: "留下你的資訊。",
    contactDesc: "訪客可以提交姓名、信箱和留言。純靜態網頁會生成一份可複製的訪客資訊。",
    contactButton: "提交訪客資訊",
    footerText: "Daily Mailer · 為更早的訊號和更安靜的清晨而建。",
    languageSettings: "語言設定",
    accessibilitySettings: "無障礙設定",
    close: "關閉",
    visitorTitle: "提交訪客資訊",
    visitorName: "姓名",
    visitorEmail: "信箱",
    visitorMessage: "留言",
    visitorSubmit: "生成訪客資訊",
  },
};

const DETAIL_COPY = {
  zh: {
    schedule: ["定时送达如何运行", "系统使用 GitHub Actions 的 schedule 触发器。到达设定时间后，云端自动执行脚本，读取 config.json，生成简报并通过 SMTP 发送邮件。你的电脑不需要开机。"],
    briefing: ["增强简报如何整理", "脚本会按新闻类型抓取 RSS，清洗标题里的 HTML 实体，提取来源与链接。邮件先展示今日重点，再按栏目列出新闻。"],
    pages: ["网页配置如何分层", "一级页面面向访客，介绍系统价值与运行原理。二级配置页面向管理员，登录后可生成新的 config.json。"],
    free: ["免费运行的边界", "当前方案不调用付费 AI，依赖 GitHub Pages、GitHub Actions、Open-Meteo 和公开 RSS。GitHub Actions 的定时可能有少量延迟。"],
  },
  en: {
    schedule: ["How scheduling works", "GitHub Actions triggers the script on schedule, reads config.json, renders the briefing, and sends it through SMTP. Your computer can stay off."],
    briefing: ["How the briefing is organized", "The script fetches RSS by category, cleans HTML entities, extracts sources and links, then renders a focus-first email."],
    pages: ["How pages are separated", "The main page explains the product to visitors. The secondary config page is for the owner to generate config.json."],
    free: ["The free-running boundary", "No paid AI is required. It relies on GitHub Pages, GitHub Actions, Open-Meteo, and public RSS feeds."],
  },
  zhHant: {
    schedule: ["定時送達如何運行", "系統使用 GitHub Actions 的 schedule 觸發器，雲端自動讀取 config.json，生成簡報並透過 SMTP 發送。"],
    briefing: ["增強簡報如何整理", "腳本按新聞類型抓取 RSS，清洗標題中的 HTML 實體，提取來源與連結，並生成郵件。"],
    pages: ["網頁配置如何分層", "一級頁面面向訪客，二級配置頁面向管理者，用於生成新的 config.json。"],
    free: ["免費運行的邊界", "目前不調用付費 AI，依賴 GitHub Pages、GitHub Actions、Open-Meteo 和公開 RSS。"],
  },
};

let currentLang = localStorage.getItem("dailyMailerLang") || "zh";

async function loadSiteSettings() {
  try {
    const response = await fetch("./config.json", { cache: "no-store" });
    if (!response.ok) throw new Error("no config");
    const config = await response.json();
    return { ...DEFAULT_SITE, ...(config.site || {}) };
  } catch {
    return DEFAULT_SITE;
  }
}

function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("dailyMailerLang", lang);
  document.documentElement.lang = lang === "zhHant" ? "zh-Hant" : lang === "en" ? "en" : "zh-CN";
  const pack = I18N[lang] || I18N.zh;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = pack[node.dataset.i18n] || node.textContent;
  });
}

function openDialog(dialog) {
  dialog.classList.remove("closing");
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  dialog.classList.add("closing");
  setTimeout(() => {
    dialog.close?.();
    dialog.removeAttribute("open");
    dialog.classList.remove("closing");
  }, 220);
}

document.querySelectorAll("[data-detail]").forEach((card) => {
  card.addEventListener("click", () => {
    const detail = DETAIL_COPY[currentLang]?.[card.dataset.detail] || DETAIL_COPY.zh[card.dataset.detail];
    document.querySelector("#detailTitle").textContent = detail[0];
    document.querySelector("#detailBody").textContent = detail[1];
    openDialog(document.querySelector("#detailDialog"));
  });
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => closeDialog(button.closest("dialog")));
});

async function showContact() {
  const site = await loadSiteSettings();
  document.querySelector("#contactContent").innerHTML = `
    <div><strong>站点联系人</strong><span>${site.contactName} · ${site.contactEmail} · ${site.contactWechat}</span></div>
  `;
  openDialog(document.querySelector("#contactDialog"));
}

document.querySelector("#showContactBtn").addEventListener("click", showContact);
document.querySelector("#footerContactBtn").addEventListener("click", showContact);

document.querySelector("#languageBtn").addEventListener("click", () => {
  document.querySelector("#utilityKicker").textContent = "Language";
  document.querySelector("#utilityTitle").textContent = I18N[currentLang].languageSettings;
  document.querySelector("#utilityBody").innerHTML = `
    <div class="language-options">
      <button type="button" data-lang="zh">简体中文</button>
      <button type="button" data-lang="zhHant">繁體中文</button>
      <button type="button" data-lang="en">English</button>
    </div>
  `;
  openDialog(document.querySelector("#utilityDialog"));
});

const ACCESSIBILITY_OPTIONS = [
  ["a11y-large-text", "大字体", "提升页面整体字号，方便低视力用户阅读。"],
  ["a11y-high-contrast", "高对比", "增强文字和卡片对比度。"],
  ["a11y-reduce-motion", "减少动画", "关闭大部分移动、缩放和流动动画。"],
  ["a11y-underline-links", "链接下划线", "让链接在不依赖颜色的情况下更容易辨认。"],
  ["a11y-colorblind", "色盲友好", "使用更稳定的蓝/金配色，减少红绿依赖。"],
];

function syncA11yButtons() {
  ACCESSIBILITY_OPTIONS.forEach(([className]) => {
    const button = document.querySelector(`[data-a11y="${className}"]`);
    if (button) button.classList.toggle("active", document.body.classList.contains(className));
  });
}

document.querySelector("#accessibilityBtn").addEventListener("click", () => {
  document.querySelector("#utilityKicker").textContent = "Accessibility";
  document.querySelector("#utilityTitle").textContent = I18N[currentLang].accessibilitySettings;
  document.querySelector("#utilityBody").innerHTML = `
    <div class="a11y-options">
      ${ACCESSIBILITY_OPTIONS.map(([className, title, desc]) => `<button type="button" data-a11y="${className}"><strong>${title}</strong><span>${desc}</span></button>`).join("")}
    </div>
  `;
  openDialog(document.querySelector("#utilityDialog"));
  syncA11yButtons();
});

document.querySelector("#utilityDialog").addEventListener("click", (event) => {
  const langButton = event.target.closest("[data-lang]");
  if (langButton) {
    applyLanguage(langButton.dataset.lang);
    return;
  }
  const a11yButton = event.target.closest("[data-a11y]");
  if (a11yButton) {
    document.body.classList.toggle(a11yButton.dataset.a11y);
    syncA11yButtons();
  }
});

document.querySelector("#visitorForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const site = await loadSiteSettings();
  const name = document.querySelector("#visitorName").value.trim();
  const email = document.querySelector("#visitorEmail").value.trim();
  const message = document.querySelector("#visitorMessage").value.trim();
  const text = `访客信息\n姓名：${name}\n邮箱：${email}\n留言：${message}\n\n站点联系人：${site.contactName} / ${site.contactEmail} / ${site.contactWechat}`;
  document.querySelector("#contactContent").innerHTML = `
    <div><strong>访客信息已生成</strong><span>${text.replace(/\n/g, "<br>")}</span></div>
    <div><strong>下一步</strong><span>当前是纯静态网页，信息不会自动发出。你可以复制这段内容，后续也可以接入 Formspree、Google Forms 或后端接口。</span></div>
  `;
  navigator.clipboard?.writeText(text).catch(() => {});
});

applyLanguage(currentLang);
