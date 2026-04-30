# Daily Mailer

Daily Mailer 是一个免费的每日邮件简报系统：

- GitHub Pages 展示项目主页和配置入口。
- GitHub Actions 定时抓取天气、新闻并发送邮件。
- GitHub Secrets 保存 SMTP 密码、Gmail 应用专用密码和收件邮箱。

## 网页

主页：

```text
https://你的用户名.github.io/daily-mailer/
```

配置页：

```text
https://你的用户名.github.io/daily-mailer/config.html
```

配置页默认静态登录信息在 `web/config.js` 顶部：

```js
const AUTH_USER = "admin";
const AUTH_PASS = "daily-mailer";
```

你可以改成自己的账号密码。注意：这是静态网页内的轻量登录，只适合隐藏配置入口，不等于真正的后端认证。

## 修改配置

在配置页里可以调整：

- 城市和国家/地区
- 新闻类型
- 每类新闻数量
- 邮件标题
- 是否包含天气
- 显示的发送时间

修改后点击“下载 config.json”，然后上传覆盖仓库根目录的 `config.json`，再 Commit changes。

## 定时发送

真正的自动发送时间由 `.github/workflows/daily-mail.yml` 里的 cron 决定。

默认：

```yaml
cron: "0 0 * * *"
```

含义是北京时间每天 08:00 左右发送。GitHub Actions 使用 UTC，可能会延迟几分钟。

## GitHub Secrets

仓库中进入：

```text
Settings -> Secrets and variables -> Actions
```

添加：

```text
SMTP_HOST
SMTP_PORT
SMTP_SECURITY
SMTP_USER
SMTP_PASS
MAIL_FROM
MAIL_TO
```

Gmail 推荐：

```text
SMTP_HOST       smtp.gmail.com
SMTP_PORT       587
SMTP_SECURITY   starttls
SMTP_USER       你的 Gmail
SMTP_PASS       Gmail 应用专用密码
MAIL_FROM       你的 Gmail
MAIL_TO         接收邮箱
```

## 本地预览

```powershell
cd C:\Users\WXHECANM\Desktop\xxx
node server.js
```

打开：

```text
http://127.0.0.1:8765
```
