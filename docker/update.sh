#!/bin/bash

# 只为记账 - Docker镜像更新脚本
# 支持一键更新所有组件或单独更新指定组件

set -e

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认配置
DEFAULT_DOCKER_USER="zj591227045"
DEFAULT_VERSION="latest"

# 镜像配置
BACKEND_IMAGE="${DOCKER_USER:-$DEFAULT_DOCKER_USER}/zhiweijz-backend"
FRONTEND_IMAGE="${DOCKER_USER:-$DEFAULT_DOCKER_USER}/zhiweijz-frontend"
NGINX_IMAGE="${DOCKER_USER:-$DEFAULT_DOCKER_USER}/zhiweijz-nginx"

# 函数：打印消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 函数：打印标题
print_title() {
    echo ""
    print_message $CYAN "=================================================="
    print_message $CYAN "$1"
    print_message $CYAN "=================================================="
    echo ""
}

# 函数：显示帮助信息
show_help() {
    print_title "只为记账 - Docker镜像更新脚本"

    echo "用法: $0 [选项] [组件] [版本]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示帮助信息"
    echo "  -u, --user USER     指定Docker Hub用户名 (默认: $DEFAULT_DOCKER_USER)"
    echo "  -v, --version VER   指定镜像版本 (默认: $DEFAULT_VERSION)"
    echo "  --dry-run          仅显示将要执行的操作，不实际执行"
    echo "  --no-restart       更新镜像后不重启服务"
    echo ""
    echo "组件 (可选，不指定则更新所有组件):"
    echo "  backend            仅更新后端服务"
    echo "  frontend           仅更新前端服务"
    echo "  nginx              仅更新Nginx服务"
    echo "  all                更新所有组件 (默认)"
    echo ""
    echo "示例:"
    echo "  $0                           # 更新所有组件到latest版本"
    echo "  $0 backend                   # 仅更新后端到latest版本"
    echo "  $0 frontend 0.1.1            # 更新前端到0.1.1版本"
    echo "  $0 -v 0.1.1                  # 更新所有组件到0.1.1版本"
    echo "  $0 --dry-run                 # 预览更新操作"
    echo "  $0 --no-restart backend      # 更新后端但不重启服务"
    echo ""
    echo "环境变量:"
    echo "  DOCKER_USER        Docker Hub用户名"
    echo "  VERSION            镜像版本"
    echo ""
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

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_message $RED "❌ Docker Compose未安装"
        exit 1
    fi

    print_message $GREEN "✓ Docker环境正常"
}

# 函数：检查镜像是否存在
check_image_exists() {
    local image=$1
    print_message $BLUE "检查镜像: $image"

    # 在dry-run模式下，跳过远程检查
    if [ "$DRY_RUN" = "true" ]; then
        print_message $YELLOW "[DRY RUN] 跳过镜像存在性检查: $image"
        return 0
    fi

    # 检查远程镜像是否存在（添加超时处理）
    if timeout 30 docker manifest inspect "$image" &> /dev/null; then
        print_message $GREEN "✓ 镜像存在: $image"
        return 0
    else
        print_message $RED "❌ 镜像不存在或网络超时: $image"
        print_message $YELLOW "提示: 如果确认镜像存在，可以使用 --dry-run 跳过检查"
        return 1
    fi
}

# 函数：拉取镜像
pull_image() {
    local image=$1
    local service_name=$2

    print_message $BLUE "拉取镜像: $image"

    if [ "$DRY_RUN" = "true" ]; then
        print_message $YELLOW "[DRY RUN] docker pull $image"
        return 0
    fi

    if docker pull "$image"; then
        print_message $GREEN "✓ 镜像拉取成功: $image"
        return 0
    else
        print_message $RED "❌ 镜像拉取失败: $image"
        return 1
    fi
}

# 函数：更新docker-compose.yml中的镜像版本
update_compose_image() {
    local service=$1
    local image=$2
    local compose_file="$SCRIPT_DIR/docker-compose.yml"

    print_message $BLUE "更新docker-compose.yml中的$service镜像版本..."

    if [ "$DRY_RUN" = "true" ]; then
        print_message $YELLOW "[DRY RUN] 将$service镜像更新为: $image"
        return 0
    fi

    # 备份原文件
    cp "$compose_file" "$compose_file.backup.$(date +%Y%m%d_%H%M%S)"

    # 更新镜像版本
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|image: .*zhiweijz-${service}:.*|image: ${image}|g" "$compose_file"
    else
        # Linux
        sed -i "s|image: .*zhiweijz-${service}:.*|image: ${image}|g" "$compose_file"
    fi

    print_message $GREEN "✓ docker-compose.yml已更新"
}

# 函数：重启服务
restart_service() {
    local service=$1

    if [ "$NO_RESTART" = "true" ]; then
        print_message $YELLOW "跳过重启服务: $service"
        return 0
    fi

    print_message $BLUE "重启服务: $service"

    if [ "$DRY_RUN" = "true" ]; then
        print_message $YELLOW "[DRY RUN] docker-compose restart $service"
        return 0
    fi

    cd "$SCRIPT_DIR"

    # 检查是否使用新版docker compose
    if docker compose version &> /dev/null; then
        docker compose restart "$service"
    else
        docker-compose restart "$service"
    fi

    if [ $? -eq 0 ]; then
        print_message $GREEN "✓ 服务重启成功: $service"
    else
        print_message $RED "❌ 服务重启失败: $service"
        return 1
    fi
}

