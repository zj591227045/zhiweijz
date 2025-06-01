# 只为记账 Docker 部署包

## 🚀 一键部署

这是只为记账应用的完整Docker部署解决方案，包含数据库、后端、前端和Nginx反向代理的一键部署配置。

### ⚡ 快速开始

#### 🚀 方法一：一键启动脚本（推荐新手）

```bash
# 1. 进入docker目录
cd docker

# 2. 配置环境变量（可选）
cp .env.example .env

# 3. 一键启动
./start.sh
```

**一键脚本的优势：**
- ✅ 自动环境检查和系统资源验证
- ✅ 智能版本管理和镜像拉取
- ✅ 国内镜像源自动配置
- ✅ 详细的健康检查和网络诊断
- ✅ 彩色日志和用户友好的反馈
- ✅ 自动显示访问地址和管理命令

#### ⚡ 方法二：直接启动（适合熟悉Docker用户）

```bash
# 1. 进入docker目录
cd docker

# 2. 直接启动所有服务
docker compose up -d

# 3. 查看服务状态
docker compose ps

# 4. 查看日志
docker compose logs -f
```

**直接启动的特点：**
- ✅ 快速启动，无额外检查
- ✅ 标准 Docker Compose 操作
- ⚠️ 需要手动处理镜像拉取和版本管理
- ⚠️ 需要手动验证服务健康状态

#### 🤔 选择建议

| 场景 | 推荐方式 | 原因 |
|------|----------|------|
| **首次部署** | 一键脚本 | 完整的环境检查和配置验证 |
| **生产环境** | 一键脚本 | 健康检查和错误处理更完善 |
| **开发调试** | 直接启动 | 快速重启，便于调试 |
| **CI/CD** | 直接启动 | 标准化操作，便于自动化 |
| **网络问题** | 一键脚本 | 自动配置镜像源，解决下载问题 |

### 🔧 版本管理

启动脚本会自动从 `docker-compose.yml` 文件中读取并解析各个服务的镜像版本：

- **自动解析**: 脚本会解析配置文件中的镜像版本号
- **版本确认**: 启动前会显示所有镜像版本供用户确认
- **灵活配置**: 支持使用不同的配置文件指定不同版本

#### 配置文件选项

1. **完整配置** (`docker-compose.yml`) - 推荐使用，包含完整功能
2. **简化配置** (`docker-compose.simple.yml`) - 使用通用镜像，兼容性更好

#### 自定义镜像版本

要使用特定版本的镜像，只需修改 `docker-compose.yml` 文件中的镜像标签：

```yaml
services:
  backend:
    image: zj591227045/zhiweijz-backend:v1.2.0  # 指定版本

  frontend:
    image: zj591227045/zhiweijz-frontend:v1.1.5  # 指定版本

  nginx:
    image: zj591227045/zhiweijz-nginx:v2.0.1     # 指定版本
```

启动脚本会自动检测并使用指定的版本。

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
├── start.sh                  # 启动脚本
├── stop.sh                   # 停止脚本
├── update.sh                 # 镜像更新脚本
├── .env.example              # 环境变量模板
├── config/                   # 配置文件
│   ├── init.sql             # 数据库初始化脚本
│   ├── nginx.conf           # Nginx 配置
│   └── nginx.Dockerfile     # Nginx 镜像构建文件
├── scripts/                  # 其他管理脚本
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
./start.sh
```

### 停止服务
```bash
./stop.sh
```

### 更新镜像
```bash
# 更新所有组件
./update.sh

# 更新指定组件
./update.sh backend
```

### 清理所有数据
```bash
./stop.sh --clean
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
| Frontend | 3001 (内部) | Next.js 前端应用 |
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

## 🔄 镜像更新

### ⚡ 一键更新脚本

使用 `update.sh` 脚本可以轻松更新所有组件或单独更新指定组件：

```bash
# 更新所有组件到最新版本
./update.sh

# 更新所有组件到指定版本
./update.sh -v 0.1.1

# 仅更新后端服务
./update.sh backend

# 仅更新前端服务
./update.sh frontend

# 仅更新Nginx服务
./update.sh nginx
```

### 🔍 预览模式（推荐）

在实际更新前，建议使用预览模式查看将要执行的操作：

```bash
# 预览更新所有组件
./update.sh --dry-run -v 0.1.1

# 预览更新单个组件
./update.sh --dry-run backend 0.1.1
```

### 🛠️ 高级选项

```bash
# 更新但不重启服务（适用于维护窗口）
./update.sh --no-restart -v 0.1.1

# 指定Docker Hub用户名
./update.sh -u your_username -v 0.1.1

# 查看帮助信息
./update.sh --help
```

### 📋 支持的组件

| 组件 | 镜像名称 | 说明 |
|------|----------|------|
| `backend` | `zj591227045/zhiweijz-backend` | 后端API服务 |
| `frontend` | `zj591227045/zhiweijz-frontend` | 前端Web应用 |
| `nginx` | `zj591227045/zhiweijz-nginx` | Nginx反向代理 |

### 🔧 环境变量配置

可以通过环境变量设置默认值：

```bash
export DOCKER_USER="your_username"
export VERSION="0.1.1"
./update.sh
```

### 🛡️ 安全特性

- **自动备份**: 更新前自动备份 `docker-compose.yml`
- **预览模式**: `--dry-run` 安全预览所有操作
- **错误处理**: 详细的错误信息和恢复建议
- **超时保护**: 防止网络问题导致长时间等待

### 📝 更新流程

1. **环境检查** - 验证Docker环境
2. **版本显示** - 展示当前版本信息
3. **镜像验证** - 检查目标镜像是否存在
4. **镜像拉取** - 从Docker Hub拉取镜像
5. **配置更新** - 修改docker-compose.yml
6. **服务重启** - 重启相关服务
7. **结果验证** - 显示更新后状态

### 🚨 注意事项

- 更新过程中服务会短暂中断
- 建议在维护窗口期间进行更新
- 生产环境请先使用 `--dry-run` 预览操作
- 确保有足够磁盘空间存储新镜像

### 📊 手动更新方式

如果需要手动更新，可以使用以下命令：

```bash
# 1. 停止当前服务
./stop.sh

# 2. 拉取最新镜像
docker pull zj591227045/zhiweijz-frontend:latest
docker pull zj591227045/zhiweijz-backend:latest
docker pull zj591227045/zhiweijz-nginx:latest

# 3. 重新启动服务
./start.sh
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
- ✅ **一键更新** - 智能镜像更新脚本，支持全量和增量更新
- ✅ **自动迁移** - 数据库schema自动初始化和更新
- ✅ **健康检查** - 所有服务都配置了健康检查
- ✅ **日志管理** - 统一的日志收集和查看
- ✅ **性能优化** - Nginx缓存、Gzip压缩、连接池
- ✅ **安全配置** - 请求限流、安全头、网络隔离
- ✅ **数据持久化** - 数据库数据持久化存储
- ✅ **易于维护** - 完整的管理脚本和文档
- ✅ **DockerHub镜像** - 使用预构建镜像，快速部署
- ✅ **预览模式** - 安全的dry-run模式预览所有操作

## 📞 支持

如果遇到问题：

1. 查看 [故障排除文档](docs/TROUBLESHOOTING.md)
2. 检查容器日志: `docker-compose logs`
3. 提交Issue到项目仓库

---

**🎉 享受使用只为记账！**