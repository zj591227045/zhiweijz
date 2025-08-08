#!/bin/bash

# 环境变量设置脚本
# 帮助快速设置不同环境的配置文件

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

# 显示帮助信息
show_help() {
    echo "环境变量设置脚本"
    echo ""
    echo "用法: $0 [环境类型]"
    echo ""
    echo "环境类型:"
    echo "  dev        设置本地开发环境 (.env.local)"
    echo "  mobile     设置移动端构建环境"
    echo ""
    echo "示例:"
    echo "  $0 dev     # 设置本地开发环境"
    echo "  $0 mobile  # 设置移动端构建环境"
    echo ""
    echo "注意: 生产环境通过Docker环境变量管理，不使用.env文件"
    echo ""
}

# 检查模板文件是否存在
check_template() {
    if [ ! -f ".env.template" ]; then
        log_error "模板文件 .env.template 不存在！"
        exit 1
    fi
}

# 设置开发环境
setup_dev() {
    local target_file=".env.local"
    
    log_info "设置开发环境配置..."
    
    if [ -f "$target_file" ]; then
        log_warning "文件 $target_file 已存在"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "取消操作"
            exit 0
        fi
    fi
    
    cp .env.template "$target_file"
    
    # 设置开发环境特定配置
    sed -i.bak 's/NODE_ENV=development/NODE_ENV=development/' "$target_file"
    sed -i.bak 's/NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true/NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true/' "$target_file"
    sed -i.bak 's/NEXT_PUBLIC_LOG_LEVEL=debug/NEXT_PUBLIC_LOG_LEVEL=debug/' "$target_file"
    sed -i.bak 's/BUILD_MODE=web/BUILD_MODE=web/' "$target_file"
    sed -i.bak 's/IS_MOBILE_BUILD=false/IS_MOBILE_BUILD=false/' "$target_file"
    
    # 删除备份文件
    rm -f "$target_file.bak"
    
    log_success "开发环境配置已创建: $target_file"
    log_info "请编辑文件并填入实际的API密钥等配置"
}

# 显示生产环境说明
show_prod_info() {
    log_info "生产环境配置说明:"
    echo ""
    echo "生产环境通过Docker环境变量管理，不使用.env文件。"
    echo "请在以下位置配置生产环境变量："
    echo ""
    echo "1. Docker Compose方式:"
    echo "   编辑 docker/docker-compose.yml 中的 environment 部分"
    echo ""
    echo "2. Docker运行时方式:"
    echo "   使用 -e 参数设置环境变量"
    echo "   例如: docker run -e NODE_ENV=production ..."
    echo ""
    echo "3. 推荐的生产环境变量:"
    echo "   NODE_ENV=production"
    echo "   NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false"
    echo "   NEXT_PUBLIC_LOG_LEVEL=error"
    echo "   NEXT_PUBLIC_API_BASE_URL=https://your-domain.com"
    echo ""
}

# 设置移动端环境
setup_mobile() {
    local target_file=".env.mobile"
    
    log_info "设置移动端构建配置..."
    
    if [ -f "$target_file" ]; then
        log_warning "文件 $target_file 已存在"
        read -p "是否覆盖? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "取消操作"
            exit 0
        fi
    fi
    
    cp .env.template "$target_file"
    
    # 设置移动端特定配置
    sed -i.bak 's/BUILD_MODE=web/BUILD_MODE=mobile/' "$target_file"
    sed -i.bak 's/IS_MOBILE_BUILD=false/IS_MOBILE_BUILD=true/' "$target_file"
    sed -i.bak 's/NEXT_PUBLIC_IS_MOBILE=false/NEXT_PUBLIC_IS_MOBILE=true/' "$target_file"
    sed -i.bak 's/NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=true/NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false/' "$target_file"
    sed -i.bak 's/NEXT_PUBLIC_LOG_LEVEL=debug/NEXT_PUBLIC_LOG_LEVEL=error/' "$target_file"
    
    # 删除备份文件
    rm -f "$target_file.bak"
    
    log_success "移动端构建配置已创建: $target_file"
}

# 主函数
main() {
    # 检查是否在正确的目录
    if [ ! -f "package.json" ]; then
        log_error "请在前端项目根目录下运行此脚本"
        exit 1
    fi
    
    # 检查模板文件
    check_template
    
    # 处理参数
    case "${1:-}" in
        "dev")
            setup_dev
            ;;
        "prod")
            show_prod_info
            ;;
        "mobile")
            setup_mobile
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        "")
            log_error "请指定环境类型"
            show_help
            exit 1
            ;;
        *)
            log_error "未知的环境类型: $1"
            show_help
            exit 1
            ;;
    esac
}

# 运行主函数
main "$@"
