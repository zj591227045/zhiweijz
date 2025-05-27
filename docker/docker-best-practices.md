# Docker配置最佳实践

## 🏗️ Dockerfile最佳实践

### 1. 多阶段构建
```dockerfile
# ✅ 推荐：使用多阶段构建减少镜像大小
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

### 2. 基础镜像选择
```dockerfile
# ✅ 推荐：使用Alpine Linux减少镜像大小
FROM node:18-alpine

# ❌ 避免：使用完整的Ubuntu镜像
FROM node:18
```

### 3. 依赖安装优化
```dockerfile
# ✅ 推荐：先复制package.json，利用Docker缓存
COPY package*.json ./
RUN npm install
COPY . .

# ❌ 避免：先复制所有文件
COPY . .
RUN npm install
```

### 4. 安全配置
```dockerfile
# ✅ 推荐：创建非root用户
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# ✅ 推荐：安装安全更新
RUN apk add --no-cache \
    dumb-init \
    curl \
    && apk upgrade
```

## 🐳 Docker Compose最佳实践

### 1. 环境变量管理
```yaml
# ✅ 推荐：使用.env文件
version: '3.8'
services:
  backend:
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
    env_file:
      - .env
```

### 2. 网络配置
```yaml
# ✅ 推荐：使用自定义网络
networks:
  zhiweijz-network:
    driver: bridge

services:
  backend:
    networks:
      - zhiweijz-network
```

### 3. 数据持久化
```yaml
# ✅ 推荐：使用命名卷
volumes:
  postgres_data:
  backend_uploads:

services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

### 4. 健康检查
```yaml
# ✅ 推荐：配置健康检查
services:
  backend:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## 🔧 Prisma Docker配置

### 1. 正确的binaryTargets配置
```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-arm64-openssl-3.0.x"]
}
```

### 2. 构建时生成客户端
```dockerfile
# ✅ 在构建阶段生成Prisma客户端
RUN npx prisma generate
RUN npm run build
```

### 3. 迁移处理
```dockerfile
# ✅ 生产环境使用migrate deploy
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

## 📦 依赖管理最佳实践

### 1. 版本锁定
```json
{
  "dependencies": {
    "@prisma/client": "^5.0.0",
    "express": "^4.18.2"
  }
}
```

### 2. 开发与生产依赖分离
```dockerfile
# 构建阶段：安装所有依赖
RUN npm install

# 生产阶段：仅安装生产依赖
RUN npm ci --only=production
```

### 3. 缓存优化
```dockerfile
# ✅ 利用Docker层缓存
COPY package*.json ./
RUN npm install
COPY . .
```

## 🔒 安全最佳实践

### 1. 镜像安全
```dockerfile
# ✅ 使用官方镜像
FROM node:18-alpine

# ✅ 定期更新基础镜像
RUN apk upgrade

# ✅ 移除不必要的包
RUN apk del .build-deps
```

### 2. 运行时安全
```yaml
# ✅ 限制容器权限
services:
  backend:
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /tmp
```

### 3. 网络安全
```yaml
# ✅ 仅暴露必要端口
services:
  backend:
    expose:
      - "3000"
    # 不要使用 ports 除非需要外部访问
```

## 📊 性能优化

### 1. 资源限制
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M
```

### 2. 启动优化
```dockerfile
# ✅ 使用dumb-init处理信号
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### 3. 日志管理
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🔍 监控与调试

### 1. 健康检查端点
```typescript
// ✅ 实现健康检查API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### 2. 结构化日志
```typescript
// ✅ 使用结构化日志
console.log(JSON.stringify({
  level: 'info',
  message: 'Server started',
  port: 3000,
  timestamp: new Date().toISOString()
}));
```

### 3. 错误处理
```typescript
// ✅ 优雅关闭
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});
```

## 📋 检查清单

### 构建前检查
- [ ] 所有依赖版本已锁定
- [ ] Dockerfile使用多阶段构建
- [ ] 安全更新已应用
- [ ] 健康检查已配置

### 部署前检查
- [ ] 环境变量已配置
- [ ] 数据库迁移已准备
- [ ] 备份已创建
- [ ] 回滚计划已准备

### 部署后检查
- [ ] 所有服务正常运行
- [ ] 健康检查通过
- [ ] 日志无错误
- [ ] 功能测试通过

## 🚨 常见问题解决

### 1. 构建失败
```bash
# 清理Docker缓存
docker builder prune -f
docker system prune -f

# 重新构建
docker build --no-cache -f server/Dockerfile .
```

### 2. 容器启动失败
```bash
# 检查日志
docker logs container_name

# 进入容器调试
docker exec -it container_name sh
```

### 3. 网络连接问题
```bash
# 检查网络
docker network ls
docker network inspect network_name

# 测试连接
docker exec container_name ping target_container
```
