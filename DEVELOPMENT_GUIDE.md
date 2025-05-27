# 只为记账 - 开发环境配置指南

本文档详细说明如何在不同环境下开发和运行"只为记账"应用。

## 🚀 快速开始

### 环境检测
首先运行环境检测工具，了解当前配置：
```bash
make check-env
# 或
./scripts/check-env.sh
```

## 🔧 开发模式

### 1. 完全本地开发模式

**适用场景**: 需要调试前后端代码，快速开发迭代

**启动步骤**:
```bash
# 1. 启动后端服务
cd server
npm install
npm run dev

# 2. 启动前端服务（新终端）
make dev-frontend
# 或
./scripts/start-dev-frontend.sh
```

**访问地址**:
- 前端: http://localhost:3003
- 后端: http://localhost:3000
- API: http://localhost:3003/api (代理到后端)

### 2. Docker后端 + 本地前端模式

**适用场景**: 只需要调试前端，后端使用稳定版本

**启动步骤**:
```bash
# 一键启动
make dev-backend

# 或手动启动
docker-compose up -d postgres backend
./scripts/start-dev-frontend.sh
```

**访问地址**:
- 前端: http://localhost:3003
- 后端: http://localhost:3000 (Docker容器)
- API: http://localhost:3003/api (代理到Docker后端)

### 3. 完全Docker开发模式

**适用场景**: 模拟生产环境，集成测试

**启动步骤**:
```bash
# 开发环境Docker
make dev
# 或
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# 生产环境Docker
make deploy
# 或
./scripts/docker-quick-start.sh
```

**访问地址**:
- 应用: http://localhost (通过Nginx)
- 前端: http://localhost:3003 (直接访问)
- 后端: http://localhost:3000 (直接访问)

## 🔄 智能环境检测

前端应用会自动检测运行环境并选择合适的后端地址：

### 检测逻辑
1. **优先级1**: 环境变量 `BACKEND_URL`
2. **优先级2**: Docker环境检测 (`DOCKER_ENV=true` 或 `NODE_ENV=production`)
3. **优先级3**: 开发环境默认 (`DEV_BACKEND_URL` 或 `http://localhost:3000`)

### 环境变量配置

#### 本地开发 (apps/web/.env.local)
```bash
# 后端服务地址
DEV_BACKEND_URL=http://localhost:3000

# 如果后端在不同端口
# DEV_BACKEND_URL=http://localhost:3001

# 如果后端在不同IP
# DEV_BACKEND_URL=http://10.255.0.27:3000

# API基础URL
NEXT_PUBLIC_API_URL=/api
```

#### Docker环境 (.env)
```bash
# 数据库密码
POSTGRES_PASSWORD=postgres123

# JWT密钥（生产环境必须修改）
JWT_SECRET=your_very_secure_jwt_secret

# OpenAI API（可选）
OPENAI_API_KEY=your_openai_api_key
```

## 📋 常用命令

### 环境管理
```bash
# 检查环境状态
make check-env

# 查看帮助
make help
```

### 本地开发
```bash
# 启动本地前端（自动检测后端）
make dev-frontend

# 启动Docker后端+本地前端
make dev-backend
```

### Docker管理
```bash
# 构建镜像
make build

# 启动所有服务
make up

# 查看日志
make logs

# 停止服务
make down

# 一键部署
make deploy
```

### 数据库管理
```bash
# 运行迁移
docker-compose exec backend npx prisma migrate deploy

# 查看迁移状态
docker-compose exec backend npx prisma migrate status

# 连接数据库
docker-compose exec postgres psql -U postgres -d zhiweijz
```

## 🐛 故障排除

### 前端无法连接后端

**症状**: 前端显示 "ENOTFOUND backend" 错误

**解决方案**:
1. 检查后端服务是否运行: `curl http://localhost:3000/api/health`
2. 检查环境配置: `cat apps/web/.env.local`
3. 重新启动前端: `make dev-frontend`

### Docker容器启动失败

**症状**: 容器无法启动或健康检查失败

**解决方案**:
1. 检查Docker状态: `docker-compose ps`
2. 查看日志: `docker-compose logs [service_name]`
3. 重新构建: `make build && make up`

### 端口冲突

**症状**: 端口已被占用

**解决方案**:
1. 检查端口使用: `lsof -i :3000` 或 `lsof -i :3003`
2. 停止冲突服务或修改端口配置
3. 修改 docker-compose.yml 中的端口映射

### 数据库连接失败

**症状**: 后端无法连接数据库

**解决方案**:
1. 检查数据库容器: `docker-compose ps postgres`
2. 检查数据库日志: `docker-compose logs postgres`
3. 验证连接字符串: 检查 `.env` 文件中的 `DATABASE_URL`

## 🔧 高级配置

### 自定义后端地址
如果后端运行在非标准地址，可以通过以下方式配置：

```bash
# 方法1: 环境变量
export DEV_BACKEND_URL=http://192.168.1.100:3000
make dev-frontend

# 方法2: .env.local文件
echo "DEV_BACKEND_URL=http://192.168.1.100:3000" > apps/web/.env.local
make dev-frontend

# 方法3: 直接指定
BACKEND_URL=http://192.168.1.100:3000 npm run dev
```

### 混合开发环境
可以灵活组合不同的服务：

```bash
# 只启动数据库
docker-compose up -d postgres

# 本地后端+本地前端
cd server && npm run dev &
make dev-frontend

# Docker后端+本地前端
docker-compose up -d postgres backend
make dev-frontend
```

## 📝 开发建议

1. **首次开发**: 使用完全本地模式，便于调试
2. **前端开发**: 使用Docker后端+本地前端模式
3. **集成测试**: 使用完全Docker模式
4. **生产验证**: 使用生产Docker配置

## 🔍 调试技巧

### 查看网络请求
前端会在控制台显示后端代理地址：
```
[Next.js] 后端代理地址: http://localhost:3000
```

### 验证API连接
```bash
# 检查后端健康状态
curl http://localhost:3000/api/health

# 检查前端代理
curl http://localhost:3003/api/health
```

### 查看容器内部
```bash
# 进入后端容器
docker-compose exec backend sh

# 进入前端容器
docker-compose exec frontend sh

# 查看容器日志
docker-compose logs -f backend
docker-compose logs -f frontend
```
