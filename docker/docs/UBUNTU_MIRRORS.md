# Ubuntu Docker 镜像源配置指南

## 🚨 问题描述

在Ubuntu系统上，Docker镜像拉取经常遇到超时或速度慢的问题，特别是在中国大陆地区。

## 🔧 解决方案

### 方案1：配置系统级Docker镜像源（推荐）

这是最有效的解决方案，配置Docker daemon使用国内镜像源：

```bash
# 运行系统级镜像源配置脚本
sudo ./scripts/setup-docker-daemon.sh
```

**脚本功能：**
- 自动备份现有配置
- 配置多个国内镜像源
- 重启Docker服务
- 测试镜像拉取功能

### 方案2：手动配置Docker镜像源

如果脚本无法运行，可以手动配置：

```bash
# 1. 创建或编辑Docker配置文件
sudo mkdir -p /etc/docker
sudo nano /etc/docker/daemon.json

# 2. 添加以下内容
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://docker.1ms.run",
    "https://ccr.ccs.tencentyun.com",
    "https://docker.xuanyuan.me",
    "https://dockers.xuanyuan.me"
  ]
}

# 3. 重启Docker服务
sudo systemctl restart docker

# 4. 验证配置
docker info | grep -A 10 "Registry Mirrors"
```

### 方案3：使用代理

如果镜像源仍然不稳定，可以配置HTTP代理：

```bash
# 创建Docker服务配置目录
sudo mkdir -p /etc/systemd/system/docker.service.d

# 创建代理配置文件
sudo nano /etc/systemd/system/docker.service.d/http-proxy.conf

# 添加代理配置
[Service]
Environment="HTTP_PROXY=http://proxy.example.com:8080"
Environment="HTTPS_PROXY=http://proxy.example.com:8080"
Environment="NO_PROXY=localhost,127.0.0.1"

# 重新加载配置并重启Docker
sudo systemctl daemon-reload
sudo systemctl restart docker
```

## 🧪 测试镜像源

配置完成后，测试镜像拉取：

```bash
# 测试拉取小镜像
docker pull hello-world:latest

# 测试拉取应用镜像
docker pull postgres:15-alpine
docker pull node:18-alpine
```

## 🔍 故障排除

### 1. 检查Docker状态
```bash
sudo systemctl status docker
```

### 2. 查看Docker日志
```bash
sudo journalctl -u docker.service -f
```

### 3. 检查网络连接
```bash
# 测试镜像源连通性
curl -I https://docker.m.daocloud.io/v2/
curl -I https://docker.1ms.run/v2/
```

### 4. 清理Docker缓存
```bash
# 清理所有未使用的镜像
docker system prune -a

# 重新拉取镜像
docker-compose pull
```

## 📋 常用命令

```bash
# 查看当前镜像源配置
docker info | grep -A 10 "Registry Mirrors"

# 测试镜像源脚本
sudo ./scripts/setup-docker-daemon.sh --test

# 恢复原始配置
sudo ./scripts/setup-docker-daemon.sh --restore

# 查看Docker版本
docker --version
docker-compose --version
```

## 🌟 推荐镜像源

按速度和稳定性排序：

1. **DaoCloud**: https://docker.m.daocloud.io
2. **1ms**: https://docker.1ms.run  
3. **腾讯云**: https://ccr.ccs.tencentyun.com
4. **轩辕镜像**: https://docker.xuanyuan.me
5. **轩辕镜像2**: https://dockers.xuanyuan.me

## ⚠️ 注意事项

1. **权限要求**: 配置系统镜像源需要root权限
2. **服务重启**: 修改配置后必须重启Docker服务
3. **网络环境**: 不同网络环境下镜像源速度可能不同
4. **定期更新**: 镜像源地址可能会变化，建议定期检查更新

## 🆘 获取帮助

如果仍然遇到问题：

1. 查看详细错误日志
2. 尝试不同的镜像源
3. 检查防火墙设置
4. 联系网络管理员

---

**💡 提示**: 配置完镜像源后，建议重新运行 `./scripts/start.sh` 启动应用。 