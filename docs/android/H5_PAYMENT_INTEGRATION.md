# Android H5支付集成指南

本文档详细说明如何将H5支付API集成到Android客户端的订阅会员购买功能中。

## 概述

H5支付集成为Android用户提供了微信支付和支付宝支付选项，通过WebView组件调用第三方H5支付API，实现订阅会员的购买功能。

## 系统架构

```
Android客户端 → 前端WebView → H5支付API → 微信/支付宝 → 支付回调 → 后端处理 → 会员升级
```

## 已实现的功能

### 1. 后端服务

#### H5支付服务 (`server/src/services/h5-payment.service.ts`)
- 创建H5支付订单
- 查询支付状态
- 处理支付回调通知
- 自动会员升级
- 签名验证

#### Android H5产品配置 (`server/src/config/android-h5-products.ts`)
- 6种订阅产品配置
- 微信/支付宝价格设置
- 会员权益映射
- 产品验证工具

#### API路由 (`server/src/routes/android-h5-payment.routes.ts`)
- `POST /api/android-h5-payment/create-order` - 创建支付订单
- `GET /api/android-h5-payment/query-status/:outTradeNo` - 查询支付状态
- `GET /api/android-h5-payment/products` - 获取产品列表
- `POST /api/android-h5-payment/notify` - 支付回调通知
- `GET /api/android-h5-payment/config-status` - 配置状态检查

### 2. 前端组件

#### AndroidH5PaymentModal (`apps/web/src/components/AndroidH5PaymentModal.tsx`)
- 产品选择界面
- 支付方式选择（微信/支付宝）
- WebView支付流程
- 支付状态轮询
- 平台检测

#### 会员中心集成 (`apps/web/src/app/settings/membership/page.tsx`)
- 平台自动检测
- Android用户显示H5支付选项
- iOS用户显示RevenueCat支付选项

### 3. 数据库

#### H5支付订单表 (`h5_payment_orders`)
```sql
- id: 订单ID
- user_id: 用户ID
- product_id: 产品ID
- out_trade_no: 商户订单号
- trade_no: 第三方订单号
- amount: 支付金额（分）
- pay_type: 支付类型（wechat/alipay）
- status: 订单状态
- expire_time: 过期时间
- paid_at: 支付时间
```

## 配置说明

### 1. 环境变量配置

在 `server/.env` 中添加以下配置：

```bash
# H5支付配置
H5_PAYMENT_APP_ID=your_h5_payment_app_id
H5_PAYMENT_APP_SECRET=your_h5_payment_app_secret
H5_PAYMENT_NOTIFY_URL=https://your-domain.com/api/android-h5-payment/notify
H5_PAYMENT_API_BASE_URL=https://open.h5zhifu.com
```

### 2. 产品配置

6种订阅产品已预配置：

| 产品ID | 名称 | 月付价格 | 年付价格 | 会员级别 |
|--------|------|----------|----------|----------|
| zhiweijz_donation_one_monthly | 捐赠会员（壹）月付 | ¥5 | - | DONATION_ONE |
| zhiweijz_donation_two_monthly | 捐赠会员（贰）月付 | ¥10 | - | DONATION_TWO |
| zhiweijz_donation_three_monthly | 捐赠会员（叁）月付 | ¥15 | - | DONATION_THREE |
| zhiweijz_donation_one_yearly | 年费捐赠会员（壹） | - | ¥55 | DONATION_ONE |
| zhiweijz_donation_two_yearly | 年费捐赠会员（贰） | - | ¥110 | DONATION_TWO |
| zhiweijz_donation_three_yearly | 年费捐赠会员（叁） | - | ¥165 | DONATION_THREE |

## 使用流程

### 1. 用户购买流程

