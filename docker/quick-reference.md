# Docker快速参考命令

## 🚀 常用构建命令

### 构建后端镜像
```bash
# 基本构建
docker build -f server/Dockerfile -t zhiweijz-backend .

# 无缓存构建
docker build --no-cache -f server/Dockerfile -t zhiweijz-backend .

# 带标签构建
docker build -f server/Dockerfile -t zhiweijz-backend:v1.0.0 .
```

### 构建前端镜像
```bash
# 构建Web应用
docker build -f apps/web/Dockerfile -t zhiweijz-web .

# 多平台构建
docker buildx build --platform linux/amd64,linux/arm64 -f server/Dockerfile -t zhiweijz-backend .
```

## 🐳 Docker Compose命令

### 启动服务
```bash
# 启动所有服务
docker-compose up -d

# 启动特定服务
docker-compose up -d postgres backend

# 重新构建并启动
docker-compose up -d --build

# 强制重新创建容器
docker-compose up -d --force-recreate
```

### 停止服务
```bash
# 停止所有服务
docker-compose down

# 停止并删除卷
docker-compose down -v

# 停止特定服务
docker-compose stop backend
```

### 查看状态
```bash
# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs backend

# 实时查看日志
docker-compose logs -f backend

# 查看最近日志
docker-compose logs --tail 50 backend
```

## 🔍 调试命令

### 容器调试
```bash
# 进入运行中的容器
docker exec -it zhiweijz-backend sh

# 以root用户进入容器
docker exec -it --user root zhiweijz-backend sh

# 查看容器详细信息
docker inspect zhiweijz-backend

# 查看容器资源使用
docker stats zhiweijz-backend
```

### 网络调试
```bash
# 查看网络列表
docker network ls

# 查看网络详情
docker network inspect zhiweijz_zhiweijz-network

# 测试容器间连接
docker exec zhiweijz-backend ping zhiweijz-postgres
```

### 日志调试
```bash
# 查看容器日志
docker logs zhiweijz-backend

# 查看最近日志
docker logs --tail 100 zhiweijz-backend

# 实时查看日志
docker logs -f zhiweijz-backend

# 查看特定时间段日志
docker logs --since 2h zhiweijz-backend
```

## 🗄️ 数据库操作

### 数据库连接
```bash
# 连接PostgreSQL
docker exec -it zhiweijz-postgres psql -U postgres -d zhiweijz

# 执行SQL命令
docker exec zhiweijz-postgres psql -U postgres -d zhiweijz -c "SELECT COUNT(*) FROM users;"
```

### 数据库备份
```bash
# 创建备份
docker exec zhiweijz-postgres pg_dump -U postgres zhiweijz > backup_$(date +%Y%m%d_%H%M%S).sql

# 恢复备份
docker exec -i zhiweijz-postgres psql -U postgres zhiweijz < backup_file.sql
```

### Prisma操作
```bash
# 生成Prisma客户端
docker exec zhiweijz-backend npx prisma generate

# 查看迁移状态
docker exec zhiweijz-backend npx prisma migrate status

# 执行迁移
docker exec zhiweijz-backend npx prisma migrate deploy

# 重置数据库（开发环境）
docker exec zhiweijz-backend npx prisma migrate reset
```

## 🧹 清理命令

### 清理镜像
```bash
# 删除未使用的镜像
docker image prune -f

# 删除所有未使用的镜像
docker image prune -a -f

# 删除特定镜像
docker rmi zhiweijz-backend:old-tag
```

### 清理容器
```bash
# 删除停止的容器
docker container prune -f

# 删除特定容器
docker rm zhiweijz-backend
```

### 清理卷和网络
```bash
# 删除未使用的卷
docker volume prune -f

# 删除未使用的网络
docker network prune -f

# 系统全面清理
docker system prune -a -f --volumes
```

## 📊 监控命令

### 系统监控
```bash
# 查看Docker系统信息
docker system info

# 查看磁盘使用情况
docker system df

# 查看容器资源使用
docker stats

# 查看特定容器资源使用
docker stats zhiweijz-backend zhiweijz-postgres
```

### 健康检查
```bash
# 测试API健康状态
curl http://localhost:3000/api/health

# 测试数据库连接
docker exec zhiweijz-postgres pg_isready -U postgres

# 检查端口监听
docker exec zhiweijz-backend netstat -tlnp
```

## 🔧 故障排除

### 常见问题诊断
```bash
# 检查容器是否运行
docker ps | grep zhiweijz

# 检查容器退出状态
docker ps -a | grep zhiweijz

# 查看容器启动错误
docker logs zhiweijz-backend 2>&1 | grep -i error

# 检查端口占用
netstat -tlnp | grep :3000
```

### 重启服务
```bash
# 重启特定服务
docker-compose restart backend

# 重启所有服务
docker-compose restart

# 强制重启
docker-compose down && docker-compose up -d
```

## 📋 环境变量

### 查看环境变量
```bash
# 查看容器环境变量
docker exec zhiweijz-backend env

# 查看特定环境变量
docker exec zhiweijz-backend echo $DATABASE_URL
```

### 设置环境变量
```bash
# 临时设置环境变量
docker run -e NODE_ENV=production zhiweijz-backend

# 从文件加载环境变量
docker-compose --env-file .env.production up -d
```

## 🚨 紧急操作

### 紧急停止
```bash
# 立即停止所有容器
docker stop $(docker ps -q)

# 强制杀死容器
docker kill zhiweijz-backend
```

### 快速回滚
```bash
# 回滚到上一个版本
docker tag zhiweijz-backend:backup zhiweijz-backend:latest
docker-compose up -d --no-deps backend
```

### 数据恢复
```bash
# 从备份恢复数据库
docker-compose stop backend
docker exec -i zhiweijz-postgres psql -U postgres zhiweijz < latest_backup.sql
docker-compose start backend
```

## 📝 有用的别名

添加到 `~/.bashrc` 或 `~/.zshrc`:

```bash
# Docker别名
alias dps='docker ps'
alias dlog='docker logs'
alias dexec='docker exec -it'
alias dstop='docker stop'
alias drm='docker rm'
alias dprune='docker system prune -f'

# Docker Compose别名
alias dcup='docker-compose up -d'
alias dcdown='docker-compose down'
alias dclog='docker-compose logs'
alias dcps='docker-compose ps'
alias dcrestart='docker-compose restart'

# 项目特定别名
alias zhiweijz-logs='docker logs zhiweijz-backend --tail 50'
alias zhiweijz-shell='docker exec -it zhiweijz-backend sh'
alias zhiweijz-db='docker exec -it zhiweijz-postgres psql -U postgres -d zhiweijz'
alias zhiweijz-health='curl http://localhost:3000/api/health'
```