# 函数：更新单个组件
update_component() {
    local component=$1
    local version=$2
    local image=""
    local service_name=""

    case $component in
        "backend")
            image="${BACKEND_IMAGE}:${version}"
            service_name="backend"
            ;;
        "frontend")
            image="${FRONTEND_IMAGE}:${version}"
            service_name="frontend"
            ;;
        "nginx")
            image="${NGINX_IMAGE}:${version}"
            service_name="nginx"
            ;;
        *)
            print_message $RED "❌ 未知组件: $component"
            return 1
            ;;
    esac

    print_message $CYAN "更新组件: $component -> $version"

    # 检查镜像是否存在
    if ! check_image_exists "$image"; then
        print_message $RED "❌ 跳过组件: $component (镜像不存在)"
        return 1
    fi

    # 拉取镜像
    if ! pull_image "$image" "$service_name"; then
        print_message $RED "❌ 跳过组件: $component (拉取失败)"
        return 1
    fi

    # 更新docker-compose.yml
    if ! update_compose_image "$component" "$image"; then
        print_message $RED "❌ 跳过组件: $component (配置更新失败)"
        return 1
    fi

    # 重启服务
    if ! restart_service "$service_name"; then
        print_message $RED "❌ 组件更新完成但重启失败: $component"
        return 1
    fi

    print_message $GREEN "✅ 组件更新成功: $component"
    return 0
}

# 函数：更新所有组件
update_all_components() {
    local version=$1
    local success_count=0
    local total_count=3

    print_title "更新所有组件到版本: $version"

    # 更新顺序：nginx -> frontend -> backend (反向依赖顺序)
    local components=("nginx" "frontend" "backend")

    for component in "${components[@]}"; do
        if update_component "$component" "$version"; then
            ((success_count++))
        fi
        echo ""
    done

    print_title "更新完成"
    print_message $BLUE "成功更新: $success_count/$total_count 个组件"

    if [ $success_count -eq $total_count ]; then
        print_message $GREEN "🎉 所有组件更新成功！"
        return 0
    else
        print_message $YELLOW "⚠️  部分组件更新失败，请检查日志"
        return 1
    fi
}

# 函数：显示当前版本信息
show_current_versions() {
    print_title "当前镜像版本信息"

    cd "$SCRIPT_DIR"

    # 从docker-compose.yml提取当前镜像版本
    echo "Docker Compose配置中的镜像版本:"
    grep -E "image:.*zhiweijz-" docker-compose.yml | sed 's/^[[:space:]]*/  /' || true

    echo ""
    echo "本地镜像版本:"
    docker images | grep -E "(zhiweijz-backend|zhiweijz-frontend|zhiweijz-nginx)" | head -10 || true

    echo ""
}

# 主函数
main() {
    local component="$COMPONENT"
    local version="${VERSION:-$DEFAULT_VERSION}"
    local docker_user="${DOCKER_USER:-$DEFAULT_DOCKER_USER}"

    # 更新镜像配置
    BACKEND_IMAGE="${docker_user}/zhiweijz-backend"
    FRONTEND_IMAGE="${docker_user}/zhiweijz-frontend"
    NGINX_IMAGE="${docker_user}/zhiweijz-nginx"

    print_title "只为记账 - Docker镜像更新工具"
    print_message $BLUE "Docker用户: $docker_user"
    print_message $BLUE "目标版本: $version"

    if [ "$DRY_RUN" = "true" ]; then
        print_message $YELLOW "🔍 预览模式 - 仅显示操作，不实际执行"
    fi

    if [ "$NO_RESTART" = "true" ]; then
        print_message $YELLOW "⚠️  更新后不会重启服务"
    fi

    echo ""

    # 检查Docker环境
    check_docker
    echo ""

    # 显示当前版本信息
    show_current_versions

    # 执行更新
    if [ -z "$component" ] || [ "$component" = "all" ]; then
        update_all_components "$version"
    else
        update_component "$component" "$version"
    fi

    local exit_code=$?

    if [ $exit_code -eq 0 ] && [ "$DRY_RUN" != "true" ]; then
        echo ""
        print_title "更新后版本信息"
        show_current_versions

        print_message $GREEN "💡 提示: 可以使用以下命令检查服务状态:"
        print_message $BLUE "  docker-compose ps"
        print_message $BLUE "  docker-compose logs -f [service_name]"
    fi

    exit $exit_code
}

# 解析命令行参数
DRY_RUN=false
NO_RESTART=false
COMPONENT=""
VERSION_ARG=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -u|--user)
            DOCKER_USER="$2"
            shift 2
            ;;
        -v|--version)
            VERSION_ARG="$2"
            shift 2
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        --no-restart)
            NO_RESTART=true
            shift
            ;;
        backend|frontend|nginx|all)
            if [ -z "$COMPONENT" ]; then
                COMPONENT="$1"
            else
                print_message $RED "❌ 错误: 只能指定一个组件"
                exit 1
            fi
            shift
            ;;
        *)
            # 检查是否是版本号
            if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || [[ "$1" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || [ "$1" = "latest" ]; then
                if [ -z "$VERSION_ARG" ]; then
                    VERSION_ARG="$1"
                else
                    print_message $RED "❌ 错误: 版本号已指定"
                    exit 1
                fi
            else
                print_message $RED "❌ 错误: 未知参数 '$1'"
                show_help
                exit 1
            fi
            shift
            ;;
    esac
done

# 设置最终的组件和版本
if [ -n "$VERSION_ARG" ]; then
    VERSION="$VERSION_ARG"
fi

if [ -n "$COMPONENT" ]; then
    component="$COMPONENT"
fi

# 执行主函数
main