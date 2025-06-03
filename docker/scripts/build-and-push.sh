#!/bin/bash

# Docker镜像构建和推送脚本
# 用于构建包含数据库自动迁移功能的Docker镜像

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 配置
DOCKER_USERNAME="zj591227045"
BACKEND_IMAGE="zhiweijz-backend"
FRONTEND_IMAGE="zhiweijz-frontend"
NGINX_IMAGE="zhiweijz-nginx"

# 默认版本
BACKEND_VERSION="0.1.6"
FRONTEND_VERSION="0.1.4"
NGINX_VERSION="latest"

# 支持的平台
PLATFORMS="linux/amd64,linux/arm64"

echo -e "${GREEN}Docker镜像构建和推送脚本${NC}"
echo "=================================="

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-version)
            BACKEND_VERSION="$2"
            shift 2
            ;;
        --frontend-version)
            FRONTEND_VERSION="$2"
            shift 2
            ;;
        --nginx-version)
            NGINX_VERSION="$2"
            shift 2
            ;;
        --platform)
            PLATFORMS="$2"
            shift 2
            ;;
        --backend-only)
            BUILD_BACKEND_ONLY=true
            shift
            ;;
        --frontend-only)
            BUILD_FRONTEND_ONLY=true
            shift
            ;;
        --nginx-only)
            BUILD_NGINX_ONLY=true
            shift
            ;;
        --help)
            echo "用法: $0 [选项]"
            echo "选项:"
            echo "  --backend-version VERSION   后端版本号 (默认: $BACKEND_VERSION)"
            echo "  --frontend-version VERSION  前端版本号 (默认: $FRONTEND_VERSION)"
            echo "  --nginx-version VERSION     Nginx版本号 (默认: $NGINX_VERSION)"
            echo "  --platform PLATFORMS        构建平台 (默认: $PLATFORMS)"
            echo "  --backend-only              仅构建后端"
            echo "  --frontend-only             仅构建前端"
            echo "  --nginx-only                仅构建Nginx"
            echo "  --help                       显示帮助"
            exit 0
            ;;
        *)
            echo -e "${RED}未知参数: $1${NC}"
            exit 1
            ;;
    esac
done

# 检查Docker是否运行
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker未运行，请先启动Docker${NC}"
    exit 1
fi

# 检查buildx是否可用
if ! docker buildx version >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker buildx不可用，请更新Docker到最新版本${NC}"
    exit 1
fi

# 创建buildx构建器（如果不存在）
if ! docker buildx ls | grep -q "zhiweijz-builder"; then
    echo -e "${BLUE}创建Docker buildx构建器...${NC}"
    docker buildx create --name zhiweijz-builder --use
fi

# 切换到项目根目录
cd "$(dirname "$0")/../.."

# 构建后端镜像
build_backend() {
    echo -e "${BLUE}构建后端镜像: ${DOCKER_USERNAME}/${BACKEND_IMAGE}:${BACKEND_VERSION}${NC}"
    
    # 验证关键文件存在
    if [ ! -f "server/scripts/start.sh" ]; then
        echo -e "${RED}❌ server/scripts/start.sh 不存在${NC}"
        exit 1
    fi
    
    if [ ! -f "server/Dockerfile" ]; then
        echo -e "${RED}❌ server/Dockerfile 不存在${NC}"
        exit 1
    fi
    
    # 构建并推送
    docker buildx build \
        --platform "$PLATFORMS" \
        --tag "${DOCKER_USERNAME}/${BACKEND_IMAGE}:${BACKEND_VERSION}" \
        --tag "${DOCKER_USERNAME}/${BACKEND_IMAGE}:latest" \
        --file server/Dockerfile \
        --push \
        .
    
    echo -e "${GREEN}✅ 后端镜像构建完成${NC}"
}

