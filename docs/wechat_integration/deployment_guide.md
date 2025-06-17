# 微信服务号集成部署指南

## 概述

本文档详细说明如何将微信服务号与只为记账后端集成功能部署到生产环境。

## 前置条件

### 1. 微信公众平台配置

1. **注册微信服务号**
   - 访问 [微信公众平台](https://mp.weixin.qq.com/)
   - 注册服务号（需要企业资质）
   - 完成认证流程

2. **获取开发者信息**
   - 登录微信公众平台
   - 进入"开发" -> "基本配置"
   - 记录以下信息：
     - AppID (应用ID)
     - AppSecret (应用密钥)
     - 设置服务器配置的Token

3. **配置服务器URL**
   - 服务器URL: `https://your-domain.com/api/wechat/callback`
   - Token: 自定义字符串（与环境变量保持一致）
   - EncodingAESKey: 可选，用于消息加解密

### 2. 服务器环境要求

- Node.js 16.x 或更高版本
- PostgreSQL 12.x 或更高版本
- SSL证书（微信要求HTTPS）
- 域名（用于微信回调）

## 部署步骤

### 1. 环境变量配置

创建生产环境配置文件 `.env.production`:

```bash
# 数据库配置
DATABASE_URL=postgresql://username:password@localhost:5432/zhiweijz?schema=public

# JWT配置
JWT_SECRET=your_production_jwt_secret_key
JWT_EXPIRES_IN=7d

# 微信公众号配置
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_TOKEN=your_wechat_token
WECHAT_ENCODING_AES_KEY=your_encoding_aes_key

# 服务器配置
PORT=3000
NODE_ENV=production

# OpenAI配置（用于智能记账）
OPENAI_API_KEY=your_openai_api_key

# 邮件配置（可选）
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
```

### 2. 数据库迁移

```bash
# 运行数据库迁移
npm run migrate:upgrade

# 验证迁移结果
npm run migrate:status
```

### 3. 构建和启动服务

```bash
# 安装依赖
npm ci --production

# 构建项目
npm run build

# 启动服务
npm start
```

### 4. 使用PM2部署（推荐）

```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'zhiweijz-server',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save
```

### 5. Nginx反向代理配置

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    location /api/wechat/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # 微信回调超时设置
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 验证部署

### 1. 运行集成测试

```bash
# 设置测试环境变量
export TEST_BASE_URL=https://your-domain.com
export WECHAT_TOKEN=your_wechat_token

# 运行测试脚本
node scripts/test-wechat-integration.js
```

### 2. 微信公众平台验证

1. 在微信公众平台配置服务器URL
2. 点击"提交"进行验证
3. 验证成功后启用服务器配置

### 3. 功能测试

1. **关注测试**
   - 使用微信扫码关注服务号
   - 验证是否收到欢迎消息

2. **绑定测试**
   - 发送"绑定账号"
   - 按提示完成账号绑定流程

3. **记账测试**
   - 发送记账信息，如"50 餐饮 午餐"
   - 验证智能记账功能是否正常

## 监控和维护

### 1. 日志监控

```bash
# 查看PM2日志
pm2 logs zhiweijz-server

# 查看错误日志
pm2 logs zhiweijz-server --err

# 实时监控
pm2 monit
```

### 2. 性能监控

```bash
# 查看应用状态
pm2 status

# 查看详细信息
pm2 show zhiweijz-server
```

### 3. 数据库维护

```bash
# 清理过期的微信消息日志（保留30天）
curl -X POST https://your-domain.com/api/wechat/cleanup-logs \
  -H "Authorization: Bearer your_admin_token" \
  -H "Content-Type: application/json" \
  -d '{"retentionDays": 30}'
```

### 4. 健康检查

```bash
# 检查服务状态
curl https://your-domain.com/api/wechat/health

# 检查微信服务状态
curl -H "Authorization: Bearer your_admin_token" \
  https://your-domain.com/api/wechat/status
```

## 故障排除

### 1. 微信验证失败

- 检查Token配置是否正确
- 确认服务器URL可访问
- 验证SSL证书是否有效

### 2. 消息处理异常

- 查看应用日志
- 检查数据库连接
- 验证AI服务配置

### 3. 性能问题

- 监控服务器资源使用
- 检查数据库查询性能
- 考虑增加服务器实例

## 安全建议

1. **定期更新依赖**
   ```bash
   npm audit
   npm update
   ```

2. **备份数据库**
   ```bash
   pg_dump zhiweijz > backup_$(date +%Y%m%d).sql
   ```

3. **监控异常访问**
   - 设置访问频率限制
   - 监控异常IP访问
   - 定期检查错误日志

4. **密钥管理**
   - 定期轮换JWT密钥
   - 保护微信AppSecret
   - 使用环境变量存储敏感信息

## 扩展功能

### 1. 自定义菜单设置

```bash
# 设置微信自定义菜单
curl -X POST https://your-domain.com/api/wechat/menu \
  -H "Authorization: Bearer your_admin_token"
```

### 2. 消息模板配置

根据业务需求配置微信消息模板，用于主动推送记账提醒等功能。

### 3. 多账本支持

扩展支持用户在微信中管理多个账本，快速切换记账目标。

## 联系支持

如遇到部署问题，请联系技术支持团队或查看项目文档。
