# 只为记账 - Docker部署指南

本文档详细说明如何使用Docker部署只为记账应用。

## 架构概述

应用采用多容器架构，包含以下服务：

1. **PostgreSQL数据库** - 数据存储
2. **后端API服务** - Node.js + Express + Prisma
3. **前端Web服务** - Next.js应用
4. **Nginx反向代理** - 统一入口和负载均衡

## 快速开始

### 前提条件

- Docker 20.10+
- Docker Compose 2.0+
- 至少4GB可用内存
- 至少10GB可用磁盘空间

### 一键部署

```bash
# 克隆项目
git clone <your-repo-url>
cd zhiweijz

# 给脚本执行权限
chmod +x scripts/docker-quick-start.sh

# 运行快速启动脚本
./scripts/docker-quick-start.sh
```

### 手动部署

1. **准备环境变量**
```bash
# 复制环境变量模板
cp .env.docker .env

# 编辑环境变量（重要！）
nano .env
```

2. **构建和启动服务**
```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 运行数据库迁移
docker-compose exec backend npx prisma migrate deploy
```

3. **验证部署**
```bash
# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 环境变量配置

### 必需配置

```bash
# 数据库密码
POSTGRES_PASSWORD=your_secure_password

# JWT密钥（生产环境必须修改）
JWT_SECRET=your_very_secure_jwt_secret_key
```

### 可选配置

```bash
# OpenAI API（AI功能）
OPENAI_API_KEY=your_openai_api_key

# 邮件服务
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_email_password
```

## 访问应用

部署成功后，可以通过以下地址访问：

- **前端应用**: http://localhost
- **API接口**: http://localhost/api
- **健康检查**: http://localhost/health

## 管理命令

### 服务管理

```bash
# 查看服务状态
docker-compose ps

# 查看实时日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

### 数据库管理

```bash
# 连接到数据库
docker-compose exec postgres psql -U postgres -d zhiweijz

# 运行数据库迁移
docker-compose exec backend npx prisma migrate deploy

# 查看数据库状态
docker-compose exec backend npx prisma migrate status

# 重置数据库（谨慎使用）
docker-compose exec backend npx prisma migrate reset
```

### 应用管理

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入前端容器
docker-compose exec frontend sh

# 查看应用版本
docker-compose exec backend node -v
docker-compose exec frontend node -v
```

## 数据持久化

应用数据存储在Docker卷中：

- `postgres_data`: 数据库数据
- `backend_uploads`: 后端上传文件
- `nginx_logs`: Nginx日志

### 备份数据

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U postgres zhiweijz > backup.sql

# 备份上传文件
docker cp zhiweijz-backend:/app/uploads ./uploads_backup
```

### 恢复数据

```bash
# 恢复数据库
docker-compose exec -T postgres psql -U postgres zhiweijz < backup.sql

# 恢复上传文件
docker cp ./uploads_backup zhiweijz-backend:/app/uploads
```

## 性能优化

### 资源限制

在生产环境中，建议为容器设置资源限制：

```yaml
# docker-compose.override.yml
version: '3.8'
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
          cpus: '0.5'
  frontend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.3'
```

### 监控

```bash
# 查看资源使用情况
docker stats

# 查看容器详细信息
docker-compose exec backend cat /proc/meminfo
docker-compose exec backend cat /proc/cpuinfo
```

## 故障排除

### 常见问题

1. **端口冲突**
   - 检查80、443、3000、5432端口是否被占用
   - 修改docker-compose.yml中的端口映射

2. **内存不足**
   - 确保系统有足够内存
   - 减少并发构建进程

3. **权限问题**
   - 确保Docker有足够权限
   - 检查文件权限设置

4. **网络问题**
   - 检查Docker网络配置
   - 确保容器间可以通信

### 调试命令

```bash
# 查看容器详细信息
docker-compose config

# 检查网络连接
docker-compose exec backend ping frontend
docker-compose exec frontend ping backend

# 查看环境变量
docker-compose exec backend env
docker-compose exec frontend env
```

## 安全建议

1. **修改默认密码**: 更改所有默认密码
2. **使用HTTPS**: 在生产环境中配置SSL证书
3. **限制访问**: 配置防火墙规则
4. **定期更新**: 保持镜像和依赖更新
5. **监控日志**: 定期检查应用日志

## 生产环境部署

生产环境部署时的额外考虑：

1. **使用外部数据库**: 考虑使用托管数据库服务
2. **配置SSL**: 使用Let's Encrypt或其他SSL证书
3. **设置监控**: 配置Prometheus + Grafana
4. **备份策略**: 定期自动备份数据
5. **日志管理**: 配置日志轮转和集中收集

## 支持

如果遇到问题，请：

1. 查看应用日志
2. 检查Docker容器状态
3. 参考故障排除部分
4. 提交Issue到项目仓库
