#!/bin/bash

# 只为记账 - Docker镜像更新脚本
# 用于快速更新和推送镜像

set -e

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 函数：加载环境变量
load_env() {
    local env_file="$SCRIPT_DIR/.env"

    if [ ! -f "$env_file" ]; then
        print_message $RED "❌ 环境变量文件不存在: $env_file"
        print_message $YELLOW "请创建 .env 文件并配置Docker Hub凭据"
        exit 1
    fi

    # 加载环境变量
    set -a
    source "$env_file"
    set +a

    print_message $BLUE "✓ 已加载环境变量文件"
}

# 加载环境变量
load_env

# 配置变量 (从环境变量获取)
PLATFORMS=${PLATFORMS:-"linux/amd64,linux/arm64"}

# 获取版本号
if [ -z "$1" ]; then
    # 自动生成版本号：日期+时间
    VERSION="v$(date +%Y%m%d-%H%M%S)"
    echo -e "${YELLOW}未指定版本号，自动生成版本: ${VERSION}${NC}"
else
    VERSION="$1"
fi

# 镜像名称
FRONTEND_IMAGE="${DOCKER_USERNAME}/zhiweijz-frontend"
BACKEND_IMAGE="${DOCKER_USERNAME}/zhiweijz-backend"
NGINX_IMAGE="${DOCKER_USERNAME}/zhiweijz-nginx"

# 函数：选择要更新的镜像
select_images() {
    echo ""
    print_message $BLUE "请选择要更新的镜像:"
    echo "1) 仅前端 (frontend)"
    echo "2) 仅后端 (backend)"
    echo "3) 仅Nginx (nginx)"
    echo "4) 前端+后端"
    echo "5) 全部镜像"
    echo "6) 自定义选择"
    echo ""
    read -p "请输入选项 (1-6): " choice

    case $choice in
        1)
            SELECTED_IMAGES=("frontend")
            ;;
        2)
            SELECTED_IMAGES=("backend")
            ;;
        3)
            SELECTED_IMAGES=("nginx")
            ;;
        4)
            SELECTED_IMAGES=("backend" "frontend")
            ;;
        5)
            SELECTED_IMAGES=("backend" "frontend" "nginx")
            ;;
        6)
            echo ""
            print_message $BLUE "自定义选择镜像:"
            SELECTED_IMAGES=()

            read -p "是否更新前端镜像? (y/n): " update_frontend
            if [[ $update_frontend =~ ^[Yy]$ ]]; then
                SELECTED_IMAGES+=("frontend")
            fi

            read -p "是否更新后端镜像? (y/n): " update_backend
            if [[ $update_backend =~ ^[Yy]$ ]]; then
                SELECTED_IMAGES+=("backend")
            fi

            read -p "是否更新Nginx镜像? (y/n): " update_nginx
            if [[ $update_nginx =~ ^[Yy]$ ]]; then
                SELECTED_IMAGES+=("nginx")
            fi
            ;;
        *)
            print_message $RED "无效选项，默认更新全部镜像"
            SELECTED_IMAGES=("backend" "frontend" "nginx")
            ;;
    esac

    if [ ${#SELECTED_IMAGES[@]} -eq 0 ]; then
        print_message $RED "未选择任何镜像，退出"
        exit 1
    fi

    print_message $GREEN "将更新以下镜像: ${SELECTED_IMAGES[*]}"
}

# 函数：快速构建和推送
quick_build() {
    local image_type=$1

    print_message $BLUE "快速构建 ${image_type} 镜像..."

    cd "$(dirname "$0")/.."

    case $image_type in
        "frontend")
            docker buildx build \
                --platform $PLATFORMS \
                --file apps/web/Dockerfile \
                --tag "${FRONTEND_IMAGE}:${VERSION}" \
                --tag "${FRONTEND_IMAGE}:latest" \
                --push \
                --progress=plain \
                .
            ;;
        "backend")
            docker buildx build \
                --platform $PLATFORMS \
                --file server/Dockerfile \
                --tag "${BACKEND_IMAGE}:${VERSION}" \
                --tag "${BACKEND_IMAGE}:latest" \
                --push \
                --progress=plain \
                .
            ;;
        "nginx")
            docker buildx build \
                --platform $PLATFORMS \
                --file docker/config/nginx.Dockerfile \
                --context docker \
                --tag "${NGINX_IMAGE}:${VERSION}" \
                --tag "${NGINX_IMAGE}:latest" \
                --push \
                --progress=plain \
                .
            ;;
    esac

    if [ $? -eq 0 ]; then
        print_message $GREEN "✓ ${image_type} 镜像更新完成"
    else
        print_message $RED "❌ ${image_type} 镜像更新失败"
        exit 1
    fi
}

# 主函数
main() {
    print_message $YELLOW "只为记账 - Docker镜像快速更新工具"
    print_message $YELLOW "版本: ${VERSION}"
    echo ""

    # 检查Docker环境
    if ! command -v docker &> /dev/null; then
        print_message $RED "❌ Docker未安装"
        exit 1
    fi

    if ! docker buildx version &> /dev/null; then
        print_message $RED "❌ Docker buildx不可用"
        exit 1
    fi

    # 验证环境变量
    if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
        print_message $RED "❌ 缺少Docker Hub凭据"
        print_message $YELLOW "请在 $SCRIPT_DIR/.env 文件中配置 DOCKER_USERNAME 和 DOCKER_PASSWORD"
        exit 1
    fi

    # 登录Docker Hub
    print_message $BLUE "登录Docker Hub..."
    echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin

    if [ $? -ne 0 ]; then
        print_message $RED "❌ Docker Hub登录失败"
        exit 1
    fi

    # 设置buildx
    docker buildx use default 2>/dev/null || docker buildx create --name default --use

    # 选择要更新的镜像
    select_images

    # 构建选中的镜像
    for image in "${SELECTED_IMAGES[@]}"; do
        quick_build "$image"
    done

    # 显示结果
    echo ""
    print_message $GREEN "🎉 镜像更新完成！"
    echo ""
    print_message $BLUE "更新的镜像:"
    for image in "${SELECTED_IMAGES[@]}"; do
        case $image in
            "frontend")
                echo "  - ${FRONTEND_IMAGE}:${VERSION}"
                ;;
            "backend")
                echo "  - ${BACKEND_IMAGE}:${VERSION}"
                ;;
            "nginx")
                echo "  - ${NGINX_IMAGE}:${VERSION}"
                ;;
        esac
    done

    echo ""
    print_message $BLUE "使用新版本部署:"
    echo "  docker-compose -f docker_build/docker-compose.yml pull"
    echo "  docker-compose -f docker_build/docker-compose.yml up -d"
}

# 显示帮助信息
show_help() {
    echo "只为记账 - Docker镜像快速更新脚本"
    echo ""
    echo "用法: $0 [版本号]"
    echo ""
    echo "参数:"
    echo "  版本号    可选，不指定则自动生成时间戳版本"
    echo ""
    echo "示例:"
    echo "  $0              # 自动生成版本号"
    echo "  $0 v1.0.1       # 指定版本号"
    echo ""
    echo "功能:"
    echo "  - 交互式选择要更新的镜像"
    echo "  - 支持单独更新前端、后端或Nginx"
    echo "  - 自动推送到DockerHub"
    echo "  - 支持多平台构建 (amd64, arm64)"
}

# 检查参数
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 执行主函数
main
