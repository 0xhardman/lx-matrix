# LX 矩阵 · 成员监控（Chrome 插件）

一个轻量的监控工具：列出 LX 矩阵中**已通过审核**的成员，并显示他们**今天有没有发帖**。数据来自后端 `/api/members`，发帖量由定时快照（`/api/cron/snapshot`）按天累计推文数做差得到。

## 开发 / 构建

```bash
cd extension
npm install        # 或 yarn
npm run build      # 产物输出到 extension/dist
```

开发热更新（在浏览器里调试 popup 页面，但不会自动重载扩展）：

```bash
npm run dev
```

## 加载到 Chrome

1. `npm run build` 生成 `extension/dist`。
2. 打开 `chrome://extensions`，右上角开启「开发者模式」。
3. 点击「加载已解压的扩展程序」，选择 `extension/dist` 目录。
4. 点击工具栏图标打开 popup，首次会要求填写：
   - **服务地址**：后端部署地址，例如 `https://你的域名.vercel.app`（本地调试填 `http://localhost:3000`）。
   - **成员令牌**：审核通过后获得的 member token（`m_` 开头），可在 `/invite` 页面查到。

设置保存在 `chrome.storage.local`，仅本机可见。修改后点设置按钮（⚙）即可更新。

## 工作原理

- 后端 cron（Vercel）每天定时调用 `/api/cron/snapshot`，用 xapi 抓取每个已审核成员的公开推文累计数，写入 `tweet_snapshots` 并刷新缓存。
- `/api/members` 用 member token 鉴权，返回成员列表 + 今日发帖增量（当前累计数 − 当天 0 点前最后一次快照，按北京时间计日）。
- 插件 popup 渲染列表：`今日 +N`（已发）/`未发`/`无数据`（尚无基准快照），未发的排在前面方便提醒。

## 说明

- 仅已通过审核的成员能拉取数据；令牌无效会返回 401。
- 「无数据」表示该成员还没有可用于计算当日增量的历史快照，等下一次 cron 跑过、跨过一个自然日后就会有数据。
