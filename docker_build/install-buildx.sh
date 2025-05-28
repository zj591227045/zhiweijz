#!/bin/bash

# Docker Buildx 安装脚本
# 适用于Ubuntu/Debian等Linux发行版

set -e

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

# 函数：检测系统架构
detect_arch() {
    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            BUILDX_ARCH="amd64"
            ;;
        aarch64|arm64)
            BUILDX_ARCH="arm64"
            ;;
        armv7l)
            BUILDX_ARCH="arm-v7"
            ;;
        *)
            print_message $RED "❌ 不支持的架构: $ARCH"
            exit 1
            ;;
    esac
    print_message $BLUE "检测到架构: $ARCH -> $BUILDX_ARCH"
}

# 函数：检查Docker
check_docker() {
    print_message $BLUE "检查Docker环境..."
    
    if ! command -v docker &> /dev/null; then
        print_message $RED "❌ Docker未安装"
        print_message $YELLOW "请先安装Docker: https://docs.docker.com/engine/install/"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_message $RED "❌ Docker服务未运行"
        print_message $YELLOW "请启动Docker服务: sudo systemctl start docker"
        exit 1
    fi
    
    DOCKER_VERSION=$(docker version --format '{{.Client.Version}}' 2>/dev/null || echo "unknown")
    print_message $GREEN "✓ Docker已安装，版本: $DOCKER_VERSION"
}

# 函数：安装buildx
install_buildx() {
    print_message $BLUE "开始安装Docker Buildx..."
    
    # 创建插件目录
    mkdir -p ~/.docker/cli-plugins/
    
    # 获取最新版本
    print_message $BLUE "获取buildx最新版本..."
    if command -v curl &> /dev/null; then
        BUILDX_VERSION=$(curl -s https://api.github.com/repos/docker/buildx/releases/latest | grep '"tag_name"' | cut -d'"' -f4 2>/dev/null || echo "v0.12.1")
    else
        BUILDX_VERSION="v0.12.1"
        print_message $YELLOW "无法获取最新版本，使用默认版本: $BUILDX_VERSION"
    fi
    
    print_message $BLUE "buildx版本: $BUILDX_VERSION"
    
    # 构建下载URL
    BUILDX_URL="https://github.com/docker/buildx/releases/download/${BUILDX_VERSION}/buildx-${BUILDX_VERSION}.linux-${BUILDX_ARCH}"
    
    print_message $BLUE "下载buildx: $BUILDX_URL"
    
    # 尝试下载
    local download_success=false
    
    # 方法1: 使用curl
    if command -v curl &> /dev/null; then
        if curl -L --fail --progress-bar -o ~/.docker/cli-plugins/docker-buildx "$BUILDX_URL"; then
            download_success=true
        fi
    fi
    
    # 方法2: 使用wget
    if [ "$download_success" = false ] && command -v wget &> /dev/null; then
        if wget --progress=bar:force -O ~/.docker/cli-plugins/docker-buildx "$BUILDX_URL" 2>/dev/null; then
            download_success=true
        fi
    fi
    
    if [ "$download_success" = false ]; then
        print_message $RED "❌ buildx下载失败"
        print_message $YELLOW "请检查网络连接或手动下载："
        echo "  $BUILDX_URL"
        exit 1
    fi
    
    # 设置执行权限
    chmod +x ~/.docker/cli-plugins/docker-buildx
    
    print_message $GREEN "✓ buildx下载完成"
}

# 函数：验证安装
verify_installation() {
    print_message $BLUE "验证buildx安装..."
    
    if docker buildx version &> /dev/null; then
        BUILDX_VERSION_INSTALLED=$(docker buildx version | head -n1 | awk '{print $2}' || echo "unknown")
        print_message $GREEN "✓ buildx安装成功，版本: $BUILDX_VERSION_INSTALLED"
        
        # 显示支持的平台
        print_message $BLUE "支持的构建平台:"
        docker buildx ls
        
        return 0
    else
        print_message $RED "❌ buildx安装失败"
        return 1
    fi
}

# 函数：设置buildx构建器
setup_builder() {
    print_message $BLUE "设置buildx构建器..."
    
    # 创建新的构建器实例
    if ! docker buildx ls | grep -q "multiarch"; then
        docker buildx create --name multiarch --driver docker-container --use --bootstrap
        print_message $GREEN "✓ 创建multiarch构建器"
    else
        docker buildx use multiarch
        print_message $GREEN "✓ 使用现有multiarch构建器"
    fi
    
    # 检查构建器状态
    docker buildx inspect --bootstrap
}

# 函数：显示使用说明
show_usage() {
    print_message $GREEN "🎉 Docker Buildx安装完成！"
    echo ""
    print_message $BLUE "现在您可以使用以下命令："
    echo "  docker buildx version                    # 查看版本"
    echo "  docker buildx ls                         # 列出构建器"
    echo "  docker buildx build --platform linux/amd64,linux/arm64 ...  # 多平台构建"
    echo ""
    print_message $BLUE "运行构建脚本："
    echo "  ./docker_build/build-and-push.sh        # 完整构建"
    echo "  ./docker_build/update-images.sh         # 快速更新"
}

# 主函数
main() {
    print_message $YELLOW "Docker Buildx 自动安装脚本"
    print_message $YELLOW "适用于Ubuntu/Debian等Linux发行版"
    echo ""
    
    # 检查是否已安装
    if docker buildx version &> /dev/null; then
        CURRENT_VERSION=$(docker buildx version | head -n1 | awk '{print $2}' || echo "unknown")
        print_message $GREEN "✓ buildx已安装，版本: $CURRENT_VERSION"
        
        read -p "是否重新安装最新版本? (y/N): " reinstall
        if [[ ! $reinstall =~ ^[Yy]$ ]]; then
            print_message $BLUE "跳过安装"
            show_usage
            exit 0
        fi
    fi
    
    detect_arch
    check_docker
    install_buildx
    
    if verify_installation; then
        setup_builder
        show_usage
    else
        print_message $RED "安装失败，请检查错误信息"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "Docker Buildx 安装脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示此帮助信息"
    echo ""
    echo "功能:"
    echo "  - 自动检测系统架构"
    echo "  - 下载最新版本的buildx"
    echo "  - 安装到用户目录"
    echo "  - 设置多平台构建器"
    echo ""
    echo "支持的架构:"
    echo "  - x86_64 (amd64)"
    echo "  - aarch64/arm64"
    echo "  - armv7l"
}

# 检查参数
if [[ "$1" == "-h" || "$1" == "--help" ]]; then
    show_help
    exit 0
fi

# 执行主函数
main
