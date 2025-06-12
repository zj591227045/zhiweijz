#!/bin/bash

# 只为记账 - SSL证书生成脚本
# 在nginx容器启动时自动生成自签名证书

set -e

# 证书配置
CERT_DIR="/etc/ssl/certs"
KEY_DIR="/etc/ssl/private"
CERT_FILE="$CERT_DIR/nginx-selfsigned.crt"
KEY_FILE="$KEY_DIR/nginx-selfsigned.key"

# 创建必要的目录
mkdir -p "$CERT_DIR"
mkdir -p "$KEY_DIR"

# 检查证书是否已存在且有效
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    # 检查证书是否在30天内过期
    if openssl x509 -checkend 2592000 -noout -in "$CERT_FILE" >/dev/null 2>&1; then
        echo "✅ SSL证书已存在且有效，跳过生成"
        exit 0
    else
        echo "⚠️ SSL证书即将过期，重新生成..."
        rm -f "$CERT_FILE" "$KEY_FILE"
    fi
fi

echo "🔐 生成自签名SSL证书..."

# 生成私钥
openssl genrsa -out "$KEY_FILE" 2048

# 生成证书签名请求配置
cat > /tmp/cert.conf <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=CN
ST=Beijing
L=Beijing
O=ZhiWeiJZ
OU=IT Department
CN=localhost

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = *.localhost
DNS.3 = app.zhiweijz.cn
DNS.4 = *.zhiweijz.cn
IP.1 = 127.0.0.1
IP.2 = ::1
IP.3 = 0.0.0.0
IP.4 = 10.255.0.97
IP.5 = 192.168.1.1
IP.6 = 192.168.0.1
EOF

# 生成自签名证书（有效期1年）
openssl req -new -x509 -key "$KEY_FILE" -out "$CERT_FILE" -days 365 -config /tmp/cert.conf -extensions v3_req

# 设置正确的权限
chmod 644 "$CERT_FILE"
chmod 600 "$KEY_FILE"

# 只在Docker环境中设置所有者（避免在macOS等系统中出错）
if [ -f /.dockerenv ] || [ "$DOCKER_ENV" = "true" ]; then
    chown root:root "$CERT_FILE" "$KEY_FILE" 2>/dev/null || true
fi

# 清理临时文件
rm -f /tmp/cert.conf

echo "✅ SSL证书生成完成"
echo "📄 证书文件: $CERT_FILE"
echo "🔑 私钥文件: $KEY_FILE"

# 显示证书信息
echo "📋 证书信息:"
openssl x509 -in "$CERT_FILE" -text -noout | grep -E "(Subject:|DNS:|IP Address:|Not Before|Not After)" || true

echo "🚀 SSL证书配置完成，nginx即将启动..." 