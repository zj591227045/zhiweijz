# 微信集成快速启动指南

## 概述

只为记账系统现在支持微信服务号集成功能。当微信配置未设置时，系统会正常启动但微信功能将被禁用。

## 当前状态

✅ **系统正常运行** - 服务器已启动，所有核心功能正常
⚠️ **微信功能未启用** - 需要配置微信相关参数才能使用微信集成功能

## 检查服务状态

访问健康检查端点查看当前状态：

```bash
curl http://localhost:3000/api/wechat/health
```

响应示例：
```json
{
  "status": "ok",
  "service": "wechat-integration", 
  "enabled": false,
  "message": "微信服务未配置",
  "timestamp": "2025-06-17T05:46:15.238Z"
}
```

## 启用微信功能

### 1. 获取微信公众号配置

首先需要在微信公众平台获取以下信息：

- **AppID** - 应用ID
- **AppSecret** - 应用密钥  
- **Token** - 自定义令牌
- **EncodingAESKey** - 消息加解密密钥（可选）

### 2. 配置环境变量

在项目根目录的 `.env` 文件中添加以下配置：

```bash
# 微信公众号配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_TOKEN=your_wechat_token
WECHAT_ENCODING_AES_KEY=your_encoding_aes_key
```

### 3. 重启服务

配置完成后重启服务器：

```bash
# 停止当前服务（Ctrl+C）
# 重新启动
npm run dev
```

### 4. 验证配置

重启后检查日志输出，应该看到：

```
✅ 微信服务已启用
```

再次访问健康检查端点：

```bash
curl http://localhost:3000/api/wechat/health
```

响应应该显示：
```json
{
  "status": "ok",
  "service": "wechat-integration",
  "enabled": true,
  "message": "微信服务已启用",
  "timestamp": "..."
}
```

## 微信公众平台配置

### 1. 设置服务器URL

在微信公众平台的"开发" -> "基本配置"中设置：

- **服务器URL**: `https://your-domain.com/api/wechat/callback`
- **Token**: 与环境变量中的 `WECHAT_TOKEN` 保持一致
- **EncodingAESKey**: 与环境变量中的 `WECHAT_ENCODING_AES_KEY` 保持一致

### 2. 验证服务器

点击"提交"按钮进行服务器验证。验证成功后启用服务器配置。

## 功能测试

### 1. 关注测试

使用微信扫码关注服务号，应该收到欢迎消息。

### 2. 基本命令测试

发送以下命令测试功能：

- `帮助` - 查看使用说明
- `绑定账号` - 获取绑定指南
- `健康检查` - 测试服务状态

### 3. 记账功能测试

绑定账号后测试智能记账：

- `50 餐饮 午餐`
- `地铁 5元`
- `工资 8000`

## 开发工具

### 本地开发

```bash
# 启动开发环境（包含环境检查）
npm run wechat:dev

# 运行集成测试
npm run wechat:test

# 清理过期日志
npm run wechat:cleanup
```

### 调试工具

```bash
# 查看微信服务状态
curl http://localhost:3000/api/wechat/health

# 测试微信验证（需要正确的签名参数）
curl "http://localhost:3000/api/wechat/verify?signature=xxx&timestamp=xxx&nonce=xxx&echostr=test"
```

## 常见问题

### Q: 服务器启动时显示"微信配置未设置"

**A**: 这是正常的警告信息。系统会继续运行，只是微信功能被禁用。按照上述步骤配置微信参数即可启用。

### Q: 配置后仍显示未启用

**A**: 检查以下几点：
1. 环境变量名称是否正确
2. 环境变量值是否包含 `your_` 前缀（需要替换为实际值）
3. 是否重启了服务器
4. 检查 `.env` 文件是否在正确位置

### Q: 微信验证失败

**A**: 检查以下几点：
1. Token 配置是否与微信公众平台一致
2. 服务器URL是否可以从外网访问
3. 是否使用了HTTPS（生产环境必需）

### Q: 消息处理异常

**A**: 查看服务器日志：
1. 检查数据库连接是否正常
2. 检查AI服务配置是否正确
3. 查看错误日志获取详细信息

## 技术支持

如需更多帮助，请参考：

- **完整部署指南**: `docs/wechat_integration/deployment_guide.md`
- **API集成文档**: `docs/wechat_integration/api_integration.md`
- **项目总结**: `docs/wechat_integration/project_summary.md`

或联系技术支持团队。

## 安全提醒

⚠️ **重要**: 
- 不要将微信AppSecret等敏感信息提交到版本控制系统
- 生产环境必须使用HTTPS
- 定期轮换密钥和令牌
- 监控异常访问和错误日志
