# ProjectFlow-frontend-JT

项目与开发管理系统前端，基于 Vue 3、JavaScript、Vite 和 Ant Design Vue。

## 本地运行

```bash
pnpm install
pnpm dev
```

开发代理默认连接 `http://localhost:8088`。若后端使用其他地址，在启动前设置 `VITE_PROXY_TARGET`，例如 PowerShell：

```powershell
$env:VITE_PROXY_TARGET='http://localhost:19090'
pnpm dev
```

前端 API 前缀通过 `.env.development` / `.env.production` 的 `VITE_API_BASE_URL` 配置。

## 构建

```bash
pnpm build
```

运行核心权限、通知跳转和分页回归检查：`pnpm test`。
