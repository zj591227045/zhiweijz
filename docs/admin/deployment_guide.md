# 只为记账管理员系统部署指南

## 概述

本指南描述如何部署包含管理员功能的"只为记账"后端系统，系统支持自动数据库升级，确保无缝部署。

## 功能特性

### 自动数据库升级
- ✅ Docker容器启动时自动检查数据库版本
- ✅ 自动执行必要的数据库迁移
- ✅ 兼容现有数据库结构
- ✅ 零数据丢失升级
- ✅ 升级锁机制防止重复升级

### 管理员功能
- ✅ 用户管理 (CRUD操作、注册开关、密码重置)
- ✅ 系统配置 (LLM全局配置、系统限制设置)
- ✅ 公告系统 (发布公告、已读状态跟踪)
- ✅ 统计监控 (用户数、交易记录、访问统计)
- ✅ 日志查看 (访问日志、API调用、LLM使用)

## 部署方式

### 1. Docker Compose 部署（推荐）

```bash
# 1. 克隆代码
git clone <your-repo>
cd zhiweijz/server

# 2. 复制配置文件
cp docker-compose.example.yml docker-compose.yml

# 3. 修改环境变量
vim docker-compose.yml

# 4. 启动服务
docker-compose up -d

# 5. 查看日志
docker-compose logs -f zhiweijz-backend
```

### 2. Docker 单独部署

```bash
# 构建镜像
docker build -t zhiweijz-backend .

# 运行容器
docker run -d \
  --name zhiweijz-backend \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public" \
  -e JWT_SECRET="your-secret" \
  -e NODE_ENV="production" \
  -e DOCKER_CONTAINER="true" \
  zhiweijz-backend
```

### 3. 手动部署

```bash
# 1. 安装依赖
npm install

# 2. 生成Prisma客户端
npx prisma generate

# 3. 手动升级数据库
npm run db:upgrade

# 4. 启动应用
npm start
```

## 环境变量配置

### 必需的环境变量

```env
# 数据库连接
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public

# JWT密钥
JWT_SECRET=your-super-secret-jwt-key

# 应用环境
NODE_ENV=production
```

### 可选的环境变量

```env
# 端口配置
PORT=3000

# Docker标记（自动设置）
DOCKER_CONTAINER=true

# 邮件配置（密码重置功能需要）
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# 上传文件存储
UPLOAD_PATH=/app/uploads
```

## 升级流程

### 自动升级（Docker）

Docker容器启动时会自动：

1. **等待数据库连接** - 最多等待60秒
2. **检查升级需求** - 对比当前版本与目标版本
3. **执行数据库迁移** - 创建新表、索引、触发器
4. **插入默认数据** - 管理员账号、系统配置
5. **启动应用服务** - 正常启动后端服务

### 手动升级

```bash
# 检查当前数据库状态
npm run db:check

# 执行数据库升级
npm run db:upgrade

# 验证升级结果
npm run db:check
```

## 管理员账号

### 默认账号信息

```
用户名: admin
密码: zhiweijz2025
管理页面: http://your-domain:3000/admin
```

### 安全建议

1. **立即修改默认密码**
2. **启用HTTPS**
3. **设置防火墙规则**
4. **定期备份数据库**

## 健康检查

### 服务状态检查

```bash
# 检查服务健康状态
curl http://localhost:3000/health

# 检查数据库连接
curl http://localhost:3000/api/health
```

### Docker健康检查

容器自带健康检查，每30秒检查一次：

```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
```

## 故障排除

### 常见问题

**1. 数据库连接失败**
```bash
# 检查数据库是否启动
docker-compose ps

# 查看数据库日志
docker-compose logs postgres

# 测试数据库连接
psql $DATABASE_URL -c "SELECT 1"
```

**2. 升级失败**
```bash
# 查看升级日志
docker-compose logs zhiweijz-backend | grep AUTO-UPGRADE

# 手动重新升级
docker exec -it zhiweijz-backend npm run db:upgrade
```

**3. 权限问题**
```bash
# 检查文件权限
docker exec -it zhiweijz-backend ls -la scripts/

# 重新设置权限
docker exec -it zhiweijz-backend chmod +x scripts/*.sh
```

### 日志查看

```bash
# 查看应用日志
docker-compose logs -f zhiweijz-backend

# 查看数据库日志
docker-compose logs -f postgres

# 查看升级相关日志
docker-compose logs zhiweijz-backend | grep -E "(AUTO-UPGRADE|SUCCESS|ERROR)"
```

## 数据备份

### 自动备份

```bash
# 设置定时备份任务
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker exec postgres pg_dump -U zhiweijz zhiweijz > backup_$DATE.sql
EOF

# 添加到crontab（每天凌晨2点备份）
echo "0 2 * * * /path/to/backup.sh" | crontab -
```

### 手动备份

```bash
# 创建备份
docker exec postgres pg_dump -U zhiweijz zhiweijz > backup.sql

# 恢复备份
docker exec -i postgres psql -U zhiweijz zhiweijz < backup.sql
```

## 性能优化

### 数据库优化

- ✅ 自动创建索引
- ✅ 分区表支持（日志表按月分区）
- ✅ 查询优化
- ✅ 连接池配置

### 应用优化

- ✅ 缓存机制
- ✅ 分页查询
- ✅ 异步处理
- ✅ 错误处理

## 监控建议

### 系统监控

1. **服务器资源** - CPU、内存、磁盘使用率
2. **数据库性能** - 连接数、查询时间、锁等待
3. **应用指标** - 请求量、响应时间、错误率
4. **日志监控** - 错误日志、访问日志分析

### 告警设置

- 服务宕机告警
- 数据库连接失败告警
- 磁盘空间不足告警
- 异常错误率告警

## 版本升级

### 升级步骤

1. **备份数据库**
2. **拉取新镜像**
3. **停止旧容器**
4. **启动新容器**（自动升级数据库）
5. **验证功能**

```bash
# 升级示例
docker-compose down
docker-compose pull
docker-compose up -d
```

### 回滚方案

如果升级失败，可以快速回滚：

```bash
# 停止新版本
docker-compose down

# 恢复数据库备份
docker exec -i postgres psql -U zhiweijz zhiweijz < backup_before_upgrade.sql

# 启动旧版本
docker run -d --name zhiweijz-backend-old previous-image
```

## 支持与联系

如果在部署过程中遇到问题，请：

1. 查看本文档的故障排除部分
2. 检查GitHub Issues
3. 联系技术支持

---

## 更新记录

- **v1.1.0** - 添加管理员功能、自动升级、LLM日志记录
- **v1.0.0** - 基础记账功能 