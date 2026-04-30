const DEFAULT_SITE = {
  contactName: "Daily Mailer Owner",
  contactEmail: "your-email@example.com",
  contactWechat: "your-wechat-id",
  contactNote: "欢迎联系我了解部署、配置和定制方式。",
};

const DETAILS = {
  schedule: {
    title: "定时送达如何运行",
    body: "系统使用 GitHub Actions 的 schedule 触发器。到达设定时间后，云端自动执行脚本，读取 config.json，生成简报并通过 SMTP 发送邮件。你的电脑不需要开机。",
  },
  briefing: {
    title: "增强简报如何整理",
    body: "脚本会按新闻类型抓取 RSS，清洗标题里的 HTML 实体，提取来源与链接。邮件先展示今日重点，再按栏目列出新闻，帮助读者快速判断哪些内容值得打开。",
  },
  pages: {
    title: "网页配置如何分层",
    body: "一级页面面向访客，介绍系统价值与运行原理。二级配置页面向管理员，登录后可生成新的 config.json，再上传到 GitHub 使后续邮件生效。",
  },
  free: {
    title: "免费运行的边界",
    body: "当前方案不调用付费 AI。它依赖 GitHub Pages、GitHub Actions、Open-Meteo 和公开 RSS。免费、轻量，但 GitHub Actions 的定时可能有少量延迟。",
  },
};

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

function openDialog(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function closeDialog(dialog) {
  dialog.close?.();
  dialog.removeAttribute("open");
}

document.querySelectorAll("[data-detail]").forEach((card) => {
  card.addEventListener("click", () => {
    const detail = DETAILS[card.dataset.detail];
    document.querySelector("#detailTitle").textContent = detail.title;
    document.querySelector("#detailBody").textContent = detail.body;
    openDialog(document.querySelector("#detailDialog"));
  });
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => closeDialog(button.closest("dialog")));
});

async function showContact() {
  const site = await loadSiteSettings();
  document.querySelector("#contactContent").innerHTML = `
    <div><strong>${site.contactName}</strong><span>${site.contactNote}</span></div>
    <div><strong>邮箱</strong><span>${site.contactEmail}</span></div>
    <div><strong>微信</strong><span>${site.contactWechat}</span></div>
  `;
  openDialog(document.querySelector("#contactDialog"));
}

document.querySelector("#showContactBtn").addEventListener("click", showContact);
document.querySelector("#footerContactBtn").addEventListener("click", showContact);

document.querySelector("#languageBtn").addEventListener("click", () => {
  document.querySelector("#utilityKicker").textContent = "Language";
  document.querySelector("#utilityTitle").textContent = "语言设置";
  document.querySelector("#utilityBody").textContent = "当前页面以中文展示。后续可以在配置入口中扩展英文文案或多语言字段。";
  openDialog(document.querySelector("#utilityDialog"));
});

document.querySelector("#accessibilityBtn").addEventListener("click", () => {
  document.body.classList.toggle("accessibility-on");
  document.querySelector("#utilityKicker").textContent = "Accessibility";
  document.querySelector("#utilityTitle").textContent = "无障碍设置";
  document.querySelector("#utilityBody").textContent = document.body.classList.contains("accessibility-on")
    ? "已开启增强可读模式：对比度和字号已提升。"
    : "已关闭增强可读模式。";
  openDialog(document.querySelector("#utilityDialog"));
});
