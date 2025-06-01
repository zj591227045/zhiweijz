#!/bin/bash

# 只为记账 Docker 停止脚本
# 安全停止所有服务

set -e

# 项目名称
PROJECT_NAME="zhiweijz"

# 默认配置文件
COMPOSE_FILE="docker-compose.yml"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检测Docker Compose命令
detect_compose_command() {
    if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
        echo "docker compose"
    elif command -v docker-compose >/dev/null 2>&1; then
        echo "docker-compose"
    else
        log_error "未找到Docker Compose命令"
        log_error "请安装Docker Compose或确保Docker支持compose子命令"
        exit 1
    fi
}

# 设置Docker Compose命令
COMPOSE_CMD=$(detect_compose_command)

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 选择配置文件
choose_compose_file() {
    # 检查是否有多个配置文件
    local config_files=()

    if [ -f "docker-compose.yml" ]; then
        config_files+=("docker-compose.yml")
    fi

    if [ -f "docker-compose.simple.yml" ]; then
        config_files+=("docker-compose.simple.yml")
    fi

    if [ ${#config_files[@]} -eq 0 ]; then
        log_error "未找到Docker Compose配置文件"
        exit 1
    elif [ ${#config_files[@]} -eq 1 ]; then
        COMPOSE_FILE="${config_files[0]}"
        log_info "使用配置文件: $COMPOSE_FILE"
    else
        echo ""
        log_info "检测到多个配置文件，请选择："
        echo ""
        for i in "${!config_files[@]}"; do
            echo "$((i+1)). ${config_files[$i]}"
        done
        echo ""
        read -p "请选择配置文件 (1-${#config_files[@]}，默认为1): " choice

        if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le ${#config_files[@]} ]; then
            COMPOSE_FILE="${config_files[$((choice-1))]}"
        else
            COMPOSE_FILE="${config_files[0]}"
        fi

        log_info "使用配置文件: $COMPOSE_FILE"
    fi
}

# 停止服务
stop_services() {
    log_info "停止所有服务..."
    log_info "使用命令: $COMPOSE_CMD"
    log_info "配置文件: $COMPOSE_FILE"

    # 检查是否有运行中的服务
    if $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" ps -q 2>/dev/null | grep -q .; then
        log_info "正在停止服务..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down
        log_success "所有服务已停止"
    else
        log_info "没有运行中的服务"
    fi
}

# 清理资源（可选）
cleanup_resources() {
    if [ "$1" = "--clean" ]; then
        log_warning "清理所有数据和镜像..."

        # 删除数据卷
        log_info "删除数据卷..."
        $COMPOSE_CMD -f "$COMPOSE_FILE" -p "$PROJECT_NAME" down -v

        # 删除相关镜像
        log_info "删除项目相关镜像..."
        local images_to_remove=$(docker images --format "table {{.Repository}}:{{.Tag}}\t{{.ID}}" | grep -E "(zhiweijz|${PROJECT_NAME})" | awk '{print $2}' || true)

        if [ -n "$images_to_remove" ]; then
            echo "$images_to_remove" | xargs -r docker rmi -f
            log_success "项目镜像已删除"
        else
            log_info "没有找到项目相关镜像"
        fi

        # 清理悬空镜像
        log_info "清理悬空镜像..."
        docker image prune -f >/dev/null 2>&1 || true

        # 清理未使用的网络
        log_info "清理未使用的网络..."
        docker network prune -f >/dev/null 2>&1 || true

        log_success "资源清理完成"
    fi
}

# 显示帮助信息
show_help() {
    echo "使用方法:"
    echo "  $0                停止所有服务"
    echo "  $0 --clean        停止服务并清理所有数据"
    echo "  $0 --help         显示此帮助信息"
    echo ""
    echo "支持的Docker Compose命令:"
    echo "  - docker compose (Docker Compose V2)"
    echo "  - docker-compose (Docker Compose V1)"
    echo ""
    echo "支持的配置文件:"
    echo "  - docker-compose.yml (完整配置)"
    echo "  - docker-compose.simple.yml (简化配置)"
}

# 显示Docker Compose信息
show_compose_info() {
    echo ""
    log_info "Docker Compose 环境信息:"
    log_info "  命令: $COMPOSE_CMD"

    # 显示版本信息
    if [[ "$COMPOSE_CMD" == "docker compose" ]]; then
        local version=$(docker compose version --short 2>/dev/null || echo "未知")
        log_info "  版本: Docker Compose V2 ($version)"
    else
        local version=$(docker-compose --version 2>/dev/null | awk '{print $3}' | tr -d ',' || echo "未知")
        log_info "  版本: Docker Compose V1 ($version)"
    fi
}

# 主函数
main() {
    case "${1:-}" in
        --help)
            show_help
            exit 0
            ;;
        --clean)
            echo ""
            echo "=================================="
            echo "🛑 只为记账 Docker 清理脚本"
            echo "=================================="
            echo ""

            # 显示环境信息
            show_compose_info

            # 选择配置文件
            choose_compose_file

            echo ""
            log_warning "这将删除所有数据，包括数据库内容！"
            log_warning "配置文件: $COMPOSE_FILE"
            read -p "确定要继续吗？(y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                stop_services
                cleanup_resources --clean
            else
                log_info "操作已取消"
                exit 0
            fi
            ;;
        "")
            echo ""
            echo "=================================="
            echo "🛑 只为记账 Docker 停止脚本"
            echo "=================================="
            echo ""

            # 显示环境信息
            show_compose_info

            # 选择配置文件
            choose_compose_file

            echo ""
            stop_services
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac

    echo ""
    log_success "操作完成！"
}

# 执行主函数
main "$@"
