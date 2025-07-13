# 微信测试公众号对接指南

## 概述

为了在不影响正式环境的情况下开发微信语音和图片记账功能，我们将使用微信测试公众号进行开发调试。

## 已实现的功能

✅ **语音记账** - 支持发送语音消息进行智能记账
✅ **图片记账** - 支持发送图片进行智能记账  
✅ **文字记账** - 原有的文字记账功能
✅ **账号绑定** - 微信账号与只为记账账号绑定
✅ **环境隔离** - 开发环境与生产环境完全隔离

## 步骤1：申请微信测试公众号

1. 访问微信公众平台测试账号：https://developers.weixin.qq.com/sandbox
2. 使用微信扫码登录
3. 获取测试号信息：
   - **appID** (测试号)
   - **appsecret** (测试密钥)

## 步骤2：配置开发环境变量

在你的开发环境 `.env` 文件中添加以下配置：

```bash
# 微信开发环境配置
NODE_ENV=development
WECHAT_ENV=development

# 微信测试公众号配置
WECHAT_DEV_APP_ID=你的测试号appID
WECHAT_DEV_APP_SECRET=你的测试号appsecret  
WECHAT_DEV_TOKEN=your_dev_token_here
WECHAT_DEV_ENCODING_AES_KEY=可选，如果不使用加密可以不设置

# 保持生产环境配置不变（如果有的话）
WECHAT_APP_ID=正式公众号的appID
WECHAT_APP_SECRET=正式公众号的appsecret
WECHAT_TOKEN=正式公众号的token
```

**验证配置**：
```bash
cd server
npm run verify-wechat-env
```

这个命令会检查你的环境配置是否正确。

## 步骤3：设置内网穿透

由于微信需要访问你的本地开发服务器，你需要使用内网穿透工具：

### 方案1：使用 ngrok（推荐）

1. 安装 ngrok：
   ```bash
   # macOS
   brew install ngrok
   
   # 或下载：https://ngrok.com/download
   ```

2. 启动内网穿透：
   ```bash
   ngrok http 3000
   ```

3. 获得公网URL，例如：`https://abc123.ngrok.io`

### 方案2：使用其他内网穿透工具

- **花生壳** - https://hsk.oray.com/
- **frp** - 自建内网穿透服务
- **localtunnel** - https://localtunnel.github.io/

## 步骤4：配置微信测试公众号

1. 在测试号管理页面，找到 **接口配置信息**
2. 设置以下信息：
   - **URL**: `https://你的ngrok域名.ngrok.io/api/wechat/callback`
   - **Token**: 与 `WECHAT_DEV_TOKEN` 保持一致
   - **EncodingAESKey**: 可选，留空即可

3. 点击 **提交** 进行验证

## 步骤5：启动开发服务器

```bash
cd server
npm run dev
```

服务器启动后会显示：
- `🧪 使用微信开发环境配置 (测试公众号)` - 说明使用的是开发环境配置
- `✅ 微信服务已启用` - 说明微信服务正常启用

## 步骤6：添加测试用户

1. 在测试号管理页面找到 **测试号二维码**
2. 使用微信扫码关注测试公众号
3. 在 **用户列表** 中可以看到你的微信号

## 步骤7：测试功能

### 7.1 账号绑定测试
1. 关注测试公众号后，发送任意消息
2. 系统会提示进行账号绑定
3. 使用你的只为记账账号登录绑定

### 7.2 文字记账测试
发送消息：`50 餐饮 午餐`

### 7.3 语音记账测试
1. 在微信中录制语音消息
2. 发送包含记账信息的语音，如："花了五十块钱买午餐"
3. 系统会自动识别并创建记账记录

### 7.4 图片记账测试
1. 拍摄或选择包含记账信息的图片（如收据、发票）
2. 发送图片给测试公众号
3. 系统会自动识别图片中的金额和商品信息

## 调试技巧

### 查看日志
```bash
# 实时查看服务器日志
cd server
npm run dev

# 查看微信相关日志
tail -f logs/wechat.log
```

### 调试信息
- 语音消息处理：查找 `🎤 处理语音消息` 日志
- 图片消息处理：查找 `📷 处理图片消息` 日志
- 媒体文件下载：查找 `🔄 开始下载微信媒体文件` 日志

### 常见问题排查

1. **URL验证失败**
   - 检查 ngrok 是否正常运行
   - 确认 Token 配置正确
   - 查看服务器是否启动

2. **语音识别失败**
   - 检查语音文件是否下载成功
   - 确认百度语音识别服务配置
   - 查看临时文件目录权限

3. **图片识别失败**
   - 检查图片URL是否可访问
   - 确认AI视觉识别服务配置
   - 查看图片格式是否支持

## 环境切换

### 开发环境 → 生产环境
```bash
# 设置环境变量
export NODE_ENV=production
export WECHAT_ENV=production

# 或在 .env 中修改
NODE_ENV=production
WECHAT_ENV=production
```

### 强制使用开发环境
```bash
export WECHAT_ENV=development
```

## 注意事项

1. **测试号限制**：
   - 最多100个测试用户
   - 功能有限，部分高级功能不可用
   - 仅用于开发测试

2. **安全考虑**：
   - 开发环境配置不要泄露
   - ngrok URL会变化，需要及时更新
   - 不要在生产环境使用测试配置

3. **数据隔离**：
   - 开发环境数据不会影响生产环境
   - 建议使用单独的测试数据库

## 部署到生产环境

当开发完成后，部署到生产环境只需要：

1. 设置生产环境变量：
   ```bash
   NODE_ENV=production
   WECHAT_ENV=production
   ```

2. 配置正式公众号的回调URL

3. 重启服务，系统会自动切换到生产环境配置

---

## 技术实现说明

### 新增的功能组件

1. **WechatMediaService** - 微信媒体文件下载服务
2. **语音消息处理** - handleVoiceMessage()
3. **图片消息处理** - handleImageMessage()
4. **环境配置隔离** - 开发/生产环境自动切换

### API集成

- **语音记账API**: `/api/ai/smart-accounting/speech`
- **图片记账API**: `/api/ai/smart-accounting/vision`
- **微信消息回调**: `/api/wechat/callback`

这样你就可以在完全隔离的开发环境中测试微信语音和图片记账功能了！