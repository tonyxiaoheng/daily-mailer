# Daily Mailer

一个免费的每日邮件简报方案：

- GitHub Pages 负责展示网页。
- GitHub Actions 负责每天定时抓取天气、新闻并发送邮件。
- GitHub Secrets 保存邮箱授权码和 SMTP 信息。

## 本地预览网页

```powershell
cd C:\Users\WXHECANM\Desktop\xxx
node server.js
```

打开：

```text
http://127.0.0.1:8765
```

也可以直接双击 `启动.bat`。

## GitHub Secrets

进入仓库：

```text
Settings -> Secrets and variables -> Actions -> New repository secret
```

添加这些 Secret：

```text
SMTP_HOST       例如 smtp.qq.com
SMTP_PORT       例如 465
SMTP_SECURITY   ssl 或 starttls
SMTP_USER       邮箱登录账号
SMTP_PASS       邮箱授权码，不建议用登录密码
MAIL_FROM       发件邮箱
MAIL_TO         收件邮箱，多个邮箱用英文逗号分隔
```

QQ 邮箱、163、Gmail 等通常需要开启 SMTP，并使用“授权码”。

## GitHub Pages 上线

把项目推送到 GitHub 后，仓库里已经包含：

```text
.github/workflows/pages.yml
```

它会把 `web` 目录和 `config.json` 发布到 GitHub Pages。

第一次使用时，到仓库：

```text
Settings -> Pages -> Build and deployment -> Source
```

选择：

```text
GitHub Actions
```

之后每次推送到 `main` 分支，网页会自动发布。

## 定时发送

仓库里已经包含：

```text
.github/workflows/daily-mail.yml
```

默认每天北京时间 08:00 发送：

```yaml
cron: "0 0 * * *"
```

GitHub Actions 的 cron 使用 UTC。如果你想改成北京时间 09:30，需要改成：

```yaml
cron: "30 1 * * *"
```

也可以在 GitHub 的 Actions 页面手动运行 `Daily Mail` 工作流测试发送。

## 修改内容配置

网页里可以调整城市、新闻类型、邮件标题等公开配置，并下载新的 `config.json`。

将下载后的 `config.json` 替换仓库根目录里的 `config.json`，提交到 GitHub 后，后续自动邮件会使用新配置。

## 数据来源

- 天气：Open-Meteo，无需 API Key。
- 新闻：Google News RSS。
