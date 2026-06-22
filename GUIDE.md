# 上手步骤

---

## 1. Fork 我的仓库

打开 [github.com/zhangxq0606-ctrl/github-blindbox](https://github.com/zhangxq0606-ctrl/github-blindbox)，点右上角 **Fork**，选你自己账号，创建。

这一步是把我的代码复制到你名下，后面要改东西都是在你自己仓库里改。

---

## 2. 拿 DeepSeek API Key

打开 [platform.deepseek.com](https://platform.deepseek.com/) 「Create new secret key」→ 复制 Key。

**别忘了充值。** 冲个10元，能用很久。

---

## 3. 拿 QQ 邮箱授权码

登录你的 QQ 邮箱 网页版→ **设置** → **账号与安全** → 安全设置 **「IMAP/SMTP 服务」** → 开启 → 发短信验证 → 拿 16 位授权码。关掉弹窗就看不到了，**立刻保存好**。

注意这是授权码，不是你的 QQ 密码。

---

## 4. 加 5 个 Secret

进你 Fork 的仓库 → **Settings → Secrets and variables → Actions** → 点 **New repository secret**，一个一个加：

| Secret 名称 | 填什么 |
|-------------|--------|
| `ANTHROPIC_AUTH_TOKEN` | DeepSeek Key |
| `ANTHROPIC_BASE_URL` | `https://api.deepseek.com/v1` |
| `ANTHROPIC_MODEL` | `deepseek-chat` |
| `QQ_EMAIL` | 你的 QQ 邮箱 |
| `QQ_SMTP_AUTH_CODE` | QQ 邮箱授权码 |

名称一字不差，大小写也要一样。

---

## 5. 手动触发收第一封邮件

进你 Fork 的仓库 → **Actions** → 左边点 **GitHub 每日盲盒** → 右边点 **Run workflow** → 绿色按钮。

等 1-2 分钟，刷新页面看圆圈有没有变绿勾。变绿了就去 QQ 邮箱收件箱查收。**没有就去垃圾邮件里找找。**

---

## 6. 调成你想要的

已经能收到邮件了。如果想改：

**筛选方向**：到 `scripts/github-digest.js` 里找「阅读者画像」段落，把你的关注方向写进去就行。比如你是设计师就写喜欢好看的东西，你是后端就写关注性能。

**推送时间**：到 `.github/workflows/digest.yml` 里找到 cron 那行改掉。注意我每天 05:00 抓数据，GitHub Actions 有延迟，**推送必须设在 07:00 之后**。

UTC 换算：`北京时间 - 8`。想 20:00 收到就填 `0 12 * * *`，想 22:00 收到就填 `0 14 * * *`。

改完直接 GitHub 网页上点 Commit 就行。
