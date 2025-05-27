# 只为记账 Docker 部署指南

## 📋 概述

本文档提供了只为记账应用的完整Docker部署方案，包含数据库、后端、前端和Nginx反向代理的一键部署配置。

## 🏗️ 架构说明

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Nginx       │    │    Frontend     │    │     Backend     │    │   PostgreSQL    │
│   (反向代理)     │────│   (Next.js)     │────│   (Node.js)     │────│    (数据库)     │
│   Port: 80      │    │   Port: 3000    │    │   Port: 3000    │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 快速开始

### 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

### 一键部署

1. **下载源码**
   ```bash
   git clone <repository-url>
   cd zhiweijz/docker
   ```

2. **配置环境变量**
   ```bash
   cp .env.example .env
   # 根据需要编辑 .env 文件，特别是端口配置
   ```

3. **配置Docker镜像源（可选）**
   ```bash
   # 自动选择最快的镜像源
   ./scripts/setup-mirrors.sh

   # 或指定特定镜像源
   ./scripts/setup-mirrors.sh --mirror https://docker.1ms.run

   # 测试所有镜像源
   ./scripts/setup-mirrors.sh --test
   ```

4. **启动服务**
   ```bash
   chmod +x scripts/start.sh
   ./scripts/start.sh
   ```

5. **访问应用**
   - 前端应用: http://localhost:8080 (默认端口)
   - API接口: http://localhost:8080/api
   - 数据库: localhost:5432

   > 注意：如果修改了 `.env` 文件中的 `NGINX_HTTP_PORT`，请使用对应端口访问

## 📁 目录结构

```
docker/
├── docker-compose.yml          # Docker Compose 配置
├── .env.example               # 环境变量模板
├── config/                    # 配置文件目录
│   ├── init.sql              # 数据库初始化脚本
│   ├── nginx.conf            # Nginx 配置
│   └── nginx.Dockerfile      # Nginx 镜像构建文件
├── scripts/                   # 脚本目录
│   ├── start.sh              # 启动脚本
│   ├── stop.sh               # 停止脚本
│   └── setup-mirrors.sh      # Docker镜像源设置脚本
└── docs/                      # 文档目录
    ├── DEPLOYMENT.md         # 部署文档
    └── TROUBLESHOOTING.md    # 故障排除文档
```

## 🔧 服务配置

### PostgreSQL 数据库
- **镜像**: postgres:15-alpine
- **端口**: 5432
- **数据库**: zhiweijz
- **用户名**: zhiweijz
- **密码**: zhiweijz123
- **数据持久化**: Docker Volume

### 后端服务
- **构建**: 基于 server/Dockerfile
- **端口**: 3000 (内部)
- **环境**: production
- **自动迁移**: 启动时自动执行数据库迁移

### 前端服务
- **构建**: 基于 apps/web/Dockerfile
- **端口**: 3000 (内部)
- **环境**: production
- **静态资源**: 预构建并优化

### Nginx 反向代理
- **镜像**: nginx:1.25-alpine
- **端口**: 8080 (HTTP), 4343 (HTTPS) - 可通过环境变量配置
- **功能**:
  - 前端页面代理
  - API请求代理
  - 静态资源缓存
  - 请求限流
  - Gzip压缩

## 🛠️ 管理命令

### 启动服务
```bash
./scripts/start.sh
```

### 停止服务
```bash
./scripts/stop.sh
```

### 清理所有数据
```bash
./scripts/stop.sh --clean
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f nginx
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 进入容器
```bash
# 进入后端容器
docker-compose exec backend sh

# 进入数据库容器
docker-compose exec postgres psql -U zhiweijz -d zhiweijz
```

### Docker镜像源管理
```bash
# 自动选择最快的镜像源
./scripts/setup-mirrors.sh

# 使用指定镜像源
./scripts/setup-mirrors.sh --mirror https://docker.1ms.run

# 测试所有镜像源连通性
./scripts/setup-mirrors.sh --test

# 恢复原始配置
./scripts/setup-mirrors.sh --restore
```

## 🔒 安全配置

### 生产环境安全建议

1. **修改默认密码**
   ```bash
   # 编辑 .env 文件
   POSTGRES_PASSWORD=your-strong-password
   JWT_SECRET=your-jwt-secret-key
   ```

2. **启用HTTPS**
   - 配置SSL证书
   - 修改nginx配置支持HTTPS

3. **网络安全**
   - 使用防火墙限制端口访问
   - 配置反向代理安全头

4. **数据备份**
   - 定期备份数据库
   - 配置自动备份策略

## 📊 监控和维护

### 健康检查
所有服务都配置了健康检查：
```bash
# 检查服务状态
docker-compose ps

# 检查健康状态
docker-compose exec backend curl -f http://localhost:3000/api/health
```

### 性能监控
- CPU和内存使用情况
- 数据库连接数
- API响应时间
- 错误率统计

### 日志管理
- 应用日志: `/var/log/app/`
- Nginx日志: `/var/log/nginx/`
- 数据库日志: PostgreSQL容器内

## 🔄 更新和升级

### 更新应用
1. 拉取最新代码
2. 重新构建镜像
3. 重启服务

```bash
git pull origin main
docker-compose build
docker-compose up -d
```

### 数据库迁移
数据库迁移在后端服务启动时自动执行，无需手动操作。

## 🆘 故障排除

### 常见问题

1. **端口冲突**
   - 检查80端口是否被占用
   - 修改docker-compose.yml中的端口映射

2. **数据库连接失败**
   - 检查数据库容器是否正常启动
   - 验证数据库连接参数

3. **前端无法访问**
   - 检查nginx配置
   - 验证前端容器状态

4. **API请求失败**
   - 检查后端服务日志
   - 验证API路由配置

详细故障排除请参考 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

### 快速诊断命令
```bash
# 检查所有容器状态
docker-compose ps

# 检查容器日志
docker-compose logs --tail=50 backend
docker-compose logs --tail=50 frontend
docker-compose logs --tail=50 nginx

# 测试网络连接
docker-compose exec backend curl -f http://localhost:3000/api/health
docker-compose exec frontend curl -f http://localhost:3000/
curl -f http://localhost/health
```

## 📞 支持

如果遇到问题，请：
1. 查看日志文件
2. 检查服务状态
3. 参考故障排除文档
4. 提交Issue到项目仓库

---

**注意**: 本部署方案已经过测试，确保在任何支持Docker的机器上都能正常运行。
