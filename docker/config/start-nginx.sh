#!/bin/bash
set -e

echo "🚀 启动只为记账 Nginx 服务..."

# 生成SSL证书
echo "🔐 检查并生成SSL证书..."
/usr/local/bin/generate-ssl-cert.sh

# 测试nginx配置
echo "🔧 测试nginx配置..."
nginx -t

# 启动nginx
echo "✅ 启动nginx服务..."
exec nginx -g "daemon off;" 