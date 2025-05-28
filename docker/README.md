# 只为记账 Docker 部署包

## 🚀 一键部署

这是只为记账应用的完整Docker部署解决方案，包含数据库、后端、前端和Nginx反向代理的一键部署配置。

### ⚡ 快速开始

```bash
# 1. 进入docker目录
cd docker

# 2. 配置环境变量（可选）
cp .env.example .env

# 3. 一键启动
./scripts/start.sh
```

### 🌐 访问应用

启动完成后，脚本会自动检测并显示所有可用的访问地址：

- **本地访问**: http://localhost:端口号
- **网络访问**: http://你的IP地址:端口号  
- **API接口**: http://访问地址/api
- **数据库**: 访问地址:5432

> 💡 **提示**: 脚本会自动检测你的IP地址，支持同一网络下的其他设备访问

## 📁 目录结构

```
docker/
├── README.md                  # 本文件
├── docker-compose.yml         # Docker Compose 配置
├── .env.example              # 环境变量模板
├── config/                   # 配置文件
│   ├── init.sql             # 数据库初始化脚本
│   ├── nginx.conf           # Nginx 配置
│   └── nginx.Dockerfile     # Nginx 镜像构建文件
├── scripts/                  # 管理脚本
│   ├── start.sh             # 启动脚本
│   ├── stop.sh              # 停止脚本
│   ├── setup-mirrors.sh     # Docker镜像源设置脚本
│   ├── generate-schema.sh   # 数据库Schema生成脚本
│   └── reset-database.sh    # 数据库重置脚本
└── docs/                     # 文档
    ├── DEPLOYMENT.md        # 详细部署文档
    ├── TROUBLESHOOTING.md   # 故障排除指南
    └── DATABASE_MANAGEMENT.md # 数据库管理指南
```

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
docker-compose -p zhiweijz logs -f
```

### 重启服务
```bash
docker-compose -p zhiweijz restart
```

## 🔧 服务组件

| 服务 | 端口 | 描述 |
|------|------|------|
| Nginx | 80/443 | 反向代理和静态资源服务 |
| Frontend | 3000 (内部) | Next.js 前端应用 |
| Backend | 3000 (内部) | Node.js 后端API |
| PostgreSQL | 5432 | 数据库服务 |

> 💡 **端口配置**: 可通过 `.env` 文件自定义端口，避免端口冲突

## 📊 系统要求

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **内存**: 最少 2GB
- **磁盘**: 最少 5GB
- **操作系统**: Linux, macOS, Windows

## 🔧 环境变量配置

复制 `.env.example` 为 `.env` 并根据需要修改：

```bash
# 端口配置（如果默认端口冲突可修改）
NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443
POSTGRES_PORT=5432

# 数据库配置
POSTGRES_DB=zhiweijz
POSTGRES_USER=zhiweijz
POSTGRES_PASSWORD=zhiweijz123

# 安全配置（生产环境必须修改）
JWT_SECRET=your-super-secret-jwt-key
```

## 🔒 默认配置

### 数据库
- **数据库名**: zhiweijz
- **用户名**: zhiweijz
- **密码**: zhiweijz123

### 安全提醒
⚠️ **生产环境请务必修改默认密码和密钥！**

编辑 `.env` 文件：
```bash
POSTGRES_PASSWORD=your-strong-password
JWT_SECRET=your-jwt-secret-key
```

## 🆘 故障排除

### 常见问题

1. **端口冲突**
   ```bash
   # 检查端口占用
   netstat -tulpn | grep :80
   ```

2. **容器启动失败**
   ```bash
   # 查看日志
   docker-compose -p zhiweijz logs <service-name>
   ```

3. **数据库连接失败**
   ```bash
   # 重启数据库
   docker-compose -p zhiweijz restart postgres
   ```

4. **Ubuntu系统Docker镜像拉取失败**
   ```bash
   # 配置系统级Docker镜像源（推荐）
   sudo ./scripts/setup-docker-daemon.sh
   
   # 或手动配置镜像源
   sudo mkdir -p /etc/docker
   sudo nano /etc/docker/daemon.json
   # 添加镜像源配置后重启Docker
   sudo systemctl restart docker
   ```

详细故障排除请参考: 
- [故障排除指南](docs/TROUBLESHOOTING.md)
- [Ubuntu镜像源配置](docs/UBUNTU_MIRRORS.md)

## 📚 文档

- [详细部署文档](docs/DEPLOYMENT.md) - 完整的部署指南和配置说明
- [故障排除指南](docs/TROUBLESHOOTING.md) - 常见问题和解决方案

## 🔄 更新应用

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 重新构建镜像
docker-compose -p zhiweijz build

# 3. 重启服务
docker-compose -p zhiweijz up -d
```

## 💾 数据备份

```bash
# 备份数据库
docker-compose -p zhiweijz exec postgres pg_dump -U zhiweijz zhiweijz > backup.sql

# 恢复数据库
docker-compose -p zhiweijz exec -T postgres psql -U zhiweijz zhiweijz < backup.sql
```

## 🌟 特性

- ✅ **一键部署** - 单个命令完成所有服务部署
- ✅ **自动迁移** - 数据库schema自动初始化和更新
- ✅ **健康检查** - 所有服务都配置了健康检查
- ✅ **日志管理** - 统一的日志收集和查看
- ✅ **性能优化** - Nginx缓存、Gzip压缩、连接池
- ✅ **安全配置** - 请求限流、安全头、网络隔离
- ✅ **数据持久化** - 数据库数据持久化存储
- ✅ **易于维护** - 完整的管理脚本和文档

## 📞 支持

如果遇到问题：

1. 查看 [故障排除文档](docs/TROUBLESHOOTING.md)
2. 检查容器日志: `docker-compose logs`
3. 提交Issue到项目仓库

---

**🎉 享受使用只为记账！**
