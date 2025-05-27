# 生产环境Docker部署与更新指南

## 🚀 生产环境架构

### 容器组件
```
zhiweijz-production/
├── postgres (数据库)
├── backend (后端API服务)
├── web (前端Web应用)
└── nginx (反向代理)
```

### 网络配置
- **内部网络**: zhiweijz-network
- **外部端口**: 80 (HTTP), 443 (HTTPS)
- **内部端口**: 3000 (backend), 3003 (web), 5432 (postgres)

## 📋 标准更新流程

### 1. 准备阶段
```bash
# 1.1 备份数据库
docker exec zhiweijz-postgres pg_dump -U postgres zhiweijz > backup_$(date +%Y%m%d_%H%M%S).sql

# 1.2 检查当前状态
docker-compose ps
docker logs zhiweijz-backend --tail 50

# 1.3 创建更新分支
git checkout -b release/$(date +%Y%m%d)
```

### 2. 代码更新
```bash
# 2.1 拉取最新代码
git pull origin main

# 2.2 检查依赖变更
git diff HEAD~1 package.json server/package.json

# 2.3 检查Prisma schema变更
git diff HEAD~1 server/prisma/schema.prisma
```

### 3. 构建新镜像
```bash
# 3.1 构建后端镜像
docker build -f server/Dockerfile -t zhiweijz-backend:$(date +%Y%m%d) .
docker tag zhiweijz-backend:$(date +%Y%m%d) zhiweijz-backend:latest

# 3.2 构建前端镜像（如有变更）
docker build -f apps/web/Dockerfile -t zhiweijz-web:$(date +%Y%m%d) .
docker tag zhiweijz-web:$(date +%Y%m%d) zhiweijz-web:latest

# 3.3 验证镜像
docker images | grep zhiweijz
```

### 4. 数据库迁移（如需要）
```bash
# 4.1 检查是否有新的迁移
docker run --rm --network zhiweijz-network \
  -e DATABASE_URL="postgresql://postgres:password@zhiweijz-postgres:5432/zhiweijz" \
  zhiweijz-backend:latest npx prisma migrate status

# 4.2 执行迁移（如有）
docker run --rm --network zhiweijz-network \
  -e DATABASE_URL="postgresql://postgres:password@zhiweijz-postgres:5432/zhiweijz" \
  zhiweijz-backend:latest npx prisma migrate deploy
```

### 5. 滚动更新
```bash
# 5.1 更新后端服务
docker-compose up -d --no-deps backend

# 5.2 等待服务启动
sleep 30

# 5.3 健康检查
curl -f http://localhost:3000/api/health || exit 1

# 5.4 更新前端服务（如有变更）
docker-compose up -d --no-deps web

# 5.5 重启nginx（如有配置变更）
docker-compose restart nginx
```

### 6. 验证部署
```bash
# 6.1 检查所有服务状态
docker-compose ps

# 6.2 检查服务日志
docker logs zhiweijz-backend --tail 20
docker logs zhiweijz-web --tail 20

# 6.3 功能测试
curl http://localhost/api/health
curl http://localhost/

# 6.4 数据库连接测试
docker exec zhiweijz-postgres psql -U postgres -d zhiweijz -c "SELECT COUNT(*) FROM users;"
```

## 🔄 回滚策略

### 快速回滚
```bash
# 1. 停止当前服务
docker-compose stop backend web

# 2. 回滚到上一个版本
docker tag zhiweijz-backend:$(date -d "1 day ago" +%Y%m%d) zhiweijz-backend:latest
docker tag zhiweijz-web:$(date -d "1 day ago" +%Y%m%d) zhiweijz-web:latest

# 3. 重启服务
docker-compose up -d backend web

# 4. 验证回滚
curl http://localhost/api/health
```

### 数据库回滚
```bash
# 仅在必要时执行，需要谨慎操作
docker exec -i zhiweijz-postgres psql -U postgres zhiweijz < backup_YYYYMMDD_HHMMSS.sql
```

## 📊 监控与维护

### 日常监控
```bash
# 检查容器状态
docker stats zhiweijz-backend zhiweijz-web zhiweijz-postgres

# 检查磁盘使用
docker system df

# 检查日志
docker logs zhiweijz-backend --since 1h
```

### 定期维护
```bash
# 清理未使用的镜像（每周）
docker image prune -f

# 清理未使用的容器（每周）
docker container prune -f

# 备份数据库（每日）
docker exec zhiweijz-postgres pg_dump -U postgres zhiweijz > daily_backup_$(date +%Y%m%d).sql
```

## ⚠️ 注意事项

### 安全考虑
1. **环境变量**: 确保敏感信息通过环境变量传递
2. **网络隔离**: 使用内部网络，仅暴露必要端口
3. **镜像安全**: 定期更新基础镜像，扫描安全漏洞
4. **备份加密**: 数据库备份应加密存储

### 性能优化
1. **资源限制**: 为容器设置合适的CPU和内存限制
2. **健康检查**: 配置适当的健康检查间隔
3. **日志轮转**: 配置日志轮转避免磁盘空间耗尽
4. **缓存策略**: 合理使用Docker层缓存

### 故障排除
1. **服务无法启动**: 检查环境变量和依赖服务
2. **数据库连接失败**: 验证网络配置和凭据
3. **内存不足**: 检查容器资源限制和系统资源
4. **端口冲突**: 确保端口映射正确且无冲突

## 📞 紧急联系

- **开发团队**: [联系方式]
- **运维团队**: [联系方式]
- **数据库管理员**: [联系方式]
