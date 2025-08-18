# RevenueCat配置指南

## 概述

本文档详细说明了如何正确配置RevenueCat的三种API密钥，以解决iOS正式应用中无法连接RevenueCat服务的问题。

## API密钥类型说明

### 1. SDK API密钥（公开密钥）
- **用途**: 客户端SDK初始化
- **位置**: 客户端代码中（iOS App、Android App、Web App）
- **格式**: 
  - iOS: `appl_xxxxxxxxxxxxxxxxx`
  - Android: `goog_xxxxxxxxxxxxxxxxx`
  - Web: `web_xxxxxxxxxxxxxxxxx`
- **获取路径**: RevenueCat Dashboard → Project Settings → API keys → App specific keys

### 2. Secret API密钥（私有密钥）
- **用途**: 服务器端API调用
- **位置**: 仅在服务器端环境变量中
- **格式**: `sk_xxxxxxxxxxxxxxxxx`
- **获取路径**: RevenueCat Dashboard → Project Settings → API keys → Secret API keys
- **安全要求**: 绝不能暴露在客户端代码中

### 3. Webhook Secret（可选）
- **用途**: 验证webhook请求的真实性
- **位置**: 服务器端环境变量中
- **格式**: 自定义字符串
- **获取路径**: RevenueCat Dashboard → Integrations → Webhooks → 创建webhook时生成
- **必要性**: 可选，但生产环境强烈建议配置

## 环境变量配置

### 前端/客户端配置（仅iOS）
```bash
# iOS SDK API密钥（仅iOS使用）
NEXT_PUBLIC_REVENUECAT_IOS_API_KEY=appl_your_ios_key_here

# 向后兼容的通用API密钥（与iOS密钥相同）
NEXT_PUBLIC_REVENUECAT_API_KEY=appl_your_ios_key_here

# 注意：Android使用单独的第三方支付，不使用RevenueCat
# 注意：Web版本暂不支持支付功能
```

### 后端/服务器端配置
```bash
# Secret API密钥（用于服务器端API调用）
REVENUECAT_REST_API_KEY=sk_your_secret_key_here

# Webhook Secret（可选，用于webhook验证）
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

## 常见问题解决

### 1. iOS正式应用无法连接RevenueCat
**原因**: 使用了错误的API密钥或密钥格式不正确
**解决方案**:
1. 确保使用iOS专用的SDK API密钥（appl_前缀）
2. 检查密钥是否来自正确的RevenueCat项目
3. 确认密钥对应的是生产环境而非沙盒环境

### 2. Webhook验证失败
**原因**: REVENUECAT_WEBHOOK_SECRET配置问题
**解决方案**:
1. 检查webhook secret是否正确配置
2. 确认webhook URL配置正确
3. 在开发环境中可以暂时跳过webhook验证

### 3. API密钥混用
**原因**: 在客户端使用了服务器端密钥，或反之
**解决方案**:
1. 客户端只能使用SDK API密钥（appl_/goog_/web_前缀）
2. 服务器端只能使用Secret API密钥（sk_前缀）
3. 绝不在客户端代码中暴露Secret API密钥

## 配置验证

### 检查API密钥格式
```javascript
// 正确的iOS SDK API密钥格式
const iosApiKey = "appl_xxxxxxxxxxxxxxxxx";
console.log(iosApiKey.startsWith('appl_')); // 应该返回 true

// 正确的Secret API密钥格式
const secretApiKey = "sk_xxxxxxxxxxxxxxxxx";
console.log(secretApiKey.startsWith('sk_')); // 应该返回 true
```

### 测试连接
1. 在开发环境中启用调试日志
2. 检查RevenueCat初始化是否成功
3. 验证产品列表是否能正确加载
4. 测试购买流程是否正常

## 安全最佳实践

1. **密钥分离**: 严格区分客户端和服务器端密钥
2. **环境隔离**: 开发、测试、生产环境使用不同的密钥
3. **定期轮换**: 定期更新Secret API密钥
4. **访问控制**: 限制对Secret API密钥的访问权限
5. **监控日志**: 监控API调用日志，及时发现异常

## 故障排除

### 启用调试日志
```javascript
// 在开发环境中启用RevenueCat调试日志
if (process.env.NODE_ENV === 'development') {
  await Purchases.setLogLevel({ level: 'DEBUG' });
}
```

### 检查网络连接
1. 确认设备网络连接正常
2. 检查是否有防火墙或代理阻止连接
3. 验证RevenueCat服务状态

### 验证配置
1. 检查所有环境变量是否正确设置
2. 确认API密钥没有多余的空格或特殊字符
3. 验证密钥对应的RevenueCat项目是否正确

## 联系支持

如果问题仍然存在，请联系RevenueCat支持团队，并提供：
1. 使用的SDK版本
2. 错误日志
3. API密钥前缀（不要提供完整密钥）
4. 设备和操作系统信息
