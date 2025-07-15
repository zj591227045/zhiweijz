#!/bin/bash

# 只为记账 - Nginx镜像构建脚本
# 构建包含SSL自签名证书支持的nginx镜像

set -e

# 配置
IMAGE_NAME="zj591227045/zhiweijz-nginx"
TAG="0.5.0"
DOCKERFILE="docker/Dockerfile.nginx"

echo "🐳 构建只为记账 Nginx 镜像（包含SSL支持）..."

# 检查必要文件
echo "📋 检查必要文件..."
required_files=(
    "docker/config/nginx.conf"
    "docker/config/docker-entrypoint.sh"
    "$DOCKERFILE"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ 缺少必要文件: $file"
        exit 1
    fi
    echo "✅ $file"
done

# 设置启动脚本权限
chmod +x docker/config/docker-entrypoint.sh

# 构建镜像
echo "🔨 构建Docker镜像..."
docker build \
    -f "$DOCKERFILE" \
    -t "$IMAGE_NAME:$TAG" \
    -t "$IMAGE_NAME:latest" \
    .

echo "✅ 镜像构建完成: $IMAGE_NAME:$TAG"

# 显示镜像信息
echo "📋 镜像信息:"
docker images "$IMAGE_NAME" --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"

echo ""
echo "🚀 使用方法:"
echo "  docker run -d -p 80:80 -p 443:443 $IMAGE_NAME:$TAG"
echo ""
echo "📝 推送到仓库:"
echo "  docker push $IMAGE_NAME:$TAG"
echo "  docker push $IMAGE_NAME:latest" 