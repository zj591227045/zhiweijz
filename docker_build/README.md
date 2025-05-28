# 只为记账 - Docker多平台构建和部署

本目录包含了只为记账项目的Docker多平台构建和部署脚本，支持ARM64和AMD64架构。

## 📁 文件说明

- `build-and-push.sh` - 完整构建和推送脚本
- `update-images.sh` - 快速更新脚本
- `docker-compose.yml` - 生产环境部署配置
- `.env` - 环境变量配置文件

## 🚀 快速开始

### 1. 配置环境变量

首次使用前，需要配置Docker Hub凭据：

```bash
# 复制环境变量模板
cp docker_build/.env.example docker_build/.env

# 编辑 .env 文件，填入您的Docker Hub凭据
# DOCKER_USERNAME=your_dockerhub_username
# DOCKER_PASSWORD=your_dockerhub_password_or_token
```

### 2. 首次完整构建

```bash
# 构建所有镜像并推送到DockerHub
./docker_build/build-and-push.sh

# 或指定版本号
./docker_build/build-and-push.sh v1.0.0
```

### 3. 快速更新镜像

```bash
# 交互式选择要更新的镜像
./docker_build/update-images.sh

# 指定版本号更新
./docker_build/update-images.sh v1.0.1
```

### 4. 部署到生产环境

```bash
# 使用DockerHub镜像部署
cd docker_build
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

## 🔧 环境要求

### Mac M2 笔记本要求

✅ **您的Mac M2笔记本完全支持多平台构建！**

- Docker Desktop for Mac (支持buildx)
- 网络连接正常
- 足够的磁盘空间 (建议至少10GB)

### 系统检查

```bash
# 检查Docker版本
docker --version

# 检查buildx支持
docker buildx version

# 检查支持的平台
docker buildx ls
```

## 📦 构建的镜像

| 镜像名称 | 用途 | 支持平台 |
|---------|------|----------|
| `zj591227045/zhiweijz-frontend` | Next.js前端应用 | linux/amd64, linux/arm64 |
| `zj591227045/zhiweijz-backend` | Node.js后端API | linux/amd64, linux/arm64 |
| `zj591227045/zhiweijz-nginx` | Nginx反向代理 | linux/amd64, linux/arm64 |

## 🛠️ 脚本功能

### build-and-push.sh

- ✅ 自动检查Docker环境
- ✅ 设置多平台buildx构建器
- ✅ 自动登录DockerHub
- ✅ 构建前端、后端、Nginx镜像
- ✅ 推送到DockerHub
- ✅ 验证镜像完整性
- ✅ 显示构建信息和使用方法

### update-images.sh

- ✅ 交互式选择要更新的镜像
- ✅ 支持单独更新前端/后端/Nginx
- ✅ 自动生成时间戳版本号
- ✅ 快速构建和推送
- ✅ 显示更新结果

## 🔐 安全配置

### 环境变量配置

所有敏感信息都通过环境变量配置，不会硬编码在脚本中：

```bash
# .env 文件配置示例
DOCKER_USERNAME=your_dockerhub_username
DOCKER_PASSWORD=your_dockerhub_password_or_token
PLATFORMS=linux/amd64,linux/arm64
VERSION=latest
```

### 安全最佳实践

1. **保护 .env 文件**: 确保 `.env` 文件不被提交到版本控制
2. **使用访问令牌**: 建议使用Docker Hub访问令牌而不是密码
3. **定期轮换凭据**: 定期更新Docker Hub访问令牌
4. **权限最小化**: Docker Hub令牌只授予必要的权限

> ✅ **安全改进**: 现在所有凭据都通过 `.env` 文件配置，脚本中不包含任何硬编码的敏感信息。

## 📊 构建时间预估

基于Mac M2性能，预估构建时间：

| 镜像 | 首次构建 | 增量构建 |
|------|----------|----------|
| 后端 | 8-12分钟 | 3-5分钟 |
| 前端 | 10-15分钟 | 4-6分钟 |
| Nginx | 2-3分钟 | 1-2分钟 |
| **总计** | **20-30分钟** | **8-13分钟** |

## 🚀 部署选项

### 选项1: 使用最新镜像

```bash
cd docker_build
docker-compose up -d
```

### 选项2: 使用特定版本

```bash
# 修改docker-compose.yml中的镜像标签
# 例如: zj591227045/zhiweijz-frontend:v1.0.0
docker-compose up -d
```

### 选项3: 本地构建部署

```bash
# 使用项目根目录的docker-compose.yml
cd ..
docker-compose -f docker/docker-compose.yml up -d
```

## 🔍 故障排除

### 常见问题

1. **buildx不可用**
   ```bash
   # 启用buildx
   docker buildx install
   ```

2. **平台不支持**
   ```bash
   # 检查可用平台
   docker buildx inspect --bootstrap
   ```

3. **推送失败**
   ```bash
   # 重新登录DockerHub
   docker login
   ```

4. **构建内存不足**
   ```bash
   # 增加Docker内存限制 (Docker Desktop设置)
   # 建议至少分配8GB内存
   ```

### 日志查看

```bash
# 查看构建日志
docker buildx build --progress=plain ...

# 查看容器日志
docker-compose logs -f [service_name]
```

## 📈 性能优化

### 构建优化

1. **使用构建缓存**
   ```bash
   # buildx会自动使用缓存，无需额外配置
   ```

2. **并行构建**
   ```bash
   # 脚本已优化构建顺序：后端 -> 前端 -> Nginx
   ```

3. **镜像层优化**
   - Dockerfile已使用多阶段构建
   - 优化了依赖安装顺序
   - 最小化最终镜像大小

## 🔄 CI/CD集成

可以将这些脚本集成到CI/CD流水线中：

```yaml
# GitHub Actions示例
- name: Build and Push Docker Images
  run: |
    chmod +x docker_build/build-and-push.sh
    ./docker_build/build-and-push.sh ${{ github.sha }}
```

## 📞 支持

如果遇到问题，请检查：

1. Docker Desktop是否正常运行
2. 网络连接是否稳定
3. 磁盘空间是否充足
4. DockerHub凭据是否正确

---

**🎉 现在您可以在Mac M2上轻松构建和部署多平台Docker镜像了！**
