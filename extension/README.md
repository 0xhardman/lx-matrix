# LX 矩阵 · 流量矩阵助手（Chrome 插件）

把成员互推从"靠自觉"变成"有系统"的工具，配合后端站点形成流量矩阵闭环。完整的产品设计见 [`docs/extension-roadmap.md`](../docs/extension-roadmap.md)。

## 功能（v0.2）

- **动态打卡队列**：聚合所有已审核成员的近期原创推文；待互动的排前面，互动完点"打卡"，已互动的变灰。自己的推文标"我的"，不进队列。
- **角标提醒**：后台每 30 分钟拉一次动态，工具栏角标 = 近 24 小时还没互动的成员推文数。归零即今日任务清完。
- **x.com 现场识别**：刷推时成员推文自动打「LX 矩阵」黄标；在成员推文卡片里点 点赞/转发/回复 会**自动打卡**，不用回到面板。
- **成员监控**：每人今天发没发帖（快照差值），未发的排前面，方便提醒。

## 开发 / 构建

```bash
cd extension
npm install
npm run build      # 产物输出到 extension/dist
```

构建为三个入口：popup（React）、`background.js`（MV3 service worker）、`content.js`（x.com 内容脚本）。后两者**不允许有运行时 import**（只能 `import type`），保证产物是独立经典脚本——MV3 内容脚本不支持 ES module。

发布：`cd dist && zip -r ../../public/lx-matrix-extension.zip . -x '.*'`，网站 `/extension` 页提供下载。

## 加载到 Chrome

1. `npm run build` 生成 `extension/dist`。
2. 打开 `chrome://extensions`，右上角开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择 `extension/dist` 目录。
4. 点击工具栏图标打开 popup。**配置通常是自动的**：

**一键连接（推荐）**：登录网站 `/extension` 页 → 点「生成扩展令牌」，页面会通过 `postMessage` 把令牌交给插件的 `connect.js` 内容脚本，自动写入服务地址 + 令牌，并在页面显示「已自动填入」。点开图标即用，无需复制。

**手动兜底**：没自动填上时，popup 设置里填两项：
- **服务地址**：默认已预填 `https://lx-matrix.vercel.app`（本地调试改成 `http://localhost:3000`，从本地 `/extension` 页一键连接会自动改好）。
- **扩展令牌**：网站 `/extension` 页生成的 `ext_` 令牌，复制粘贴。

设置保存在 `chrome.storage.local`，仅本机可见。

> 自动连接依赖 `manifest.json` 里 `connect.js` 的 `matches`。默认匹配 `https://lx-matrix.vercel.app/*` 和 `http://localhost/*`；换自定义域名时记得加进去。

## 工作原理

- 后端 cron 每天快照成员公开推文累计数（`tweet_snapshots`），按天差值得出"今天发没发"。
- `/api/feed` 按 TTL 聚合成员近期原创推文（`member_tweets`），并对当前成员标注 `engaged` / `own`，附带 `summary`（待互动数、今日已互动数）。
- 打卡写入 `tweet_engagements`（成员 × 推文，带来源 popup / x.com），`POST /api/engagements`，给自己的推文打卡会被拒绝。
- 内容脚本不持有令牌：成员名单和打卡上报都经由 service worker 转发。

## 边界

- 插件**只做提醒和记录**，不会自动点赞/转发——互动永远由真人完成（见路线图"非目标"）。
- 令牌无效或非成员会返回 401。
- 「无数据」表示该成员还没有可计算当日增量的历史快照，等 cron 跨过一个自然日即可。
