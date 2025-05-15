# 只为记账 - 部署策略

本文档详细描述了"只为记账"应用的部署策略，包括环境配置、CI/CD流程、监控和扩展策略。

## 部署环境

我们将采用以下部署环境：

### 开发环境

- **目的**：日常开发和测试
- **配置**：
  - 本地开发机器或开发服务器
  - 本地PostgreSQL数据库
  - 本地Redis缓存（可选）
- **部署方式**：
  - 手动部署或简单脚本
  - 使用`npm run dev`启动开发服务器

### 测试环境

- **目的**：集成测试和QA
- **配置**：
  - 云服务器（如AWS EC2 t3.small）
  - 托管PostgreSQL数据库（如AWS RDS）
  - 基本监控
- **部署方式**：
  - 通过CI/CD自动部署
  - 使用Docker容器

### 生产环境

- **目的**：面向用户的正式环境
- **配置**：
  - 云服务器（如AWS EC2 t3.medium或更高）
  - 托管PostgreSQL数据库（如AWS RDS）
  - Redis缓存
  - 完整监控和告警
  - CDN用于静态资源
- **部署方式**：
  - 通过CI/CD自动部署
  - 使用Docker容器
  - 负载均衡（根据需求）

## 容器化策略

我们将使用Docker容器化应用，以确保环境一致性和简化部署流程。

### Dockerfile

```dockerfile
# 基础镜像
FROM node:16-alpine AS builder

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 生成Prisma客户端
RUN npx prisma generate

# 构建应用
RUN npm run build

# 生产环境镜像
FROM node:16-alpine

# 设置工作目录
WORKDIR /app

# 复制package.json和package-lock.json
COPY package*.json ./

# 仅安装生产依赖
RUN npm ci --only=production

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma

# 设置环境变量
ENV NODE_ENV=production

# 暴露端口
EXPOSE 3000

# 启动命令
CMD ["node", "dist/server.js"]
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/zhiweijz
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis
    restart: always

  db:
    image: postgres:13
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=zhiweijz
    ports:
      - "5432:5432"

  redis:
    image: redis:6
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

## CI/CD流程

我们将使用GitHub Actions实现CI/CD流程，自动化测试、构建和部署过程。

### CI流程

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: zhiweijz_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate Prisma Client
        run: npx prisma generate
        
      - name: Run migrations
        run: npx prisma migrate deploy
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/zhiweijz_test
          
      - name: Run tests
        run: npm test
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/zhiweijz_test
          JWT_SECRET: test_secret
          
      - name: Run linting
        run: npm run lint
```

### CD流程

```yaml
# .github/workflows/cd.yml
name: CD

on:
  push:
    branches: [ main ]
    
jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Generate Prisma Client
        run: npx prisma generate
        
      - name: Build
        run: npm run build
        
      - name: Login to Docker Hub
        uses: docker/login-action@v1
        with:
          username: ${{ secrets.DOCKER_HUB_USERNAME }}
          password: ${{ secrets.DOCKER_HUB_ACCESS_TOKEN }}
          
      - name: Build and push Docker image
        uses: docker/build-push-action@v2
        with:
          context: .
          push: true
          tags: username/zhiweijz:latest
          
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USERNAME }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /path/to/app
            docker-compose pull
            docker-compose up -d
```

## 数据库迁移策略

在部署过程中，我们将使用Prisma Migrate来管理数据库迁移：

```bash
# 在CI/CD流程中执行
npx prisma migrate deploy
```

这将应用所有待处理的迁移，确保数据库结构与应用代码同步。

## 监控与日志

### 应用监控

我们将使用以下工具监控应用：

1. **Prometheus**：收集应用指标
2. **Grafana**：可视化监控数据
3. **Sentry**：错误跟踪和性能监控

### 日志管理

我们将使用以下方案管理日志：

1. **Winston**：结构化日志记录
2. **ELK Stack**：日志收集、搜索和可视化
   - Elasticsearch：存储日志
   - Logstash：处理日志
   - Kibana：可视化日志

### 监控指标

我们将监控以下关键指标：

1. **系统指标**：
   - CPU使用率
   - 内存使用率
   - 磁盘I/O
   - 网络流量

2. **应用指标**：
   - 请求响应时间
   - 请求成功/失败率
   - 活跃用户数
   - API调用频率

3. **数据库指标**：
   - 查询性能
   - 连接数
   - 缓存命中率
   - 磁盘使用情况

## 扩展策略

随着用户增长，我们将采用以下扩展策略：

### 垂直扩展

- 增加服务器CPU和内存
- 升级数据库实例
- 优化应用性能

### 水平扩展

- 部署多个应用实例
- 使用负载均衡器分发流量
- 实施数据库读写分离
- 考虑数据库分片

### 缓存策略

- 实施多级缓存
  - 内存缓存（Redis）
  - CDN缓存（静态资源）
  - 应用层缓存（热点数据）

## 灾难恢复

为了确保数据安全和业务连续性，我们将实施以下灾难恢复策略：

### 数据备份

- 数据库自动备份（每日）
- 增量备份（每小时）
- 备份验证和恢复测试

### 高可用性

- 数据库主从复制
- 多可用区部署
- 自动故障转移

### 恢复计划

- 定义恢复点目标（RPO）
- 定义恢复时间目标（RTO）
- 制定详细的恢复流程
- 定期演练恢复流程

## 安全措施

为了保护应用和数据安全，我们将实施以下安全措施：

### 网络安全

- 使用HTTPS加密传输
- 配置防火墙规则
- 实施DDoS防护

### 应用安全

- 输入验证和净化
- CSRF保护
- XSS防护
- SQL注入防护

### 数据安全

- 敏感数据加密
- 定期安全审计
- 遵循最小权限原则
