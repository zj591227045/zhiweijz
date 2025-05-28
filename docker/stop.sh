#!/bin/bash

# 只为记账 Docker 停止脚本
# 安全停止所有服务

set -e

# 项目名称
PROJECT_NAME="zhiweijz"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# 停止服务
stop_services() {
    log_info "停止所有服务..."
    
    if docker-compose -p "$PROJECT_NAME" ps -q | grep -q .; then
        docker-compose -p "$PROJECT_NAME" down
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
        docker-compose -p "$PROJECT_NAME" down -v
        
        # 删除相关镜像
        docker images | grep -E "(zhiweijz|${PROJECT_NAME})" | awk '{print $3}' | xargs -r docker rmi -f
        
        # 清理悬空镜像
        docker image prune -f
        
        log_success "资源清理完成"
    fi
}

# 显示帮助信息
show_help() {
    echo "使用方法:"
    echo "  $0                停止所有服务"
    echo "  $0 --clean        停止服务并清理所有数据"
    echo "  $0 --help         显示此帮助信息"
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
            log_warning "这将删除所有数据，包括数据库内容！"
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
