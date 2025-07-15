# 只为记账 Docker 配置指南

## 概述

本指南详细说明了如何配置只为记账的Docker环境，包括核心功能和可选功能的配置方法。

## 配置文件结构

```
docker/
├── .env.example                 # 基础配置模板（核心必需）
├── docker-compose.yml          # Docker编排文件
├── config/                     # 专项配置目录
│   ├── wechat.env.example      # 微信公众号配置
│   ├── email.env.example       # 邮件服务配置
│   ├── ai.env.example          # AI服务配置
│   └── s3.env.example          # 外部S3存储配置
└── verify-env-config.sh        # 配置验证脚本
```

## 快速开始

### 1. 基础配置

```bash
# 1. 复制基础配置文件
cd docker
cp .env.example .env

# 2. 编辑配置文件（必需）
nano .env

# 3. 启动服务
docker-compose up -d

# 4. 验证配置
chmod +x verify-env-config.sh
./verify-env-config.sh
```

### 2. 必需修改的配置项

在 `.env` 文件中，以下配置项**必须**根据实际情况修改：

```bash
# 数据库密码（生产环境必须修改）
DB_PASSWORD=your_secure_password

# JWT密钥（生产环境必须修改）
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# MinIO密码（生产环境必须修改）
MINIO_ROOT_PASSWORD=your_secure_minio_password
```

## 功能配置

### 会员系统和记账点系统

这是本次修复的重点功能。要启用这些功能：

```bash
# 在 .env 文件中设置
ENABLE_MEMBERSHIP_SYSTEM=true
ENABLE_ACCOUNTING_POINTS_SYSTEM=true
MEMBERSHIP_MONTHLY_POINTS=1000
DEFAULT_MEMBER_TYPE=LIFETIME
```

**功能说明：**
- `ENABLE_MEMBERSHIP_SYSTEM`: 控制会员中心功能
- `ENABLE_ACCOUNTING_POINTS_SYSTEM`: 控制每日签到和记账点功能
- `MEMBERSHIP_MONTHLY_POINTS`: 会员每月赠送的记账点数量
- `DEFAULT_MEMBER_TYPE`: 默认会员类型（LIFETIME表示永久会员）

### 可选功能配置

#### 微信公众号对接

如需启用微信公众号功能，参考 `config/wechat.env.example`：

```bash
# 添加到 .env 文件
WECHAT_APP_ID=your_wechat_app_id
WECHAT_APP_SECRET=your_wechat_app_secret
WECHAT_TOKEN=your_wechat_token
WECHAT_ENCODING_AES_KEY=your_encoding_aes_key
```

#### 邮件服务

如需启用邮件功能，参考 `config/email.env.example`：

```bash
# 添加到 .env 文件
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
```

#### AI服务

如需启用AI智能记账功能，参考 `config/ai.env.example`：

```bash
# 添加到 .env 文件
OPENAI_API_KEY=your_openai_api_key
```

#### 外部S3存储

如需使用外部S3存储替代内置MinIO，参考 `config/s3.env.example`。

## 环境变量传递验证

本次修复确保了以下环境变量正确传递到Docker容器：

### 核心配置
- ✅ `DATABASE_URL` - 数据库连接字符串
- ✅ `JWT_SECRET` - JWT密钥
- ✅ `NODE_ENV` - 应用环境

### 会员系统配置（本次修复重点）
- ✅ `ENABLE_MEMBERSHIP_SYSTEM` - 会员系统开关
- ✅ `ENABLE_ACCOUNTING_POINTS_SYSTEM` - 记账点系统开关
- ✅ `MEMBERSHIP_MONTHLY_POINTS` - 会员月度记账点
- ✅ `DEFAULT_MEMBER_TYPE` - 默认会员类型

### 存储配置
- ✅ `S3_ENDPOINT` - S3服务端点
- ✅ `S3_ACCESS_KEY_ID` - S3访问密钥ID
- ✅ `S3_SECRET_ACCESS_KEY` - S3访问密钥
- ✅ `S3_REGION` - S3区域
- ✅ `FILE_STORAGE_TYPE` - 文件存储类型

### 可选配置
- ✅ `WECHAT_APP_ID` - 微信应用ID
- ✅ `SMTP_HOST` - 邮件服务器
- ✅ `OPENAI_API_KEY` - OpenAI API密钥

## 验证和测试

### 1. 使用验证脚本

```bash
cd docker
chmod +x verify-env-config.sh
./verify-env-config.sh
```

### 2. 手动验证

```bash
# 检查容器状态
docker ps

# 检查容器内环境变量
docker exec zhiweijz-backend printenv | grep ENABLE_

# 测试API接口
curl http://localhost:3000/api/system/features

# 查看容器日志
docker logs zhiweijz-backend
```

### 3. 前端验证

访问以下页面验证功能是否正常：
- 会员中心：`http://localhost:8080/settings/membership`
- 每日签到：`http://localhost:8080/settings/checkin`

## 故障排除

### 问题1：功能仍然显示"系统未启用"

**解决方案：**
1. 确认 `.env` 文件中已设置 `ENABLE_MEMBERSHIP_SYSTEM=true`
2. 重启容器：`docker-compose down && docker-compose up -d`
3. 检查容器内环境变量：`docker exec zhiweijz-backend printenv ENABLE_MEMBERSHIP_SYSTEM`

### 问题2：容器启动失败

**解决方案：**
1. 检查 `.env` 文件格式是否正确
2. 查看容器日志：`docker logs zhiweijz-backend`
3. 验证环境变量：`./verify-env-config.sh`

### 问题3：API调用失败

**解决方案：**
1. 确认容器已完全启动
2. 检查端口映射：`docker ps`
3. 测试网络连接：`curl http://localhost:3000/api/health`

## 安全建议

1. **生产环境必须修改默认密码**
   - 数据库密码
   - JWT密钥
   - MinIO密码

2. **API密钥安全**
   - 妥善保管各种API密钥
   - 定期轮换密钥
   - 设置访问限制

3. **网络安全**
   - 使用HTTPS
   - 配置防火墙
   - 限制容器网络访问

## 更新和维护

1. **配置更新**
   ```bash
   # 修改 .env 文件后重启容器
   docker-compose down
   docker-compose up -d
   ```

2. **镜像更新**
   ```bash
   # 拉取最新镜像
   docker-compose pull
   docker-compose up -d
   ```

3. **备份配置**
   ```bash
   # 备份配置文件
   cp .env .env.backup.$(date +%Y%m%d)
   ```

## 支持

如遇到问题，请：
1. 运行验证脚本获取详细信息
2. 查看容器日志
3. 检查GitHub Issues
4. 提交详细的问题报告
