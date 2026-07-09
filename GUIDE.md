# 上手步骤

---

## 1. Fork 我的仓库

打开 [github.com/zhangxq0606-ctrl/github-blindbox](https://github.com/zhangxq0606-ctrl/github-blindbox)，点右上角 **Fork**，选你自己账号，创建。

这一步是把我的代码复制到你名下，后面要改东西都是在你自己仓库里改。

---

## 2. 拿阿里云百炼 API Key

本项目用阿里云百炼上的 **DeepSeek-V4-Flash** 模型（便宜、快、效果好）。

1. 打开 [bailian.console.aliyun.com](https://bailian.console.aliyun.com/)，用阿里云账号登录
2. 进入「模型广场」，搜索 `deepseek-v4-flash`，点「开通服务」
3. 进「API Key 管理」→「创建我的 API Key」→ 复制 `sk-` 开头的 Key

**新用户有免费额度**，够你试用好几天。用完了再充值，1 元起充。

> 如果你已经有 DeepSeek 官方 API Key（platform.deepseek.com），也能用，把 Base URL 改成 `https://api.deepseek.com/v1` 即可。但本指南默认走阿里云百炼。

---

## 3. 拿 QQ 邮箱授权码

登录你的 QQ 邮箱 网页版→ **设置** → **账号与安全** → 安全设置 **「IMAP/SMTP 服务」** → 开启 → 发短信验证 → 拿 16 位授权码。关掉弹窗就看不到了，**立刻保存好**。

注意这是授权码，不是你的 QQ 密码。

---

## 4. 加 5 个 Secret

进你 Fork 的仓库 → **Settings → Secrets and variables → Actions** → 点 **New repository secret**，一个一个加：

| Secret 名称 | 填什么 |
|-------------|--------|
| `ANTHROPIC_AUTH_TOKEN` | 阿里云百炼 API Key（`sk-` 开头） |
| `ANTHROPIC_BASE_URL` | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| `ANTHROPIC_MODEL` | `deepseek-v4-flash` |
| `QQ_EMAIL` | 你的 QQ 邮箱 |
| `QQ_SMTP_AUTH_CODE` | QQ 邮箱授权码 |

名称一字不差，大小写也要一样。

> 如果你有阿里云百炼业务空间专属端点（企业用户），`ANTHROPIC_BASE_URL` 可以换成 `https://<业务空间id>.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`，性能更好。

---

## 5. 手动触发收第一封邮件

进你 Fork 的仓库 → **Actions** → 左边点 **GitHub 每日盲盒** → 右边点 **Run workflow** → 绿色按钮。

等 1-2 分钟，刷新页面看圆圈有没有变绿勾。变绿了就去 QQ 邮箱收件箱查收。**没有就去垃圾邮件里找找。**

---

## 6. 调成你想要的

已经能收到邮件了。如果想改：

**筛选方向**：打开 `config/preferences.json`，改 `readerProfile` 字段（阅读者画像）和 `hardFilters` 数组（数据层硬过滤规则）。AI 会按你写的画像筛选项目，硬过滤规则会在送 AI 之前直接删掉明显不相关的项目。

**推送时间**：到 `.github/workflows/digest.yml` 里找到 cron 那行改掉。注意我每天 05:00 抓数据，GitHub Actions 有延迟，**推送必须设在 07:00 之后**。

UTC 换算：`北京时间 - 8`。想 20:00 收到就填 `0 12 * * *`，想 22:00 收到就填 `0 14 * * *`。

改完直接 GitHub 网页上点 Commit 就行。

---

## 本地开发（可选）

想在本地跑通测试：

```bash
# 1. 安装依赖
cd scripts && npm install

# 2. 复制环境变量样例并填写
cp .env.example .env
# 编辑 .env 填入你的 API Key 和邮箱授权码

# 3. 拉取一份 trending 数据（或用现有的 trending-feed.json）
# 4. 生成 digest
cat trending-feed.json | node scripts/github-digest.js > digest.txt

# 5. 发邮件
cat digest.txt | node scripts/send-email.js --to 你的QQ邮箱
```

`.env` 已在 `.gitignore` 中，不会被提交。