1. 用户在Android应用中进入会员中心
2. 点击"立即订阅"按钮
3. 系统检测到Android平台，显示H5支付模态框
4. 用户选择订阅方案（月付/年付）
5. 用户选择支付方式（微信/支付宝）
6. 点击"立即支付"创建订单
7. 系统调用H5支付API创建支付订单
8. 在WebView中打开支付页面
9. 用户完成支付
10. H5支付API发送回调通知
11. 后端处理回调，更新用户会员状态
12. 前端刷新会员信息

### 2. 技术流程

#### 创建订单
```typescript
// 前端调用
const response = await apiClient.post('/android-h5-payment/create-order', {
  productId: 'zhiweijz_donation_one_monthly',
  payType: 'wechat'
});

// 后端处理
const h5PaymentService = new H5PaymentService(config);
const result = await h5PaymentService.createPaymentOrder(request);
```

#### 支付回调
```typescript
// H5支付API回调
POST /api/android-h5-payment/notify
{
  "appId": "your_app_id",
  "outTradeNo": "H5_1234567890_1234",
  "tradeNo": "third_party_trade_no",
  "amount": 500,
  "payType": "wechat",
  "status": "PAID",
  "paidTime": "2024-01-01 12:00:00",
  "sign": "signature"
}

// 后端处理
await h5PaymentService.handlePaymentNotification(notification);
```

## 安全机制

### 1. 签名验证
- 所有API请求使用MD5签名验证
- 回调通知验证签名防止伪造
- 密钥安全存储在环境变量中

### 2. 订单验证
- 订单状态检查防止重复处理
- 订单过期时间控制（2小时）
- 用户身份验证

### 3. 数据完整性
- 数据库事务确保一致性
- 错误处理和回滚机制
- 详细的日志记录

## 测试指南

### 1. 配置检查
```bash
# 检查配置状态
GET /api/android-h5-payment/config-status
```

### 2. 产品列表测试
```bash
# 获取产品列表
GET /api/android-h5-payment/products
```

### 3. 订单创建测试
```bash
# 创建测试订单
POST /api/android-h5-payment/create-order
{
  "productId": "zhiweijz_donation_one_monthly",
  "payType": "wechat"
}
```

### 4. 回调测试
```bash
# 模拟支付回调
POST /api/android-h5-payment/notify
{
  "appId": "test_app_id",
  "outTradeNo": "test_order_123",
  "tradeNo": "test_trade_456",
  "amount": 500,
  "payType": "wechat",
  "status": "PAID",
  "paidTime": "2024-01-01 12:00:00",
  "sign": "calculated_signature"
}
```

## 部署说明

### 1. 数据库迁移
```bash
# 运行数据库迁移
npm run migrate:upgrade
```

### 2. 环境变量设置
确保所有H5支付相关的环境变量已正确配置。

### 3. 依赖安装
```bash
# 前端依赖
cd apps/web
npm install @capacitor/browser

# 后端依赖已包含在现有依赖中
```

## 监控和维护

### 1. 日志监控
- 支付订单创建日志
- 支付回调处理日志
- 会员升级处理日志
- 错误和异常日志

### 2. 数据监控
- 订单状态统计
- 支付成功率
- 会员升级成功率
- 异常订单处理

### 3. 性能监控
- API响应时间
- 数据库查询性能
- WebView加载性能

## 故障排除

### 1. 常见问题
- 签名验证失败：检查密钥配置
- 订单创建失败：检查产品配置和网络连接
- 回调处理失败：检查回调URL和服务器状态
- 会员升级失败：检查会员服务配置

### 2. 调试工具
- 配置状态检查接口
- 详细的错误日志
- 订单状态查询接口

## 扩展功能

### 1. 支持更多支付方式
可以扩展支持更多第三方支付平台。

### 2. 订单管理
可以添加订单查询、取消、退款等功能。

### 3. 统计分析
可以添加支付数据统计和分析功能。

## 注意事项

1. H5支付仅在Android环境中可用
2. 需要配置正确的回调URL
3. 确保服务器可以接收第三方回调
4. 定期检查和更新签名算法
5. 监控支付成功率和异常情况
