# LX 矩阵 · 蓝V互推

LXDAO 蓝V 互推矩阵的管理站点。聚焦 Web3 / AI / 技术 / 投研 的小而精互推社群。

## 页面

| 路由            | 说明                                          |
| --------------- | --------------------------------------------- |
| `/`             | 首页 —— 项目介绍与入口                        |
| `/rules`        | 群规则展示页（入群要求、互推玩法、频率约定等）|
| `/register`     | 账号登记页 —— 填写 Twitter 账号 + 微信名称    |
| `/api/register` | 登记接口（POST），写入 PostgreSQL             |

## 技术栈

- Next.js 16 (App Router) + React 19
- Tailwind CSS v4
- PostgreSQL（通过 `pg`）
- 视觉风格参考 LXDAO 官网（黑色主色 + `#f9b934` 黄色点缀）

## 本地开发

```bash
npm install
```

配置数据库连接（账号登记需要）：

```bash
cp .env.example .env
# 编辑 .env，填入 DATABASE_URL=postgres://user:pass@host:5432/dbname
```

启动：

```bash
npm run dev
```

打开 http://localhost:3000

> 登记接口首次写入时会自动建表 `twitter_registrations`（含 twitter / wechat / 时间戳），
> 并对 Twitter 账号做去重（同一账号重复登记会更新微信名称）。

## 数据库

`DATABASE_URL` 指向任意 PostgreSQL 实例即可。SSL 处理：

- 默认开启证书校验；
- 托管数据库可设 `DATABASE_CA_CERT`（PEM）做正规校验；
- 实在不行可设 `DATABASE_SSL_NO_VERIFY=true` 跳过校验（仅限开发，不推荐）。

## 浏览器插件（流量矩阵助手）

`extension/` 是配套 Chrome 插件，闭环成员互推：待互动队列 + 角标提醒 + x.com 上识别成员推文并自动打卡。产品设计与分期见 [`docs/extension-roadmap.md`](docs/extension-roadmap.md)，开发说明见 [`extension/README.md`](extension/README.md)。

## 后续规划

- 互动率排行与管理端覆盖率看板（路线图 Phase 3）
- 推特群组联动
