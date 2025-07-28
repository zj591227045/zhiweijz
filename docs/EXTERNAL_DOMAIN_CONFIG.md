# 外部访问域名配置指南

## 概述

为了统一管理项目中的外部访问域名，我们添加了 `EXTERNAL_DOMAIN` 环境变量。这个变量用于配置：

1. **Nginx重定向域名** - 处理API路径重定向时使用的域名
2. **iOS快捷指令返回地址** - 快捷指令上传文件后的返回URL
3. **Token验证地址** - 快捷指令token有效性检查的API地址
4. **默认API服务器地址** - 当没有手动配置时的默认服务器地址

## 环境变量配置

### 1. 服务端配置 (server/.env)

```bash
# 外部访问域名配置（包含域名+端口）
# 用于nginx重定向、iOS快捷指令返回地址、token验证地址等
# 示例: https://your-domain.com:443 或 http://your-domain.com:8080
EXTERNAL_DOMAIN=https://your-domain.com
```

### 2. Docker配置 (docker/.env)

```bash
# 外部访问域名配置（包含域名+端口）
# 用于nginx重定向、iOS快捷指令返回地址、token验证地址等
# 示例: https://your-domain.com:443 或 http://your-domain.com:8080
EXTERNAL_DOMAIN=https://your-domain.com
```

### 3. 前端配置 (apps/web/.env.local)

```bash
# 外部访问域名配置（包含域名+端口）
# 用于nginx重定向、iOS快捷指令返回地址、token验证地址等
# 示例: https://your-domain.com:443 或 http://your-domain.com:8080
EXTERNAL_DOMAIN=https://your-domain.com

# 官方网站地址
NEXT_PUBLIC_OFFICIAL_WEBSITE=https://www.zhiweijz.cn
```

## 使用场景

### 1. Nginx重定向配置

Nginx配置文件会自动使用 `EXTERNAL_DOMAIN` 环境变量来设置重定向域名：

```nginx
# 如果配置了外部域名，优先使用外部域名
if ($external_domain != "") {
    set $redirect_host $external_domain;
}
return 301 $scheme://$redirect_host/api/;
```

### 2. iOS快捷指令配置

快捷指令相关的API会使用外部域名来生成返回地址：

```typescript
// 动态确定API基础URL
let apiBaseUrl = process.env.EXTERNAL_DOMAIN || process.env.API_BASE_URL;

res.json({
  success: true,
  token: tempToken,
  uploadUrl: `${apiBaseUrl}/api/upload/shortcuts`,
  checkTokenUrl: `${apiBaseUrl}/api/ai/shortcuts/check-token`,
});
```

### 3. 服务器配置逻辑

登录页面的服务器配置遵循以下逻辑：

- **官方服务器**: 始终使用固定地址 `https://app.zhiweijz.cn:1443/api`
- **自定义服务器**:
  - 如果配置了 `NEXT_PUBLIC_EXTERNAL_DOMAIN` 环境变量，将作为默认值自动填入
  - 用户仍可以手动修改自定义服务器地址
  - 支持保存用户的自定义配置

```typescript
// 官方服务器 - 固定地址
officialUrl: 'https://app.zhiweijz.cn:1443/api'

// 自定义服务器 - 优先使用环境变量，支持用户修改
customUrl: process.env.NEXT_PUBLIC_EXTERNAL_DOMAIN ?
  process.env.NEXT_PUBLIC_EXTERNAL_DOMAIN + '/api' : ''
```

## 配置示例

### 生产环境示例

```bash
# 使用HTTPS和标准端口
EXTERNAL_DOMAIN=https://app.yourdomain.com

# 使用HTTPS和自定义端口
EXTERNAL_DOMAIN=https://app.yourdomain.com:8443
```

### 开发环境示例

```bash
# 本地开发
EXTERNAL_DOMAIN=http://localhost:3000

# 内网测试
EXTERNAL_DOMAIN=http://192.168.1.100:3000

# ngrok隧道
EXTERNAL_DOMAIN=https://abc123.ngrok.io
```

## 注意事项

1. **域名格式**: 必须包含协议（http://或https://），可以包含端口号
2. **不要包含路径**: 只配置域名和端口，不要包含 `/api` 等路径
3. **Docker环境**: 在Docker环境中，确保在 `docker/.env` 文件中配置此变量
4. **iOS关联域名**: 如果使用自定义域名，需要在 `apps/ios/App/App/App.entitlements` 中添加对应的关联域名

## 影响的文件

以下文件已更新以支持外部域名环境变量：

- `server/src/controllers/ai-controller.ts` - 快捷指令token生成
- `server/src/routes/upload-routes.ts` - 文件上传返回地址
- `server/src/config/config.ts` - 服务器配置
- `docker/config/nginx.conf` - Nginx重定向配置
- `docker/config/docker-entrypoint.sh` - Docker启动脚本
- `apps/web/src/components/debug/api-config-debug.tsx` - API配置调试
- `apps/web/src/lib/server-config.ts` - 服务器配置管理
- `apps/web/src/store/server-config-store.ts` - 服务器配置存储
- `packages/mobile/src/api/config.ts` - 移动端API配置
- `packages/web/src/api/api-client.ts` - Web端API客户端

## 迁移指南

如果你已经在使用项目，请按以下步骤迁移：

1. 在相应的 `.env` 文件中添加 `EXTERNAL_DOMAIN` 变量
2. 设置你的外部访问域名（包含协议和端口）
3. 重启服务以使配置生效
4. 测试iOS快捷指令和API重定向功能

## 故障排除

### 问题1: iOS快捷指令无法获取token

**解决方案**: 检查 `EXTERNAL_DOMAIN` 是否正确配置，确保域名可以从外部访问

### 问题2: API重定向到错误的域名

**解决方案**: 检查Nginx容器的环境变量是否正确传递，重新构建Nginx镜像

### 问题3: 前端无法连接到API

**解决方案**: 检查前端的 `NEXT_PUBLIC_EXTERNAL_DOMAIN` 环境变量是否正确配置
