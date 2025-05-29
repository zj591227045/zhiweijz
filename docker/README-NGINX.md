# Nginx 配置说明

## 概述

只为记账项目提供了两种Nginx配置方案，以适应不同的部署环境和需求。

## 配置选项

### 1. 完整配置 (推荐)

**文件**: `docker-compose.yml` + `config/nginx.conf`

**特点**:
- 使用通用的 `nginx:1.25-alpine` 镜像
- 完整的性能优化配置
- 包含请求限制和安全头
- 详细的缓存策略
- 完整的健康检查

**适用场景**:
- 生产环境部署
- 需要高性能和安全性
- 系统资源充足

### 2. 简化配置

**文件**: `docker-compose.simple.yml` + `config/nginx-simple.conf`

**特点**:
- 使用通用的 `nginx:1.25-alpine` 镜像
- 简化的配置，减少潜在兼容性问题
- 基础的代理功能
- 简单的健康检查

**适用场景**:
- 开发环境
- 解决兼容性问题
- 系统资源有限
- 快速部署测试

## 主要差异

| 功能 | 完整配置 | 简化配置 |
|------|----------|----------|
| 镜像类型 | 通用镜像 | 通用镜像 |
| 请求限制 | ✅ | ❌ |
| 安全头 | ✅ | ❌ |
| 高级缓存 | ✅ | 基础缓存 |
| Gzip压缩 | 完整配置 | 基础配置 |
| 健康检查 | wget | 无 |
| 性能优化 | 完整 | 基础 |

## 使用方法

### 自动选择 (推荐)

运行启动脚本时会提示选择配置：

```bash
sudo ./start.sh
```

脚本会询问：
```
请选择部署配置:
1. 完整配置 (推荐) - 包含完整的Nginx配置和健康检查
2. 简化配置 - 使用通用Nginx镜像，适合解决兼容性问题

请选择 (1-2，默认为1):
```

### 手动指定

#### 使用完整配置
```bash
docker compose -f docker-compose.yml up -d
```

#### 使用简化配置
```bash
docker compose -f docker-compose.simple.yml up -d
```

## 故障排除

### 段错误 (Segmentation fault)

如果遇到段错误，建议：

1. **首先尝试简化配置**:
   ```bash
   sudo ./start.sh
   # 选择选项 2 (简化配置)
   ```

2. **运行故障排除工具**:
   ```bash
   ./troubleshoot.sh
   ```

3. **手动重启Docker服务**:
   ```bash
   sudo systemctl restart docker
   ```

### 健康检查失败

#### 完整配置
- 检查wget是否可用
- 确认/health端点响应

#### 简化配置
- 无健康检查，减少潜在问题

## 配置文件说明

### nginx.conf (完整配置)
- 包含完整的性能优化
- 请求速率限制
- 安全头设置
- 详细的缓存策略
- 上游服务器负载均衡

### nginx-simple.conf (简化配置)
- 基础的代理配置
- 简单的Gzip压缩
- 基础缓存设置
- 最小化的配置项

## 迁移指南

### 从自定义构建迁移到通用镜像

原来的配置：
```yaml
nginx:
  build:
    context: .
    dockerfile: config/nginx.Dockerfile
```

新的配置：
```yaml
nginx:
  image: nginx:1.25-alpine
  volumes:
    - ./config/nginx.conf:/etc/nginx/nginx.conf:ro
```

**优势**:
- 无需构建时间
- 减少镜像大小
- 更好的兼容性
- 更快的部署速度

## 性能对比

| 指标 | 完整配置 | 简化配置 |
|------|----------|----------|
| 启动时间 | 稍慢 | 更快 |
| 内存使用 | 稍高 | 更低 |
| 响应速度 | 优化 | 标准 |
| 安全性 | 高 | 基础 |
| 兼容性 | 良好 | 最佳 |

## 建议

1. **生产环境**: 使用完整配置
2. **开发测试**: 使用简化配置
3. **遇到问题**: 先尝试简化配置
4. **性能要求高**: 使用完整配置
5. **快速部署**: 使用简化配置

## 自定义配置

如需自定义Nginx配置：

1. 复制现有配置文件
2. 根据需求修改
3. 更新docker-compose.yml中的volume挂载路径
4. 重启服务

```bash
cp config/nginx-simple.conf config/nginx-custom.conf
# 编辑 nginx-custom.conf
# 更新 docker-compose.yml
docker compose restart nginx
``` 