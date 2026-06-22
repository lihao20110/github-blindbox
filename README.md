# GitHub 每日盲盒

每天 18:00，AI 自动从 GitHub Trending 筛选**真正值得关注的项目**，按「创意好玩 / 工具 / AI 应用」三类整理好，发到你 QQ 邮箱。

**服务器我已经搭好了，数据源我包了。** 你不需要任何服务器，Fork 我的仓库，加几个 Secret，就能收邮件。

---

## 怎么用

读我的介绍 → 把 [`AI-GUIDE.md`](AI-GUIDE.md) 丢给你的 AI 编程助手 → 跟着走完 5 步。

**全程浏览器操作，不需要终端。**

**你需要自己准备：**

| 需要准备 | 费用 | 时间 |
|---------|------|------|
| DeepSeek API Key | 1 元起充 | 3 分钟 |
| QQ 邮箱授权码 | 免费 | 2 分钟 |

剩下的 AI 会一步步引导你完成。

---

## 原理

```
我的服务器 05:00 抓数据
    ↓
push 到 GitHub（公开的数据源）
    ↓
你的 Fork → Actions 拉我的数据 → AI 筛选 → 发邮件到 QQ 邮箱
```

- 抓取是我干的，你 Fork 后只用配 DeepSeek + 邮箱
- 全部跑在 GitHub Actions 上，零成本

## 常见问题

**Q：每天能收到多少项目？**
A：从 50-80 个候选项目中筛选，最终推送 6-9 个。

**Q：收不到邮件怎么办？**
A：检查 5 个 Secret 是否正确，特别是 `QQ_SMTP_AUTH_CODE`。然后手动 Run workflow 看报错日志。

**Q：可以用其他模型吗？**
A：可以。改两个 Secret：`ANTHROPIC_BASE_URL` 和 `ANTHROPIC_MODEL`。

**Q：为什么必须 07:00 之后推送？**
A：我每天 05:00 抓取 commit，GitHub Actions 有队列延迟，07:00 之后确保数据已更新。
