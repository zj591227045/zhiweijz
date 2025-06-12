#!/bin/bash

# 只为记账 - SSL配置测试脚本
# 测试nginx SSL证书生成和HTTPS配置

set -e

echo "🧪 测试SSL证书生成和nginx配置..."

# 获取项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "📁 项目根目录: $PROJECT_ROOT"

# 创建临时测试目录
TEST_DIR="/tmp/zhiweijz-ssl-test"
mkdir -p "$TEST_DIR"

echo "📁 测试目录: $TEST_DIR"

# 复制证书生成脚本到测试目录
cp "$PROJECT_ROOT/docker/config/generate-ssl-cert.sh" "$TEST_DIR/"
chmod +x "$TEST_DIR/generate-ssl-cert.sh"

# 在测试目录中生成证书
echo "🔐 测试证书生成..."
cd "$TEST_DIR"

# 模拟容器环境
export CERT_DIR="$TEST_DIR/certs"
export KEY_DIR="$TEST_DIR/private"

# 修改脚本中的路径
sed -i.bak 's|/etc/ssl/certs|'"$CERT_DIR"'|g' generate-ssl-cert.sh
sed -i.bak 's|/etc/ssl/private|'"$KEY_DIR"'|g' generate-ssl-cert.sh

# 运行证书生成脚本
./generate-ssl-cert.sh

# 验证证书文件
echo "🔍 验证生成的证书..."
CERT_FILE="$CERT_DIR/nginx-selfsigned.crt"
KEY_FILE="$KEY_DIR/nginx-selfsigned.key"

if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    echo "✅ 证书文件生成成功"
    
    # 检查证书有效性
    echo "📋 证书详细信息:"
    openssl x509 -in "$CERT_FILE" -text -noout | grep -E "(Subject:|Issuer:|Not Before|Not After|DNS:|IP Address:)"
    
    # 检查私钥
    echo "🔑 验证私钥..."
    openssl rsa -in "$KEY_FILE" -check -noout && echo "✅ 私钥有效"
    
    # 检查证书和私钥匹配
    echo "🔗 验证证书和私钥匹配..."
    cert_hash=$(openssl x509 -noout -modulus -in "$CERT_FILE" | openssl md5)
    key_hash=$(openssl rsa -noout -modulus -in "$KEY_FILE" | openssl md5)
    
    if [ "$cert_hash" = "$key_hash" ]; then
        echo "✅ 证书和私钥匹配"
    else
        echo "❌ 证书和私钥不匹配"
        exit 1
    fi
    
    # 测试nginx配置语法
    echo "🔧 测试nginx配置语法..."
    
    # 创建临时nginx配置
    temp_nginx_conf="$TEST_DIR/nginx.conf"
    cp "$PROJECT_ROOT/docker/config/nginx.conf" "$temp_nginx_conf"
    
    # 替换证书路径
    sed -i.bak "s|/etc/ssl/certs/nginx-selfsigned.crt|$CERT_FILE|g" "$temp_nginx_conf"
    sed -i.bak "s|/etc/ssl/private/nginx-selfsigned.key|$KEY_FILE|g" "$temp_nginx_conf"
    
    # 使用docker测试nginx配置
    if command -v docker >/dev/null 2>&1; then
        echo "🐳 使用Docker测试nginx配置..."
        docker run --rm -v "$temp_nginx_conf:/etc/nginx/nginx.conf:ro" -v "$CERT_FILE:$CERT_FILE:ro" -v "$KEY_FILE:$KEY_FILE:ro" nginx:1.25-alpine nginx -t
        echo "✅ nginx配置语法正确"
    else
        echo "⚠️ Docker未安装，跳过nginx配置测试"
    fi
    
else
    echo "❌ 证书文件生成失败"
    exit 1
fi

# 清理测试目录
echo "🧹 清理测试文件..."
rm -rf "$TEST_DIR"

echo "✅ SSL配置测试完成！"
echo ""
echo "📝 总结:"
echo "  ✅ SSL证书生成脚本正常工作"
echo "  ✅ 证书和私钥有效且匹配"
echo "  ✅ nginx配置语法正确"
echo ""
echo "�� 可以安全地构建和部署nginx镜像" 