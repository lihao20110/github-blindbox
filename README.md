# GitHub 每日盲盒

每天用 AI 从 GitHub Trending 里筛出**真正值得看的项目**，按「创意好玩 / 效率工具 / AI 应用」分好类，发到你邮箱。

**不需要服务器，不需要自己抓数据。** Fork 仓库，配 5 个 Secrets，每天 10:00 自动收邮件（时间可改）。

Fork 之后默认用的是我的筛选规则和读者画像，但**全部可以自己调**——读者画像、过滤规则、推荐品类，你想怎么筛就怎么改。这个项目本质上帮你解决的是**数据源问题**：你不用自己爬 GitHub Trending，我每天抓好 push 到仓库，你只管拉下来用。**这是你的项目，怎么筛你说了算。**

---

## 它和别的 Trending 产品有什么不同？

其他 Trending 产品做的事：**把热门 repo 列给你看**，筛不筛是你的事。

这个项目做了四层过滤，不是列表，是筛选。而且每一层你都可以自己改：

**① 多语言聚合抓取 → 建立候选池**
7 个语言维度并行抓取（全语言 + Python、JavaScript、TypeScript、Go、Rust、Java），去重后得到 50-80 个候选项目。抓取语言范围可以自己改。

**② 数据层硬过滤 → 物理删除不相关类别**
12 条正则规则，翻墙、K8s、算法库、Web 框架、编程语言等类别在送 AI 之前直接删掉，不浪费 token，结果更可控。规则列表可以自己增删。

**③ 双池历史去重 → 避免信息疲劳**
- 常青树池：经典老项目短期去重，2 天后可重新推荐，给好项目二次亮相的机会
- 新星池：已推荐项目永久排除，保证每天新鲜

**④ 人格化 AI 筛选 → 按你的口味来**
AI 按你设定的读者画像筛选项目。创意/好玩类**至少 2 个（硬约束）**，AI 产品类**不超过 3 个**，效率工具和数据金融类按需补充。所有数量和品类偏好都可以在 prompt 里调。

---

## 快速开始

### 1. Fork 仓库

打开 [github.com/zhangxq0606-ctrl/github-blindbox](https://github.com/zhangxq0606-ctrl/github-blindbox)，点右上角 **Fork**，选你自己账号。

### 2. 拿 DeepSeek API Key

1. 打开 [platform.deepseek.com/api_keys](https://platform.deepseek.com/api_keys)，注册/登录（无需信用卡）
2. 点 **API Keys** → **Create new API Key** → 填个名字 → **Create**
3. 复制 `sk-` 开头的 Key（**只显示一次，立刻保存好**）

新用户注册送免费额度，够用好几个月。

### 3. 拿 QQ 邮箱授权码

登录 QQ 邮箱网页版 → **设置** → **账号与安全** → 安全设置 **「IMAP/SMTP 服务」** → 开启 → 发短信验证 → 拿 16 位授权码。

这是授权码，不是你的 QQ 密码。

### 4. 配置 5 个 Secrets

进你 Fork 的仓库 → **Settings → Secrets and variables → Actions** → **New repository secret**，一个一个加：

| Secret 名称 | 填什么 |
|-------------|--------|
| `ANTHROPIC_AUTH_TOKEN` | DeepSeek API Key（`sk-` 开头） |
| `ANTHROPIC_BASE_URL` | `https://api.deepseek.com` |
| `ANTHROPIC_MODEL` | `deepseek-v4-flash` |
| `QQ_EMAIL` | 你的 QQ 邮箱（发件和收件都用这个） |
| `QQ_SMTP_AUTH_CODE` | QQ 邮箱授权码（16 位） |

Secret 名称**一字不差**，大小写也要完全一样。

### 5. 手动触发收第一封邮件

进你 Fork 的仓库 → **Actions** → 左边 **GitHub 每日盲盒** → 右边 **Run workflow** → 绿色按钮。

等 1-2 分钟，变绿勾就去 QQ 邮箱收件箱查收。**没有就去垃圾邮件里找找。**

如果红了：点进去看日志，搜 `401` / `404` / `model not found` 等关键词排查。

---

## 定制你的筛选口味

打开 `config/preferences.json`，改两个字段：

- `readerProfile`：写你自己的画像，AI 据此筛选项目
- `hardFilters`：在送 AI 之前直接删掉明显不相关的项目

想扩大范围就写松一点，想精准命中就写细一点。**这是你的项目，怎么筛你说了算。**

---

