![](/public/og-image.png)

[English](./README.md) | 简体中文 | [日本語](README.ja-JP.md)

***优雅地阅读实时热门新闻***

> [!NOTE]
> 当前版本为 DEMO，仅支持中文。正式版将提供更好的定制化功能和英文内容支持。
>

## 功能特性
- 优雅的阅读界面设计，实时获取最新热点新闻
- 支持 GitHub 登录及数据同步
- 默认缓存时长为 30 分钟，登录用户可强制刷新获取最新数据
- 根据内容源更新频率动态调整抓取间隔（最快每 2 分钟），避免频繁抓取导致 IP 被封禁
- 支持 MCP server

```json
{
  "mcpServers": {
    "newsnow": {
      "command": "npx",
      "args": [
        "-y",
        "newsnow-mcp-server"
      ],
      "env": {
        "BASE_URL": "https://newsnow.busiyi.world"
      }
    }
  }
}
```

你可以将 `BASE_URL` 修改为你的域名。

## 部署指南

### 基础部署
无需登录和缓存功能时，可直接部署至 Cloudflare Pages 或 Vercel：
1. Fork 本仓库
2. 导入至目标平台

### Cloudflare Pages 配置
- 构建命令：`pnpm run build`
- 输出目录：`dist/output/public`

### GitHub OAuth 配置
1. [创建 GitHub App](https://github.com/settings/applications/new)
2. 无需特殊权限
3. 回调 URL 设置为：`https://your-domain.com/api/oauth/github`（替换 your-domain 为实际域名）
4. 获取 Client ID 和 Client Secret

### 环境变量配置
参考 `example.env.server` 文件，本地运行时重命名为 `.env.server` 并填写以下配置：

```env
# Github Clien ID
G_CLIENT_ID=
# Github Clien Secret
G_CLIENT_SECRET=
# JWT Secret, 通常就用 Clien Secret
JWT_SECRET=
# 初始化数据库, 首次运行必须设置为 true，之后可以将其关闭
INIT_TABLE=true
# 是否启用缓存
ENABLE_CACHE=true
```

### 数据库支持
本项目主推 Cloudflare Pages 以及 Docker 部署， Vercel 需要你自行搞定数据库，其他支持的数据库可以查看 https://db0.unjs.io/connectors 。

1. 在 Cloudflare Worker 控制面板创建 D1 数据库
2. 在 `wrangler.toml` 中配置 `database_id` 和 `database_name`
3. 若无 `wrangler.toml` ，可将 `example.wrangler.toml` 重命名并修改配置
4. 重新部署生效

### Docker 部署
对于 Docker 部署，只需要项目根目录 `docker-compose.yaml` 文件，同一目录下执行
```
docker compose up
```
同样可以通过 `docker-compose.yaml` 配置环境变量。

### 私有化 VPS 部署 (定制版)
我们对本分支进行了纯净化的魔改，使其更加适合个人的轻量级云端服务器，包含以下内置改进：
- **纯净版布局**：默认仅保留“国内”、“科技”、“财经”、“最热”、“实时”版块。
- **防止 IP 封禁**：全局刷新缓存时间下界提升至 60 分钟，大大减轻抓取频次。
- **安全与纯浏览**：默认关闭第三方登录入口与鉴权，仅作为您的专属信息看板。

#### 1. 编译部署
放弃原版的预构建镜像，直接在当前源码目录下利用 `docker-compose.local.yml` 现场打包启动：
```bash
docker compose -f docker-compose.local.yml up -d --build
```

#### 2. 无需重复编译（零代码）添加 RSS 源
由于本分支已在底层织入了动态生成方案，只要使用 Docker `volumes` 挂载 `shared/sources.json`，即可在宿主机直接编辑源。比如我们想要增加一个新的源，只需在 JSON 结尾加入如下配置：
```json
  "custom_feed": {
    "name": "某科技独立博客",
    "column": "tech",
    "color": "green",
    "rss": "https://example.com/rss.xml"
  }
```

修改保存 JSON 后，无需再走重新 Build 的全流程，在宿主机只需运行：
```bash
docker compose -f docker-compose.local.yml restart newsnow
```
系统将会自动侦测到该 `rss` 字段并为其绑定抓取和解析能力，瞬间同步到前端版块中。

## 开发
> [!Note]
> 需要 Node.js >= 20

```bash
corepack enable
pnpm i
pnpm dev
```

### 如何添加数据源（以新增美团技术博客为例）

在 Docker Compose 部署的情况下，如果您想要新增一个资讯源（例如美团技术团队：`https://tech.meituan.com/feed/`），目前系统支持两种添加方式：

#### 方式一：免编译配置即插即用（推荐用于标准 RSS）
如果您使用的是本仓库的定制魔改版，且目标网站提供标准的 RSS 订阅链接，您可以完全无代码、免编译添加！

1. 找到您挂载在外部映射出来的 `shared/sources.json`。
2. 在该 JSON 文件中添加该站点的专属字段块配置（其中需包含 `rss` 字段）：
```json
  "meituan_tech": {
    "name": "美团技术团队",
    "column": "tech",
    "color": "yellow",
    "rss": "https://tech.meituan.com/feed/"
  }
```
3. 保存文件后，在宿主机执行 `docker compose restart newsnow` 重启容器，系统会自动检测并绑定抓取器，立马生效并展示到页面的科技栏目下。

#### 方式二：代码级深度定制（用于非标准 API 或需网页抓取）
如果目标站点不提供 RSS，您必须手写抓取和解析代码，流程如下：

1. **注册基础信息**：修改 `shared/pre-sources.ts`，在 `originSources` 中加入基础配置（注意：此时不需要加 `rss` 字段）。
```typescript
  "meituan_tech": {
    "name": "美团技术团队",
    "column": "tech",
    "color": "yellow",
    "home": "https://tech.meituan.com/"
  }
```
2. **编写抓取逻辑**：在 `server/sources/` 目录下新建一个命名为 `meituan_tech.ts` 的文件，利用项目内置的高级方法，编写具体的 Cheerio 解析或 API 拉取逻辑：
```typescript
import { defineSource } from "../utils/source"

export default defineSource(async () => {
  // 编写您的 fetch 请求和响应体解析代码
  // ...
  return [
    { id: "1", title: "美团技术文章概览", url: "https://tech.meituan.com/xxx" }
  ]
})
```
3. **重新编译生成**：因为新增了 `.ts` 业务源码等编译期改动，您必须本地执行一遍 `npm run presource` 生成静态映射，并且在服务端强制销毁重建容器以编译最新的代码文件：
```bash
docker compose -f docker-compose.local.yml down
docker compose -f docker-compose.local.yml up -d --build
```

## 路线图
- 添加 **多语言支持**（英语、中文，更多语言即将推出）
- 改进 **个性化选项**（基于分类的新闻、保存的偏好设置）
- 扩展 **数据源** 以涵盖多种语言的全球新闻

## 贡献指南
欢迎贡献代码！您可以提交 pull request 或创建 issue 来提出功能请求和报告 bug

## License

[MIT](./LICENSE) © ourongxing

## 赞赏
如果本项目对你有所帮助，可以给小猫买点零食。如果需要定制或者其他帮助，请通过下列方式联系备注。

![](./screenshots/reward.gif)

<a href="https://hellogithub.com/repository/c2978695e74a423189e9ca2543ab3b36" target="_blank"><img src="https://api.hellogithub.com/v1/widgets/recommend.svg?rid=c2978695e74a423189e9ca2543ab3b36&claim_uid=SMJiFwlsKCkWf89&theme=small" alt="Featured｜HelloGitHub" /></a>
