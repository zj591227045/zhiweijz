# 只为记账 - SSL HTTPS 部署指南

## 概述

本指南介绍如何部署包含自动SSL证书生成的nginx反向代理，解决以下问题：

1. ✅ **HTTP连接支持** - 允许Android应用连接HTTP地址
2. ✅ **HTTPS自签名证书** - 自动生成并应用SSL证书
3. ✅ **端口保留修复** - 修复nginx代理时端口丢失问题
4. ✅ **证书持久化** - SSL证书在容器重启后保持有效

## 新增功能

### 🔐 自动SSL证书生成

- 容器启动时自动生成自签名SSL证书
- 支持多个域名和IP地址
- 证书有效期1年，自动检查过期时间
- 证书持久化存储，重启后保持有效

### 🌐 支持的域名和IP

证书包含以下Subject Alternative Names (SAN)：

**域名：**
- `localhost`
- `*.localhost`
- `app.zhiweijz.cn`
- `*.zhiweijz.cn`

**IP地址：**
- `127.0.0.1` (本地回环)
- `::1` (IPv6本地回环)
- `0.0.0.0` (通配符)
- `10.255.0.97` (您的服务器IP)
- `192.168.1.1` (常见网关)
- `192.168.0.1` (常见网关)

### 🔧 nginx配置改进

1. **HTTP到HTTPS重定向** - 除健康检查外，所有HTTP请求重定向到HTTPS
2. **端口保留修复** - 使用`$http_host`替代`$host`，保留端口信息
3. **SSL安全配置** - 现代TLS配置，支持TLS 1.2和1.3
4. **HSTS头** - 强制HTTPS安全传输

## 部署步骤

### 1. 构建nginx镜像

```bash
# 构建包含SSL支持的nginx镜像
./docker/build-nginx.sh
```

### 2. 更新docker-compose配置

docker-compose.yml已更新，包含：
- SSL证书持久化卷
- HTTPS端口映射
- 更新的健康检查

### 3. 启动服务

```bash
# 启动所有服务
docker-compose -f docker/docker-compose.yml up -d

# 查看nginx日志
docker logs zhiweijz-nginx -f
```

### 4. 验证部署

```bash
# 测试HTTP（会重定向到HTTPS）
curl -I http://localhost:8080/health

# 测试HTTPS（忽略证书警告）
curl -k -I https://localhost:8443/health

# 查看证书信息
openssl s_client -connect localhost:8443 -servername localhost < /dev/null
```

## 端口配置

通过环境变量配置端口：

```bash
# 设置自定义端口
export NGINX_HTTP_PORT=8080
export NGINX_HTTPS_PORT=8443

# 启动服务
docker-compose -f docker/docker-compose.yml up -d
```

## Android应用配置

### HTTP连接支持

Android应用已配置为支持HTTP连接：

1. **AndroidManifest.xml** - 启用`usesCleartextTraffic`
2. **网络安全配置** - 允许特定域名的HTTP连接
3. **信任所有证书** - 在调试版本中接受自签名证书

### API端点配置

移动端API配置已更新：

```typescript
// 生产环境使用HTTPS
const PROD_API_BASE_URL = 'https://app.zhiweijz.cn:1443/api';

// 支持HTTP备用连接
const DEV_API_BASE_URL = 'http://localhost:3001/api';
```

## 故障排除

### 证书问题

```bash
# 查看证书详情
docker exec zhiweijz-nginx openssl x509 -in /etc/ssl/certs/nginx-selfsigned.crt -text -noout

# 重新生成证书
docker exec zhiweijz-nginx rm -f /etc/ssl/certs/nginx-selfsigned.crt /etc/ssl/private/nginx-selfsigned.key
docker restart zhiweijz-nginx
```

### 端口重定向问题

如果仍然遇到端口丢失问题：

1. 检查nginx配置中的`proxy_set_header Host $http_host;`
2. 确认后端Express应用设置了`app.set('trust proxy', true);`
3. 查看nginx日志：`docker logs zhiweijz-nginx`

### 连接测试

```bash
# 测试不同端口的连接
curl -k https://10.255.0.97:8443/api/health
curl http://10.255.0.97:8080/api/health  # 应该重定向到HTTPS
```

## 安全注意事项

1. **自签名证书** - 仅用于开发和测试环境
2. **生产环境** - 建议使用Let's Encrypt或商业CA证书
3. **证书验证** - 客户端需要配置信任自签名证书
4. **HTTPS强制** - 除健康检查外，所有流量强制使用HTTPS

## 文件结构

```
docker/
├── config/
│   ├── nginx.conf              # nginx主配置（支持HTTPS）
│   ├── nginx.Dockerfile        # nginx镜像构建文件
│   ├── generate-ssl-cert.sh    # SSL证书生成脚本
│   └── start-nginx.sh          # nginx启动脚本
├── docker-compose.yml          # 服务编排配置
├── build-nginx.sh              # 镜像构建脚本
└── test-ssl.sh                 # SSL配置测试脚本
```

## 更新日志

- ✅ 修复nginx端口重定向问题
- ✅ 添加自动SSL证书生成
- ✅ 配置HTTPS强制重定向
- ✅ 更新Android应用网络安全配置
- ✅ 添加证书持久化存储
- ✅ 优化健康检查配置 