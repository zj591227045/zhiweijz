# iOS支付功能测试指南

## 问题诊断步骤

### 1. 访问测试页面
在iOS设备上访问：`/payment-test` 页面

### 2. 检查诊断结果
页面会自动运行诊断，检查以下项目：

#### 平台检查
- ✅ 运行环境应该显示 "ios (原生应用)"
- ❌ 如果显示 "web (Web环境)"，说明不在iOS应用中

#### 配置检查
- ✅ RevenueCat API密钥已配置
- ✅ 产品配置有效
- ❌ 如果显示错误，需要检查环境变量

#### 初始化检查
- ✅ RevenueCat已初始化
- ❌ 如果未初始化，点击"尝试初始化"按钮

#### 产品加载检查
- ✅ 已加载产品套餐
- ❌ 如果没有产品，检查App Store Connect配置

#### 网络连接检查
- ✅ RevenueCat API连接正常
- ❌ 如果连接失败，检查网络和API密钥

## 常见问题及解决方案

### 问题1: 按钮无法点击（灰色状态）
**原因**: `isInitialized = false`

**解决方案**:
1. 检查RevenueCat API密钥是否正确配置
2. 点击诊断页面的"尝试初始化"按钮
3. 查看控制台错误日志

### 问题2: 点击购买没有反应
**原因**: 产品ID不匹配或App Store Connect配置问题

**解决方案**:
1. 确认App Store Connect中已创建对应产品
2. 检查产品ID是否完全匹配
3. 确认产品状态为"准备提交"或"已批准"

### 问题3: 购买失败错误
**原因**: 沙盒账户或网络问题

**解决方案**:
1. 确认使用沙盒测试账户
2. 检查网络连接
3. 重启应用重试

## 完整测试流程

### 准备工作
1. **RevenueCat配置**
   ```
   NEXT_PUBLIC_REVENUECAT_API_KEY=appl_xxxxxxxxxx
   ```

2. **App Store Connect产品**
   - cn.jacksonz.zhiweijz.donation.one.monthly
   - cn.jacksonz.zhiweijz.donation.two.monthly  
   - cn.jacksonz.zhiweijz.donation.three.monthly
   - cn.jacksonz.zhiweijz.donation.one.yearly
   - cn.jacksonz.zhiweijz.donation.two.yearly
   - cn.jacksonz.zhiweijz.donation.three.yearly

3. **沙盒测试账户**
   - 在App Store Connect中创建
   - 在iOS设备上登录沙盒账户

### 测试步骤

#### 步骤1: 基础检查
1. 打开应用，访问 `/payment-test` 页面
2. 查看诊断结果，确保所有项目为绿色✅
3. 如有红色❌项目，按照提示修复

#### 步骤2: 初始化测试
1. 确认"RevenueCat初始化"状态为✅
2. 如果为❌，点击"尝试初始化"按钮
3. 查看初始化日志

#### 步骤3: 产品加载测试
1. 确认"产品套餐"显示已加载产品
2. 检查产品数量是否正确（应该有6个产品）

#### 步骤4: 购买流程测试
1. 点击"测试 PaymentModal"按钮
2. 选择任意产品进行购买
3. 确认弹出App Store购买对话框
4. 使用沙盒账户完成购买

#### 步骤5: 恢复购买测试
1. 点击"测试恢复购买"按钮
2. 确认能够恢复之前的购买

## 调试信息收集

如果测试失败，请收集以下信息：

### 1. 诊断结果截图
- 完整的诊断页面截图
- 特别注意红色❌的项目

### 2. 控制台日志
```javascript
// 在Safari开发者工具中运行
console.log('Platform:', window.Capacitor?.getPlatform());
console.log('Is Native:', window.Capacitor?.isNativePlatform());
console.log('Environment:', process.env.NODE_ENV);
```

### 3. 网络请求日志
- 查看Network标签页
- 检查RevenueCat API请求状态

### 4. 错误信息
- 任何弹出的错误对话框
- 控制台中的错误日志
- 测试日志中的错误信息

## 环境变量配置

确保以下环境变量正确配置：

```bash
# .env.local
NEXT_PUBLIC_REVENUECAT_API_KEY=appl_xxxxxxxxxx
NEXT_PUBLIC_IS_MOBILE=true
NODE_ENV=development
```

## 联系支持

如果按照以上步骤仍无法解决问题，请提供：
1. 诊断结果截图
2. 控制台错误日志
3. 设备信息（iOS版本、设备型号）
4. 测试账户信息（不包含密码）

## 快速检查清单

- [ ] iOS设备上运行原生应用
- [ ] RevenueCat API密钥已配置
- [ ] App Store Connect产品已创建
- [ ] 沙盒测试账户已设置
- [ ] 网络连接正常
- [ ] 应用已重新构建并安装
- [ ] 诊断页面所有项目为绿色
- [ ] 购买按钮可点击（非灰色状态）
