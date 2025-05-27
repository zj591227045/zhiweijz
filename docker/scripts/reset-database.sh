#!/bin/bash

# 只为记账 - 数据库重置脚本
# 统一重置开发环境和Docker环境的数据库状态

set -e

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

# 显示使用说明
show_usage() {
    echo "使用方法:"
    echo "  $0 --dev          重置开发环境数据库"
    echo "  $0 --docker       重置Docker环境数据库"
    echo "  $0 --both         重置两个环境的数据库"
    echo "  $0 --help         显示此帮助信息"
}

# 重置开发环境数据库
reset_dev_database() {
    log_info "重置开发环境数据库..."
    
    cd ../server
    
    # 检查Prisma配置
    if [ ! -f "prisma/schema.prisma" ]; then
        log_error "未找到Prisma schema文件"
        return 1
    fi
    
    # 重置Prisma迁移状态
    log_info "重置Prisma迁移状态..."
    npx prisma migrate reset --force --skip-generate
    
    # 重新生成Prisma客户端
    log_info "生成Prisma客户端..."
    npx prisma generate
    
    # 推送最新schema到数据库
    log_info "推送最新schema到数据库..."
    npx prisma db push --force-reset
    
    # 检查迁移状态
    log_info "检查迁移状态..."
    npx prisma migrate status
    
    cd ../docker
    log_success "开发环境数据库重置完成"
}

# 重置Docker环境数据库
reset_docker_database() {
    log_info "重置Docker环境数据库..."
    
    # 停止Docker服务
    log_info "停止Docker服务..."
    docker-compose down -v 2>/dev/null || true
    
    # 删除数据库卷
    log_info "删除数据库卷..."
    docker volume rm zhiweijz_postgres_data 2>/dev/null || true
    
    # 重新生成init.sql
    log_info "重新生成数据库初始化文件..."
    if [ -f "scripts/generate-schema.sh" ]; then
        ./scripts/generate-schema.sh
    else
        log_warning "未找到schema生成脚本，使用现有的init.sql"
    fi
    
    log_success "Docker环境数据库重置完成"
}

# 验证数据库状态
verify_database() {
    local env_type="$1"
    
    log_info "验证${env_type}数据库状态..."
    
    if [ "$env_type" = "开发环境" ]; then
        cd ../server
        if npx prisma db pull --force 2>/dev/null; then
            log_success "${env_type}数据库连接正常"
        else
            log_warning "${env_type}数据库连接异常"
        fi
        cd ../docker
    elif [ "$env_type" = "Docker环境" ]; then
        # 启动Docker服务进行验证
        log_info "启动Docker服务进行验证..."
        docker-compose up -d postgres
        
        # 等待数据库启动
        sleep 10
        
        # 检查数据库连接
        if docker-compose exec -T postgres psql -U zhiweijz -d zhiweijz -c "SELECT 1;" >/dev/null 2>&1; then
            log_success "${env_type}数据库连接正常"
        else
            log_warning "${env_type}数据库连接异常"
        fi
        
        # 停止服务
        docker-compose down
    fi
}

# 备份当前数据库
backup_database() {
    local env_type="$1"
    local backup_dir="backups"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    mkdir -p "$backup_dir"
    
    log_info "备份${env_type}数据库..."
    
    if [ "$env_type" = "开发环境" ]; then
        # 备份开发环境数据库
        if command -v pg_dump >/dev/null 2>&1; then
            pg_dump $DATABASE_URL > "$backup_dir/dev_backup_${timestamp}.sql" 2>/dev/null || {
                log_warning "开发环境数据库备份失败，可能数据库不存在"
            }
        else
            log_warning "pg_dump未安装，跳过开发环境备份"
        fi
    elif [ "$env_type" = "Docker环境" ]; then
        # 备份Docker环境数据库
        if docker-compose ps postgres | grep -q "Up"; then
            docker-compose exec -T postgres pg_dump -U zhiweijz zhiweijz > "$backup_dir/docker_backup_${timestamp}.sql" 2>/dev/null || {
                log_warning "Docker环境数据库备份失败"
            }
        else
            log_info "Docker数据库未运行，跳过备份"
        fi
    fi
}

# 主函数
main() {
    echo ""
    echo "=================================="
    echo "🔄 数据库重置工具"
    echo "=================================="
    echo ""
    
    case "${1:-}" in
        --dev)
            log_warning "即将重置开发环境数据库，所有数据将丢失！"
            read -p "确定要继续吗？(y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                backup_database "开发环境"
                reset_dev_database
                verify_database "开发环境"
            else
                log_info "操作已取消"
            fi
            ;;
        --docker)
            log_warning "即将重置Docker环境数据库，所有数据将丢失！"
            read -p "确定要继续吗？(y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                backup_database "Docker环境"
                reset_docker_database
                verify_database "Docker环境"
            else
                log_info "操作已取消"
            fi
            ;;
        --both)
            log_warning "即将重置开发环境和Docker环境数据库，所有数据将丢失！"
            read -p "确定要继续吗？(y/N): " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                backup_database "开发环境"
                backup_database "Docker环境"
                reset_dev_database
                reset_docker_database
                verify_database "开发环境"
                verify_database "Docker环境"
            else
                log_info "操作已取消"
            fi
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            log_error "未知参数: ${1:-}"
            show_usage
            exit 1
            ;;
    esac
    
    echo ""
    log_success "🎉 数据库重置完成！"
    echo ""
    echo -e "${BLUE}下一步操作:${NC}"
    echo -e "  开发环境: ${YELLOW}cd ../server && npm run dev${NC}"
    echo -e "  Docker环境: ${YELLOW}./scripts/start.sh${NC}"
    echo ""
}

# 错误处理
trap 'log_error "脚本执行失败"; exit 1' ERR

# 执行主函数
main "$@"
