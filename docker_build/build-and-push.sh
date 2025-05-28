#!/bin/bash

# 只为记账 - Docker多平台构建和推送脚本
# 支持ARM64和AMD64平台

set -e

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：加载环境变量
load_env() {
    local env_file="$SCRIPT_DIR/.env"

    if [ ! -f "$env_file" ]; then
        print_message $RED "❌ 环境变量文件不存在: $env_file"
        print_message $YELLOW "请创建 .env 文件并配置以下变量:"
        echo "DOCKER_USERNAME=your_dockerhub_username"
        echo "DOCKER_PASSWORD=your_dockerhub_password_or_token"
        echo "PLATFORMS=linux/amd64,linux/arm64"
        echo "VERSION=latest"
        exit 1
    fi

    # 加载环境变量
    set -a
    source "$env_file"
    set +a

    print_message $BLUE "✓ 已加载环境变量文件: $env_file"
}

# 函数：打印消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 函数：验证必需的环境变量
validate_env() {
    print_message $BLUE "验证环境变量..."

    local required_vars=("DOCKER_USERNAME" "DOCKER_PASSWORD" "PLATFORMS")
    local missing_vars=()

    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done

    if [ ${#missing_vars[@]} -gt 0 ]; then
        print_message $RED "❌ 缺少必需的环境变量:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        print_message $YELLOW "请在 $SCRIPT_DIR/.env 文件中配置这些变量"
        exit 1
    fi

    print_message $GREEN "✓ 环境变量验证通过"
}

# 加载环境变量
load_env

# 配置变量 (从环境变量获取，支持命令行参数覆盖)
VERSION=${1:-${VERSION:-"latest"}}
PLATFORMS=${PLATFORMS:-"linux/amd64,linux/arm64"}

# 镜像名称
FRONTEND_IMAGE="${DOCKER_USERNAME}/zhiweijz-frontend"
BACKEND_IMAGE="${DOCKER_USERNAME}/zhiweijz-backend"
NGINX_IMAGE="${DOCKER_USERNAME}/zhiweijz-nginx"

# 函数：打印消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 函数：检查Docker环境
check_docker() {
    print_message $BLUE "检查Docker环境..."

    if ! command -v docker &> /dev/null; then
        print_message $RED "❌ Docker未安装"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_message $RED "❌ Docker服务未运行"
        exit 1
    fi

    # 检查buildx是否可用
    if ! docker buildx version &> /dev/null; then
        print_message $RED "❌ Docker buildx不可用"
        exit 1
    fi

    print_message $GREEN "✓ Docker环境正常"
}

# 函数：设置buildx
setup_buildx() {
    print_message $BLUE "设置Docker buildx..."

    # 删除已存在的builder（如果有）
    docker buildx rm zhiweijz-builder 2>/dev/null || true

    # 创建新的builder实例
    docker buildx create --name zhiweijz-builder --driver docker-container --use --bootstrap

    # 检查支持的平台
    print_message $BLUE "检查支持的平台..."
    docker buildx inspect --bootstrap

    print_message $GREEN "✓ buildx设置完成"
}

# 函数：登录Docker Hub
docker_login() {
    print_message $BLUE "登录Docker Hub..."

    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

    if [ $? -eq 0 ]; then
        print_message $GREEN "✓ Docker Hub登录成功"
    else
        print_message $RED "❌ Docker Hub登录失败"
        exit 1
    fi
}

# 函数：构建前端镜像
build_frontend() {
    print_message $BLUE "构建前端镜像..."

    cd "$(dirname "$0")/.."

    # 检查Dockerfile是否存在
    if [ ! -f "apps/web/Dockerfile" ]; then
        print_message $RED "❌ 前端Dockerfile不存在: apps/web/Dockerfile"
        exit 1
    fi

    docker buildx build \
        --platform $PLATFORMS \
        --file apps/web/Dockerfile \
        --tag "${FRONTEND_IMAGE}:${VERSION}" \
        --tag "${FRONTEND_IMAGE}:latest" \
        --push \
        --progress=plain \
        .

    if [ $? -eq 0 ]; then
        print_message $GREEN "✓ 前端镜像构建完成"
    else
        print_message $RED "❌ 前端镜像构建失败"
        exit 1
    fi
}

# 函数：构建后端镜像
build_backend() {
    print_message $BLUE "构建后端镜像..."

    cd "$(dirname "$0")/.."

    # 检查Dockerfile是否存在
    if [ ! -f "server/Dockerfile" ]; then
        print_message $RED "❌ 后端Dockerfile不存在: server/Dockerfile"
        exit 1
    fi

    docker buildx build \
        --platform $PLATFORMS \
        --file server/Dockerfile \
        --tag "${BACKEND_IMAGE}:${VERSION}" \
        --tag "${BACKEND_IMAGE}:latest" \
        --push \
        --progress=plain \
        .

    if [ $? -eq 0 ]; then
        print_message $GREEN "✓ 后端镜像构建完成"
    else
        print_message $RED "❌ 后端镜像构建失败"
        exit 1
    fi
}

# 函数：构建Nginx镜像
build_nginx() {
    print_message $BLUE "构建Nginx镜像..."

    cd "$(dirname "$0")/.."

    # 检查Dockerfile是否存在
    if [ ! -f "docker/config/nginx.Dockerfile" ]; then
        print_message $RED "❌ Nginx Dockerfile不存在: docker/config/nginx.Dockerfile"
        exit 1
    fi

    docker buildx build \
        --platform $PLATFORMS \
        --file docker/config/nginx.Dockerfile \
        --context docker \
        --tag "${NGINX_IMAGE}:${VERSION}" \
        --tag "${NGINX_IMAGE}:latest" \
        --push \
        --progress=plain \
        .

    if [ $? -eq 0 ]; then
        print_message $GREEN "✓ Nginx镜像构建完成"
    else
        print_message $RED "❌ Nginx镜像构建失败"
        exit 1
    fi
}

# 函数：验证镜像
verify_images() {
    print_message $BLUE "验证镜像..."

    local images=(
        "${FRONTEND_IMAGE}:${VERSION}"
        "${BACKEND_IMAGE}:${VERSION}"
        "${NGINX_IMAGE}:${VERSION}"
    )

    for image in "${images[@]}"; do
        print_message $BLUE "检查镜像: $image"
        if docker buildx imagetools inspect "$image" &> /dev/null; then
            print_message $GREEN "✓ $image 验证成功"
        else
            print_message $RED "❌ $image 验证失败"
            exit 1
        fi
    done
}

# 函数：显示构建信息
show_build_info() {
    print_message $GREEN "🎉 构建完成！"
    echo ""
    print_message $BLUE "镜像信息:"
    echo "前端镜像: ${FRONTEND_IMAGE}:${VERSION}"
    echo "后端镜像: ${BACKEND_IMAGE}:${VERSION}"
    echo "Nginx镜像: ${NGINX_IMAGE}:${VERSION}"
    echo "支持平台: ${PLATFORMS}"
    echo ""
    print_message $BLUE "使用方法:"
    echo "docker pull ${FRONTEND_IMAGE}:${VERSION}"
    echo "docker pull ${BACKEND_IMAGE}:${VERSION}"
    echo "docker pull ${NGINX_IMAGE}:${VERSION}"
    echo ""
    print_message $BLUE "或使用docker-compose:"
    echo "docker-compose -f docker_build/docker-compose.yml up -d"
    echo ""
    print_message $BLUE "镜像大小信息:"
    docker buildx imagetools inspect "${FRONTEND_IMAGE}:${VERSION}" | grep -E "(MediaType|Size)" || true
    docker buildx imagetools inspect "${BACKEND_IMAGE}:${VERSION}" | grep -E "(MediaType|Size)" || true
    docker buildx imagetools inspect "${NGINX_IMAGE}:${VERSION}" | grep -E "(MediaType|Size)" || true
}

# 函数：清理
cleanup() {
    print_message $BLUE "清理buildx资源..."
    docker buildx rm zhiweijz-builder 2>/dev/null || true
}

# 主函数
main() {
    print_message $YELLOW "开始构建只为记账多平台Docker镜像..."
    print_message $YELLOW "版本: ${VERSION}"
    print_message $YELLOW "平台: ${PLATFORMS}"
    print_message $YELLOW "Docker用户: ${DOCKER_USERNAME}"
    echo ""

    # 设置错误处理
    trap cleanup EXIT

    # 验证环境变量
    validate_env

    check_docker
    setup_buildx
    docker_login

    # 构建镜像
    build_backend
    build_frontend
    build_nginx

    # 验证镜像
    verify_images

    # 显示信息
    show_build_info

    print_message $GREEN "🎉 所有镜像构建和推送完成！"
}

# 显示帮助信息
show_help() {
    echo "只为记账 - Docker多平台构建和推送脚本"
    echo ""
    echo "用法: $0 [版本号]"
    echo ""
    echo "参数:"
    echo "  版本号    可选，默认为 'latest'"
    echo ""
    echo "示例:"
    echo "  $0              # 构建latest版本"
    echo "  $0 v1.0.0       # 构建v1.0.0版本"
    echo ""
    echo "环境要求:"
    echo "  - Docker已安装并运行"
    echo "  - 支持buildx功能"
    echo "  - 网络连接正常"
    echo ""
    echo "构建的镜像:"
    echo "  - \${DOCKER_USERNAME}/zhiweijz-frontend"
    echo "  - \${DOCKER_USERNAME}/zhiweijz-backend"
    echo "  - \${DOCKER_USERNAME}/zhiweijz-nginx"
    echo ""
    echo "环境变量配置:"
    echo "  在 docker_build/.env 文件中配置以下变量:"
    echo "  - DOCKER_USERNAME=your_dockerhub_username"
    echo "  - DOCKER_PASSWORD=your_dockerhub_password_or_token"
    echo "  - PLATFORMS=linux/amd64,linux/arm64"
    echo "  - VERSION=latest"
    echo ""
    echo "支持平台: linux/amd64, linux/arm64"
}

# 检查参数
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 执行主函数
main