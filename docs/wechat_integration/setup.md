# 微信公众号集成环境配置指南

本文档详细说明配置微信公众号与只为记账系统集成所需的环境准备工作。

## 前置条件

1. **微信公众号要求**
   - 已认证的企业服务号
   - 具备消息与菜单配置权限
   - 已获取以下关键信息：
     - AppID
     - AppSecret
     - Token（自定义）
     - EncodingAESKey（消息加解密密钥）

2. **服务器要求**
   - 已完成域名备案
   - 支持HTTPS访问
   - 固定IP地址
   - 80和443端口可用

3. **只为记账平台**
   - 已注册开发者账号
   - 已获取API访问权限
   - 具备测试环境账号

## 配置步骤

### 1. 服务器配置

```bash
# 安装必要的SSL证书
sudo apt-get update
sudo apt-get install nginx
sudo apt-get install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com
```

### 2. 微信公众号配置

1. 登录微信公众平台
2. 进入"设置与开发 → 基本配置"
3. 配置服务器：
   - URL: `https://your-domain.com/wechat/callback`
   - Token: 自定义的Token值
   - EncodingAESKey: 自动生成或自定义
   - 消息加解密方式: 安全模式（推荐）

### 3. 数据库配置

```sql
-- 创建用户绑定表
CREATE TABLE user_bindings (
    id SERIAL PRIMARY KEY,
    openid VARCHAR(50) NOT NULL,
    zhiwei_account VARCHAR(100) NOT NULL,
    default_book_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(openid)
);

-- 创建消息记录表
CREATE TABLE message_logs (
    id SERIAL PRIMARY KEY,
    openid VARCHAR(50) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    content TEXT,
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### 4. 环境变量配置

创建 `.env` 文件：

```env
# 微信公众号配置
WECHAT_APP_ID=your_app_id
WECHAT_APP_SECRET=your_app_secret
WECHAT_TOKEN=your_token
WECHAT_ENCODING_AES_KEY=your_encoding_aes_key

# 只为记账API配置
ZHIWEI_API_KEY=your_api_key
ZHIWEI_API_SECRET=your_api_secret
ZHIWEI_API_BASE_URL=https://api.zhiwei.com/v1

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=wechat_integration
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# 服务器配置
PORT=3000
NODE_ENV=production
```

### 5. 验证配置

1. **验证服务器配置**
   ```bash
   # 测试 Nginx 配置
   sudo nginx -t
   
   # 测试 SSL 证书
   curl https://your-domain.com
   ```

2. **验证微信接入**
   - 保存配置后，微信会发送一个验证请求
   - 确认收到成功返回信息

3. **验证数据库连接**
   ```bash
   # 测试数据库连接
   psql -h localhost -U your_db_user -d wechat_integration
   ```

## 安全注意事项

1. **密钥保护**
   - 所有密钥和敏感信息必须加密存储
   - 不要在代码中硬编码任何密钥
   - 定期轮换密钥

2. **访问控制**
   - 配置防火墙规则
   - 限制数据库访问IP
   - 使用最小权限原则

3. **日志记录**
   - 记录所有API调用
   - 记录用户操作日志
   - 设置日志轮转策略

## 故障排查

1. **常见问题**
   - 微信回调URL无法访问
   - SSL证书过期
   - 数据库连接失败
   - API调用超时

2. **排查步骤**
   - 检查服务器日志
   - 验证网络连接
   - 确认配置文件正确性
   - 测试API连通性

## 下一步

完成环境配置后，请继续参考 `menu_config.md` 进行微信公众号菜单配置。