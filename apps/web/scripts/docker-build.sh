#!/bin/bash

# Docker构建脚本 - 前端Web应用

set -e

echo "🚀 开始构建前端Docker镜像..."

# 设置变量
IMAGE_NAME=${1:-"zhiweijz/web-frontend"}
IMAGE_TAG=${2:-"latest"}
PLATFORM=${3:-"linux/amd64"}

echo "📦 构建参数:"
echo "  镜像名称: $IMAGE_NAME"
echo "  镜像标签: $IMAGE_TAG"
echo "  目标平台: $PLATFORM"

# 切换到项目根目录
cd "$(dirname "$0")/../../../"

echo "📂 当前工作目录: $(pwd)"

# 构建Docker镜像
echo "🔨 开始构建..."
docker buildx build \
  --platform $PLATFORM \
  --file apps/web/Dockerfile \
  --tag "$IMAGE_NAME:$IMAGE_TAG" \
  --load \
  .

echo "✅ 前端Docker镜像构建完成!"
echo "🏷️  镜像标签: $IMAGE_NAME:$IMAGE_TAG"

# 显示镜像信息
echo "📊 镜像信息:"
docker images "$IMAGE_NAME:$IMAGE_TAG"

echo "🎉 构建成功完成!" 