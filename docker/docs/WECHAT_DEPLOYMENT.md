# 微信公众号 Docker 部署指南

本文档说明如何在 Docker 环境中配置和部署微信公众号功能。

## 📋 前置条件

1. **微信公众号要求**
   - 已认证的微信服务号
   - 获取以下配置信息：
     - AppID (应用ID)
     - AppSecret (应用密钥)
     - Token (自定义令牌)
     - EncodingAESKey (消息加解密密钥)

2. **服务器要求**
   - Docker 和 Docker Compose 已安装
   - 域名和 SSL 证书（微信要求 HTTPS）
   - 80 和 443 端口可用

## 🔧 配置步骤

### 1. 准备环境变量文件

复制环境变量模板：
```bash
cd docker
cp .env.example .env
```

### 2. 编辑 .env 文件

修改 `docker/.env` 文件，填入您的微信公众号配置：

```env
# Nginx 端口配置
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

# 数据库配置
DB_NAME=zhiweijz
DB_USER=zhiweijz
DB_PASSWORD=your_secure_password_here

# JWT 密钥（生产环境请修改）
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# 微信公众号配置
WECHAT_APP_ID=wx2d718d1dbb17cb2c
WECHAT_APP_SECRET=b86731284f658593a7de429688a060c4
WECHAT_TOKEN=9qYGygO6oXGziR
WECHAT_ENCODING_AES_KEY=TOQB1x5YOBHzvEOtFSVwDKufEzmr6bY0JQ0O3EasxJb
```

### 3. 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend
```

### 4. 验证微信配置

检查微信服务是否正常启动：

```bash
# 检查微信健康状态
curl http://localhost:3000/api/wechat/health

# 预期响应
{
  "status": "ok",
  "service": "wechat-integration",
  "enabled": true,
  "message": "微信服务已启用"
}
```

## 🔒 安全配置

### 1. 修改默认密码

**重要**：生产环境中必须修改以下默认配置：

```env
# 使用强密码
DB_PASSWORD=your_very_secure_database_password

# 使用随机生成的 JWT 密钥
JWT_SECRET=your_random_jwt_secret_at_least_32_characters_long
```

### 2. SSL 证书配置

确保您的域名配置了有效的 SSL 证书，微信公众号要求使用 HTTPS。

### 3. 防火墙配置

只开放必要的端口：
- 80 (HTTP，用于重定向到 HTTPS)
- 443 (HTTPS)
- 22 (SSH，仅限管理)

## 🚀 微信公众号配置

### 1. 设置服务器配置

在微信公众平台后台：

1. 进入"设置与开发 → 基本配置"
2. 填写服务器配置：
   - **URL**: `https://your-domain.com/api/wechat/callback`
   - **Token**: 与 `.env` 文件中的 `WECHAT_TOKEN` 一致
   - **EncodingAESKey**: 与 `.env` 文件中的 `WECHAT_ENCODING_AES_KEY` 一致
   - **消息加解密方式**: 安全模式（推荐）

### 2. 验证服务器

点击"提交"后，微信会向您的服务器发送验证请求。如果配置正确，会显示"配置成功"。

## 🔍 故障排除

### 1. 微信服务未启用

如果看到 "微信配置未设置，微信功能将被禁用" 的警告：

1. 检查 `.env` 文件中的微信配置是否正确
2. 重启 Docker 容器：
   ```bash
   docker-compose restart backend
   ```

### 2. 验证失败

如果微信服务器验证失败：

1. 检查域名是否可以正常访问
2. 确认 SSL 证书有效
3. 检查防火墙设置
4. 查看后端日志：
   ```bash
   docker-compose logs backend | grep -i wechat
   ```

### 3. 常见错误

**错误**: `curl: (7) Failed to connect`
**解决**: 检查服务是否正常启动，端口是否正确

**错误**: `微信配置未设置`
**解决**: 确认环境变量已正确设置并重启容器

## 📝 维护

### 1. 更新配置

修改 `.env` 文件后，需要重启相关服务：

```bash
docker-compose restart backend
```

### 2. 查看日志

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs nginx

# 实时查看日志
docker-compose logs -f backend
```

### 3. 备份配置

定期备份您的 `.env` 文件和重要配置。

## 📞 支持

如果遇到问题，请检查：

1. Docker 服务是否正常运行
2. 环境变量配置是否正确
3. 网络连接是否正常
4. 微信公众号配置是否匹配

更多技术支持，请参考项目文档或联系技术支持团队。
