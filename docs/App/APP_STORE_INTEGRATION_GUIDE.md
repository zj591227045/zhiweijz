# App Store 集成详细指南

本指南将详细说明如何将您的应用与App Store Connect集成，实现App内购买和订阅功能。

## 1. App Store Connect 基础概念

### 1.1 什么是App Store Connect？
App Store Connect是苹果提供的开发者平台，用于：
- 管理应用信息和版本
- 配置App内购买产品
- 查看销售和分析数据
- 管理用户和权限

### 1.2 App内购买类型
- **消耗型产品**: 用户可以多次购买（如游戏币）
- **非消耗型产品**: 用户只需购买一次（如去除广告）
- **自动续期订阅**: 定期自动扣费（如会员服务）
- **非续期订阅**: 固定时长，不自动续费

## 2. 前期准备工作

### 2.1 开发者账户要求
1. **Apple Developer Program 会员资格**
   - 个人开发者: $99/年
   - 企业开发者: $299/年
   - 必须有有效的信用卡和银行账户

2. **税务和银行信息**
   - 在App Store Connect中完成税务信息
   - 设置银行账户信息用于收款
   - 签署相关协议

### 2.2 应用基础信息
1. **Bundle ID**: `cn.jacksonz.pwa.twa.zhiweijz`
2. **应用名称**: 只为记账
3. **应用类别**: 财务
4. **年龄分级**: 4+（适合所有年龄）

## 3. 在App Store Connect中创建产品