# 构建前端镜像
build_frontend() {
    echo -e "${BLUE}构建前端镜像: ${DOCKER_USERNAME}/${FRONTEND_IMAGE}:${FRONTEND_VERSION}${NC}"
    
    if [ ! -f "apps/web/Dockerfile" ]; then
        echo -e "${RED}❌ apps/web/Dockerfile 不存在${NC}"
        exit 1
    fi
    
    # 构建并推送
    docker buildx build \
        --platform "$PLATFORMS" \
        --tag "${DOCKER_USERNAME}/${FRONTEND_IMAGE}:${FRONTEND_VERSION}" \
        --tag "${DOCKER_USERNAME}/${FRONTEND_IMAGE}:latest" \
        --file apps/web/Dockerfile \
        --push \
        .
    
    echo -e "${GREEN}✅ 前端镜像构建完成${NC}"
}

# 构建Nginx镜像
build_nginx() {
    echo -e "${BLUE}构建Nginx镜像: ${DOCKER_USERNAME}/${NGINX_IMAGE}:${NGINX_VERSION}${NC}"
    
    if [ ! -f "docker/config/nginx.Dockerfile" ]; then
        echo -e "${RED}❌ docker/config/nginx.Dockerfile 不存在${NC}"
        exit 1
    fi
    
    # 构建并推送
    docker buildx build \
        --platform "$PLATFORMS" \
        --tag "${DOCKER_USERNAME}/${NGINX_IMAGE}:${NGINX_VERSION}" \
        --file docker/config/nginx.Dockerfile \
        --push \
        docker/config/
    
    echo -e "${GREEN}✅ Nginx镜像构建完成${NC}"
}

# 更新docker-compose.yml版本号
update_compose_versions() {
    echo -e "${BLUE}更新docker-compose.yml版本号...${NC}"
    
    cd docker
    
    # 备份原文件
    cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
    
    # 更新版本号
    sed -i.tmp "s|image: ${DOCKER_USERNAME}/${BACKEND_IMAGE}:.*|image: ${DOCKER_USERNAME}/${BACKEND_IMAGE}:${BACKEND_VERSION}|g" docker-compose.yml
    sed -i.tmp "s|image: ${DOCKER_USERNAME}/${FRONTEND_IMAGE}:.*|image: ${DOCKER_USERNAME}/${FRONTEND_IMAGE}:${FRONTEND_VERSION}|g" docker-compose.yml
    sed -i.tmp "s|image: ${DOCKER_USERNAME}/${NGINX_IMAGE}:.*|image: ${DOCKER_USERNAME}/${NGINX_IMAGE}:${NGINX_VERSION}|g" docker-compose.yml
    rm -f docker-compose.yml.tmp
    
    echo -e "${GREEN}✅ docker-compose.yml版本号已更新${NC}"
    cd ..
}

# 主要构建逻辑
main() {
    echo -e "${BLUE}开始构建Docker镜像...${NC}"
    echo -e "后端版本: ${YELLOW}${BACKEND_VERSION}${NC}"
    echo -e "前端版本: ${YELLOW}${FRONTEND_VERSION}${NC}"
    echo -e "Nginx版本: ${YELLOW}${NGINX_VERSION}${NC}"
    echo -e "构建平台: ${YELLOW}${PLATFORMS}${NC}"
    echo ""
    
    # 根据参数决定构建什么
    if [ "$BUILD_BACKEND_ONLY" = true ]; then
        build_backend
    elif [ "$BUILD_FRONTEND_ONLY" = true ]; then
        build_frontend
    elif [ "$BUILD_NGINX_ONLY" = true ]; then
        build_nginx
    else
        # 构建所有镜像
        build_backend
        build_frontend
        build_nginx
        
        # 更新docker-compose.yml
        update_compose_versions
    fi
    
    echo ""
    echo -e "${GREEN}🎉 Docker镜像构建完成！${NC}"
    echo ""
    echo -e "${BLUE}镜像信息:${NC}"
    echo -e "  后端: ${YELLOW}${DOCKER_USERNAME}/${BACKEND_IMAGE}:${BACKEND_VERSION}${NC}"
    echo -e "  前端: ${YELLOW}${DOCKER_USERNAME}/${FRONTEND_IMAGE}:${FRONTEND_VERSION}${NC}"
    echo -e "  Nginx: ${YELLOW}${DOCKER_USERNAME}/${NGINX_IMAGE}:${NGINX_VERSION}${NC}"
    echo ""
    echo -e "${BLUE}使用方法:${NC}"
    echo -e "  cd docker && docker-compose pull && docker-compose up -d"
}

# 运行主函数
main
