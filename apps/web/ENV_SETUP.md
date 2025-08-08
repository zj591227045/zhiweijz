# 环境变量配置指南

## 快速开始

### 1. 复制模板文件

复制 `.env.template` 文件为本地开发配置：

```bash
# 本地开发环境
cp .env.template .env.local
```

**注意**: 生产环境通过Docker环境变量管理，不使用 `.env.production` 文件。

### 2. 配置环境变量

编辑对应的环境文件，根据实际情况修改配置值。

## 环境配置

### 本地开发环境 (.env.local)

```bash
# 基础配置
NODE_ENV=development
BUILD_MODE=web
IS_MOBILE_BUILD=false

# API配置
DEV_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=

# 日志配置（开发环境建议）
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true
NEXT_PUBLIC_LOG_LEVEL=debug
NEXT_PUBLIC_ALLOW_RUNTIME_LOG_CONTROL=true

# 版本管理
NEXT_PUBLIC_ENABLE_VERSION_CHECK=true

# RevenueCat（使用开发环境密钥）
NEXT_PUBLIC_REVENUECAT_API_KEY=your_dev_api_key
REVENUECAT_REST_API_KEY=your_dev_rest_key
```

### 生产环境部署

生产环境通过Docker环境变量管理，在 `docker-compose.yml` 或运行时设置：

```yaml
# docker-compose.yml 示例
environment:
  NODE_ENV: production
  NEXT_PUBLIC_ENABLE_CONSOLE_LOGS: "false"
  NEXT_PUBLIC_LOG_LEVEL: "error"
  NEXT_PUBLIC_API_BASE_URL: "https://app.zhiweijz.cn:1443"
  EXTERNAL_DOMAIN: "https://app.zhiweijz.cn:1443"
```

### 移动端构建

```bash
# 移动端特定配置
BUILD_MODE=mobile
IS_MOBILE_BUILD=true
NEXT_PUBLIC_IS_MOBILE=true

# 移动端日志配置
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false
NEXT_PUBLIC_LOG_LEVEL=error
```

## 重要配置说明

### 日志管理配置

- **NEXT_PUBLIC_ENABLE_CONSOLE_LOGS**: 控制是否启用控制台日志
- **NEXT_PUBLIC_LOG_LEVEL**: 设置日志级别过滤
- **NEXT_PUBLIC_ALLOW_RUNTIME_LOG_CONTROL**: 允许在生产环境临时开启调试

### API配置

- **DEV_BACKEND_URL**: 开发环境后端地址
- **NEXT_PUBLIC_API_BASE_URL**: 前端API基础URL
- **EXTERNAL_DOMAIN**: 外部访问域名（生产环境必填）

### RevenueCat配置

需要从RevenueCat Dashboard获取：
1. **SDK API Key**: 用于客户端
2. **Secret API Key**: 用于服务端
3. **Webhook Secret**: 用于webhook验证（可选）

## 安全注意事项

1. **不要提交敏感信息**: `.env.local`、`.env.production` 等文件不应提交到版本控制
2. **使用不同的密钥**: 开发和生产环境应使用不同的API密钥
3. **生产环境日志**: 建议禁用详细日志，仅保留错误日志

## 故障排除

### 环境变量不生效

1. 检查文件名是否正确（`.env.local` 等）
2. 重启开发服务器
3. 确保环境变量名以 `NEXT_PUBLIC_` 开头（客户端变量）

### API连接问题

1. 检查 `DEV_BACKEND_URL` 是否正确
2. 确认后端服务是否运行
3. 检查端口是否被占用

### 日志不显示

1. 检查 `NEXT_PUBLIC_ENABLE_CONSOLE_LOGS` 设置
2. 确认 `NEXT_PUBLIC_LOG_LEVEL` 级别
3. 在控制台使用 `__LOG_MANAGER__.getConfig()` 查看配置

这个统一的配置模板简化了环境变量管理，避免了多个模板文件的混乱。