### 3.1 登录和导航
1. 访问 [App Store Connect](https://appstoreconnect.apple.com)
2. 使用Apple ID登录
3. 选择您的应用
4. 点击左侧菜单 "功能" → "App内购买项目"

### 3.2 创建订阅群组
在创建订阅产品之前，需要先创建订阅群组：

1. 点击 "订阅群组" 标签
2. 点击 "+" 创建新群组
3. 创建三个群组：
   - **捐赠会员壹群组**: 包含捐赠会员（壹）月付和年付
   - **捐赠会员贰群组**: 包含捐赠会员（贰）月付和年付
   - **捐赠会员叁群组**: 包含捐赠会员（叁）月付和年付

### 3.3 创建订阅产品

#### 捐赠会员（壹）月付
1. 点击 "+" → "自动续期订阅"
2. 填写基本信息：
   ```
   产品ID: cn.jacksonz.zhiweijz.donation.one.monthly
   引用名称: Donation Member One Monthly
   订阅群组: 捐赠会员壹群组
   ```
3. 设置价格：
   ```
   价格等级: 选择对应¥5的等级
   或自定义价格: ¥5.00
   ```
4. 本地化信息（中文）：
   ```
   显示名称: 捐赠会员（壹）月付
   描述: 1000点/月会员记账点，支持应用发展
   ```

#### 捐赠会员（贰）月付
```
产品ID: cn.jacksonz.zhiweijz.donation.two.monthly
引用名称: Donation Member Two Monthly
订阅群组: 捐赠会员贰群组
价格: ¥10.00
显示名称: 捐赠会员（贰）月付
描述: 1000点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权
```

#### 捐赠会员（叁）月付
```
产品ID: cn.jacksonz.zhiweijz.donation.three.monthly
引用名称: Donation Member Three Monthly
订阅群组: 捐赠会员叁群组
价格: ¥15.00
显示名称: 捐赠会员（叁）月付
描述: 1000点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权，优先客服支持
```

#### 年费捐赠会员（壹）
```
产品ID: cn.jacksonz.zhiweijz.donation.one.yearly
引用名称: Donation Member One Yearly
订阅群组: 捐赠会员壹群组
价格: ¥55.00
显示名称: 年费捐赠会员（壹）
描述: 1500点/月会员记账点，年付更优惠
```

#### 年费捐赠会员（贰）
```
产品ID: cn.jacksonz.zhiweijz.donation.two.yearly
引用名称: Donation Member Two Yearly
订阅群组: 捐赠会员贰群组
价格: ¥110.00
显示名称: 年费捐赠会员（贰）
描述: 1500点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权，年付更优惠
```

#### 年费捐赠会员（叁）
```
产品ID: cn.jacksonz.zhiweijz.donation.three.yearly
引用名称: Donation Member Three Yearly
订阅群组: 捐赠会员叁群组
价格: ¥165.00
显示名称: 年费捐赠会员（叁）
描述: 1500点/月会员记账点，50%费用（税后）用于公益事业，并获取署名权，优先客服支持，年付更优惠
```

### 3.4 配置订阅关系
1. 在订阅群组中设置升级/降级关系
2. 捐赠会员（壹） → 捐赠会员（贰）: 升级
3. 捐赠会员（贰） → 捐赠会员（叁）: 升级
4. 捐赠会员（叁） → 捐赠会员（贰）: 降级
5. 捐赠会员（贰） → 捐赠会员（壹）: 降级
6. 同群组内月付 ↔ 年付: 横向变更

## 4. RevenueCat 配置

### 4.1 为什么使用RevenueCat？
RevenueCat是第三方订阅管理平台，提供：
- 跨平台订阅管理（iOS、Android、Web）
- 实时订阅状态同步
- 详细的分析和报告
- Webhook事件通知
- 简化的API接口

### 4.2 创建RevenueCat项目
1. 访问 [RevenueCat](https://app.revenuecat.com)
2. 注册账户并创建新项目
3. 添加iOS应用：
   ```
   App Name: 只为记账
   Bundle ID: cn.jacksonz.pwa.twa.zhiweijz
   ```

### 4.3 连接App Store Connect
1. 在RevenueCat中进入 "App settings" → "Apple App Store"
2. 上传App Store Connect API密钥：
   - 在App Store Connect中生成API密钥
   - 下载.p8文件并上传到RevenueCat
   - 填写Issuer ID和Key ID

### 4.4 导入产品
1. 在RevenueCat中进入 "Products"
2. 点击 "Import from App Store Connect"
3. 选择并导入所有创建的订阅产品
4. 验证产品ID是否正确匹配

### 4.5 配置权益 (Entitlements)
在RevenueCat中创建权益标识符：
```
donation_one_features - 捐赠会员（壹）功能权益
donation_two_features - 捐赠会员（贰）功能权益
donation_three_features - 捐赠会员（叁）功能权益
monthly_points_1000 - 1000点/月会员记账点
monthly_points_1500 - 1500点/月会员记账点（年费）
charity_attribution - 公益署名权
priority_support - 优先客服支持
```

**基础功能（无需配置）**：
以下功能所有用户都可使用，无需在RevenueCat中配置权益：
- AI智能记账
- 高级统计分析
- 去除广告
- 数据导出
- 云端同步

### 4.6 配置Offerings
1. 创建默认Offering: `default`
2. 添加Packages：
   - `donation_one_monthly`: 捐赠会员（壹）月付
   - `donation_two_monthly`: 捐赠会员（贰）月付
   - `donation_three_monthly`: 捐赠会员（叁）月付
   - `donation_one_yearly`: 年费捐赠会员（壹）
   - `donation_two_yearly`: 年费捐赠会员（贰）
   - `donation_three_yearly`: 年费捐赠会员（叁）

## 5. 代码集成

### 5.1 安装依赖
```bash
cd apps/web
npm install @revenuecat/purchases-capacitor
```

### 5.2 环境变量配置
在 `apps/web/.env.local` 中添加：
```bash
NEXT_PUBLIC_REVENUECAT_API_KEY=your_public_api_key_here
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_here
```

### 5.3 初始化支付系统
在应用启动时初始化：
```typescript
import { mobilePaymentService, REVENUECAT_CONFIG } from './lib/payment';

// 在应用启动时调用
await mobilePaymentService.initialize(REVENUECAT_CONFIG.apiKey);
```

### 5.4 使用支付组件
```typescript
import { PaymentModal } from './components/PaymentModal';

function App() {
  const [showPayment, setShowPayment] = useState(false);
  
  return (
    <div>
      <button onClick={() => setShowPayment(true)}>
        升级会员
      </button>
      
      <PaymentModal
        isOpen={showPayment}
        onClose={() => setShowPayment(false)}
        onSuccess={(level) => {
          console.log('购买成功:', level);
        }}
      />
    </div>
  );
}
```

## 6. 测试流程

### 6.1 沙盒测试
1. **创建沙盒测试账户**
   - 在App Store Connect中创建测试用户
   - 使用不同的邮箱地址
   - 设置测试地区为中国

2. **设备配置**
   - 在iOS设备上退出App Store账户
   - 不要在设置中登录沙盒账户
   - 只在购买时登录沙盒账户

3. **测试购买流程**
   - 启动应用并触发购买
   - 使用沙盒账户登录
   - 完成购买流程
   - 验证会员状态更新

### 6.2 验证清单
- [ ] 产品列表正确显示
- [ ] 价格信息准确
- [ ] 购买流程顺畅
- [ ] 会员状态正确更新
- [ ] 权益正确激活
- [ ] 恢复购买功能正常
- [ ] 订阅管理正常

## 7. 上线准备

### 7.1 App Store审核准备
1. **完善应用信息**
   - 应用描述中说明订阅功能
   - 提供隐私政策和服务条款
   - 准备应用截图和预览视频

2. **审核注意事项**
   - 确保所有产品都可以正常购买
   - 提供测试账户给审核团队
   - 说明订阅的价值和功能

### 7.2 生产环境配置
1. 更新环境变量为生产值
2. 配置生产环境Webhook URL
3. 验证所有产品状态为"准备提交"

## 8. 监控和维护

### 8.1 关键指标监控
- 订阅转化率
- 用户留存率
- 收入趋势
- 退款率

### 8.2 常见问题处理
- 购买失败处理
- 恢复购买问题
- 订阅状态同步
- 用户反馈处理

## 9. 总结

App Store集成是一个复杂但重要的过程，需要：
1. 在App Store Connect中正确配置产品
2. 使用RevenueCat简化订阅管理
3. 在应用中正确集成支付功能
4. 充分测试所有功能
5. 准备App Store审核
6. 持续监控和优化

按照本指南逐步操作，您就能成功集成App内购买功能。如有问题，请参考相关文档或联系技术支持。

## 10. 快速开始清单

### 第一步：App Store Connect配置 (1-2小时)
- [ ] 登录App Store Connect
- [ ] 创建订阅群组 (捐赠会员壹、贰、叁)
- [ ] 创建6个订阅产品
- [ ] 设置价格和本地化信息
- [ ] 提交产品审核

### 第二步：RevenueCat配置 (30分钟)
- [ ] 注册RevenueCat账户
- [ ] 创建项目并连接App Store
- [ ] 导入产品
- [ ] 配置权益和Offerings
- [ ] 获取API密钥

### 第三步：代码集成 (已完成)
- [x] 支付模块已创建在 `zhiweijz-payment-premium`
- [x] 在 `apps/web` 中可通过 `import { ... } from './lib/payment'` 使用
- [x] 支付组件 `PaymentModal` 已创建

### 第四步：环境配置 (5分钟)
- [ ] 复制 `.env.example` 到 `.env.local`
- [ ] 填入RevenueCat API密钥
- [ ] 配置其他环境变量

### 第五步：测试 (1小时)
- [ ] 创建沙盒测试账户
- [ ] 在iOS设备上测试购买
- [ ] 验证所有功能正常

### 第六步：上线 (等待审核)
- [ ] 提交应用审核
- [ ] 等待苹果审核通过
- [ ] 发布应用

**预计总时间：3-4小时 + 审核等待时间**
