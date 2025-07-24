# RevenueCat集成配置指南

本指南将帮助您完成RevenueCat的完整配置，包括App Store Connect、RevenueCat Dashboard和应用代码的设置。

## 1. App Store Connect配置

### 1.1 创建App内购买产品

1. 登录 [App Store Connect](https://appstoreconnect.apple.com)
2. 选择您的应用
3. 进入 "功能" → "App内购买项目"
4. 点击 "+" 创建新的App内购买项目

#### 订阅产品配置

创建以下订阅产品（产品ID必须与代码中的配置一致）：

**Premium 月付订阅**
- 产品ID: `cn.jacksonz.zhiweijz.premium.monthly`
- 类型: 自动续期订阅
- 订阅群组: Premium
- 价格: ¥18/月

**Premium 年付订阅**
- 产品ID: `cn.jacksonz.zhiweijz.premium.yearly`
- 类型: 自动续期订阅
- 订阅群组: Premium
- 价格: ¥168/年

**Pro 月付订阅**
- 产品ID: `cn.jacksonz.zhiweijz.pro.monthly`
- 类型: 自动续期订阅
- 订阅群组: Pro
- 价格: ¥38/月

**Pro 年付订阅**
- 产品ID: `cn.jacksonz.zhiweijz.pro.yearly`
- 类型: 自动续期订阅
- 订阅群组: Pro
- 价格: ¥368/年

#### 一次性购买产品（可选）

**Premium 终身版**
- 产品ID: `cn.jacksonz.zhiweijz.premium.lifetime`
- 类型: 非消耗型
- 价格: ¥298

**Pro 终身版**
- 产品ID: `cn.jacksonz.zhiweijz.pro.lifetime`
- 类型: 非消耗型
- 价格: ¥598

### 1.2 配置订阅群组

1. 创建两个订阅群组：
   - Premium: 包含Premium月付和年付
   - Pro: 包含Pro月付和年付

2. 设置升级/降级关系：
   - Premium → Pro: 升级
   - Pro → Premium: 降级

## 2. RevenueCat Dashboard配置

### 2.1 创建项目

1. 登录 [RevenueCat Dashboard](https://app.revenuecat.com)
2. 创建新项目
3. 添加iOS应用，输入Bundle ID: `cn.jacksonz.pwa.twa.zhiweijz`

### 2.2 配置产品

1. 进入 "Products" 页面
2. 导入App Store Connect中创建的产品
3. 确保产品ID完全匹配

### 2.3 配置权益 (Entitlements)

创建以下权益标识符：

```
premium_features      - Premium功能权益
pro_features         - Pro功能权益
unlimited_records    - 无限记账记录
advanced_analytics   - 高级数据分析
data_export         - 数据导出
cloud_sync          - 云端同步
ad_free             - 去除广告
ai_insights         - AI智能分析
budget_advisor      - 预算建议
investment_tracking - 投资追踪
multi_account       - 多账户管理
priority_support    - 优先客服
custom_categories   - 自定义分类
advanced_charts     - 高级图表
```

### 2.4 配置Offerings

1. 创建默认Offering: `default`
2. 添加Package：
   - `premium_monthly`: Premium月付
   - `premium_yearly`: Premium年付
   - `pro_monthly`: Pro月付
   - `pro_yearly`: Pro年付

### 2.5 获取API密钥

1. 进入 "API keys" 页面
2. 复制以下密钥：
   - Public API Key (用于客户端)
   - Secret API Key (用于服务端)
   - Webhook Secret (用于webhook验证)

### 2.6 配置Webhook

1. 进入 "Integrations" → "Webhooks"
2. 添加新的Webhook URL: `https://your-domain.com/api/webhooks/revenuecat`
3. 选择要接收的事件类型：
   - Initial Purchase
   - Renewal
   - Cancellation
   - Uncancellation
   - Expiration
   - Product Change
   - Billing Issue

## 3. 应用代码配置

### 3.1 环境变量配置

复制 `.env.example` 到 `.env.local` 并填入实际值：

```bash
# RevenueCat API密钥
NEXT_PUBLIC_REVENUECAT_API_KEY=your_public_api_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
REVENUECAT_REST_API_KEY=your_rest_api_key_here
```

### 3.2 产品ID验证

确保 `apps/web/src/config/app-store-products.ts` 中的产品ID与App Store Connect中的完全一致。

### 3.3 权益配置验证

确保 `ENTITLEMENTS` 常量中的权益标识符与RevenueCat Dashboard中的配置一致。

## 4. 测试配置

### 4.1 沙盒测试

1. 在App Store Connect中创建沙盒测试用户
2. 在iOS设备上登录沙盒账户
3. 在应用中测试购买流程

### 4.2 Webhook测试

1. 使用ngrok等工具暴露本地开发服务器
2. 在RevenueCat Dashboard中配置测试Webhook URL
3. 进行测试购买，验证webhook是否正常接收

### 4.3 功能测试清单

- [ ] 产品列表正常加载
- [ ] 购买流程正常完成
- [ ] 会员状态正确更新
- [ ] 权益正确激活
- [ ] 恢复购买功能正常
- [ ] 订阅续费正常
- [ ] 取消订阅功能正常
- [ ] Webhook事件正确处理

## 5. 生产环境部署

### 5.1 环境变量

确保生产环境中设置了正确的环境变量：

```bash
NEXT_PUBLIC_REVENUECAT_API_KEY=prod_api_key
REVENUECAT_WEBHOOK_SECRET=prod_webhook_secret
REVENUECAT_REST_API_KEY=prod_rest_api_key
NODE_ENV=production
```

### 5.2 Webhook URL

更新RevenueCat Dashboard中的Webhook URL为生产环境地址：
`https://your-production-domain.com/api/webhooks/revenuecat`

### 5.3 App Store审核

1. 确保所有产品都已提交审核并获得批准
2. 应用版本包含完整的购买功能
3. 提供测试账户给Apple审核团队

## 6. 监控和维护

### 6.1 RevenueCat Dashboard监控

定期检查以下指标：
- 订阅转化率
- 流失率
- 收入趋势
- 错误日志

### 6.2 应用日志监控

监控以下日志：
- 支付初始化错误
- 购买失败事件
- Webhook处理错误
- 会员状态同步问题

### 6.3 用户反馈

建立用户反馈渠道，及时处理：
- 购买问题
- 恢复购买失败
- 会员权益异常
- 订阅管理问题

## 7. 常见问题

### Q: 产品列表为空
A: 检查产品ID是否与App Store Connect中的一致，确保产品已通过审核。

### Q: 购买失败
A: 检查沙盒测试账户设置，确保RevenueCat API密钥正确。

### Q: Webhook未接收到事件
A: 验证Webhook URL是否可访问，检查签名验证逻辑。

### Q: 会员状态未更新
A: 检查用户ID映射逻辑，确保数据库更新正常。

## 8. 支持资源

- [RevenueCat文档](https://docs.revenuecat.com/)
- [App Store Connect帮助](https://help.apple.com/app-store-connect/)
- [Capacitor文档](https://capacitorjs.com/docs)
- [项目GitHub Issues](https://github.com/your-repo/issues)

---

配置完成后，您的应用将具备完整的App内购买和订阅功能。如有问题，请参考上述文档或联系开发团队。
