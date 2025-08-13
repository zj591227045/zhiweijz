# RevenueCat生产环境配置指南

## 概述

本指南帮助您完成RevenueCat在生产环境的完整配置，解决订阅同步和iOS应用发布问题。

## 问题分析

### 问题1：订阅成功但后端数据库未同步
- **原因**：Webhook URL配置错误，指向开发环境
- **影响**：`membership_entitlements`、`membership_notifications`、`membership_renewals` 表无数据

### 问题2：正式发布的iOS应用无法获取RevenueCat信息
- **原因**：iOS打包使用开发环境API密钥
- **影响**：用户看到"RevenueCat Dashboard需要配置产品"错误

## 解决方案

### 步骤1：配置生产环境Webhook Secret

1. **获取Webhook Secret**：
   - 登录 [RevenueCat Dashboard](https://app.revenuecat.com)
   - 进入 `Integrations` → `Webhooks`
   - 复制 `Webhook Secret`

2. **更新Docker环境变量**：
   ```bash
   # 编辑 docker/.env 文件
   REVENUECAT_WEBHOOK_SECRET=your_actual_webhook_secret_here
   ```

3. **重启Docker服务**：
   ```bash
   cd docker
   docker-compose down
   docker-compose up -d
   ```

### 步骤2：配置iOS生产环境API密钥

1. **获取生产环境API密钥**：
   - 在RevenueCat Dashboard中
   - 进入 `API Keys` → `SDK API Keys`
   - 复制生产环境的iOS API密钥

2. **更新移动端环境变量**：
   ```bash
   # 编辑 apps/web/.env.mobile 文件
   NEXT_PUBLIC_REVENUECAT_API_KEY=your_production_ios_api_key_here
   REVENUECAT_REST_API_KEY=your_production_rest_api_key_here
   ```

### 步骤3：验证配置

1. **测试Webhook**：
   - 在RevenueCat Dashboard中发送测试webhook
   - 检查后端日志是否收到事件
   - 验证数据库表是否有新数据

2. **测试iOS应用**：
   - 使用更新后的配置重新打包iOS应用
   - 在TestFlight或App Store中测试购买流程
   - 确认RevenueCat产品列表正常加载

## 配置文件说明

### Docker环境变量 (docker/.env)
```bash
# RevenueCat配置
NEXT_PUBLIC_REVENUECAT_API_KEY=your_production_sdk_api_key
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret
REVENUECAT_REST_API_KEY=your_production_rest_api_key
```

### 移动端环境变量 (apps/web/.env.mobile)
```bash
# 生产环境API配置
NEXT_PUBLIC_API_BASE_URL=https://app.zhiweijz.cn:1443
NEXT_PUBLIC_REVENUECAT_API_KEY=your_production_sdk_api_key

# 移动端优化配置
NEXT_PUBLIC_IS_MOBILE=true
NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false
NEXT_PUBLIC_LOG_LEVEL=error
```

## 重新打包iOS应用

使用更新后的配置重新打包：

```bash
cd apps/web
./scripts/build-ios.sh
```

脚本会自动：
1. 使用 `.env.mobile` 中的生产环境配置
2. 排除admin/debug页面减小包体积
3. 构建完成后恢复原始配置

## 验证清单

- [ ] RevenueCat Dashboard Webhook URL已更新为生产环境
- [ ] Docker环境变量中已配置REVENUECAT_WEBHOOK_SECRET
- [ ] .env.mobile文件中已配置生产环境API密钥
- [ ] Docker服务已重启
- [ ] iOS应用已使用新配置重新打包
- [ ] 测试购买流程正常
- [ ] 数据库表有新的订阅数据

## 故障排除

### Webhook事件未收到
1. 检查RevenueCat Dashboard中的webhook URL配置
2. 检查Docker日志：`docker logs zhiweijz-backend`
3. 验证REVENUECAT_WEBHOOK_SECRET配置

### iOS应用仍显示配置错误
1. 确认.env.mobile中的API密钥正确
2. 重新运行build-ios.sh脚本
3. 检查Xcode项目中的环境变量

### 数据库同步问题
1. 检查用户ID映射逻辑
2. 验证RevenueCat用户ID格式
3. 查看后端webhook处理日志

## 联系支持

如遇到问题，请提供：
1. RevenueCat Dashboard截图
2. Docker服务日志
3. iOS应用错误信息
4. 数据库查询结果
