#!/bin/bash

# =====================================================
# 数据库连接测试脚本
# =====================================================

set -e

# 脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
ENV_FILE="$PROJECT_ROOT/docker/.env"

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

echo "=== 数据库连接诊断工具 ==="
echo ""

# 检查.env文件
if [ ! -f "$ENV_FILE" ]; then
    log_error ".env文件不存在: $ENV_FILE"
    exit 1
fi

log_info "读取配置文件: $ENV_FILE"
source "$ENV_FILE"

# 兼容不同的环境变量命名
POSTGRES_DB="${POSTGRES_DB:-$DB_NAME}"
POSTGRES_USER="${POSTGRES_USER:-$DB_USER}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$DB_PASSWORD}"

log_info "数据库配置:"
log_info "  数据库名: $POSTGRES_DB"
log_info "  用户名: $POSTGRES_USER"
log_info "  密码: ${POSTGRES_PASSWORD:+已设置}"
echo ""

# 检查Docker容器状态
log_info "检查Docker容器状态..."
if command -v docker &> /dev/null; then
    if docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep postgres; then
        log_success "找到PostgreSQL容器"
    else
        log_warning "未找到运行中的PostgreSQL容器"
        log_info "所有运行中的容器:"
        docker ps --format "table {{.Names}}\t{{.Status}}"
    fi
else
    log_warning "Docker命令不可用"
fi
echo ""

# 检查psql是否可用
if ! command -v psql &> /dev/null; then
    log_error "psql命令未找到，请安装PostgreSQL客户端"
    exit 1
fi
log_success "psql命令可用"
echo ""

# 测试不同的连接方式
log_info "测试数据库连接..."

# 连接方式列表
declare -a hosts=("localhost" "127.0.0.1" "zhiweijz-postgres")
declare -a ports=("5432")

# 如果环境变量中有指定的主机和端口，优先测试
if [ -n "$DB_HOST" ]; then
    hosts=("$DB_HOST" "${hosts[@]}")
fi
if [ -n "$DB_PORT" ]; then
    ports=("$DB_PORT" "${ports[@]}")
fi

success_count=0
total_attempts=0

for host in "${hosts[@]}"; do
    for port in "${ports[@]}"; do
        total_attempts=$((total_attempts + 1))
        log_info "尝试连接: $POSTGRES_USER@$host:$port/$POSTGRES_DB"
        
        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$host" -p "$port" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
            log_success "✅ 连接成功: $host:$port"
            success_count=$((success_count + 1))
            
            # 获取数据库版本信息
            version=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$host" -p "$port" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT version();" 2>/dev/null | head -1 | xargs)
            log_info "   数据库版本: $version"
            
            # 检查预算表是否存在
            table_count=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$host" -p "$port" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'budgets';" 2>/dev/null | xargs)
            if [ "$table_count" = "1" ]; then
                log_success "   budgets表存在"
                
                # 检查预算数据
                budget_count=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$host" -p "$port" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM budgets;" 2>/dev/null | xargs)
                log_info "   预算记录总数: $budget_count"
                
                # 检查9月份预算
                september_count=$(PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$host" -p "$port" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -t -c "SELECT COUNT(*) FROM budgets WHERE start_date >= '2025-09-01' AND start_date <= '2025-09-01' AND budget_type = 'PERSONAL';" 2>/dev/null | xargs)
                log_info "   2025年9月个人预算数: $september_count"
            else
                log_warning "   budgets表不存在"
            fi
            echo ""
        else
            log_error "❌ 连接失败: $host:$port"
        fi
    done
done

echo ""
log_info "=== 连接测试总结 ==="
log_info "总尝试次数: $total_attempts"
log_info "成功连接数: $success_count"

if [ $success_count -gt 0 ]; then
    log_success "数据库连接正常，可以执行修复脚本"
    echo ""
    log_info "建议的执行命令:"
    for host in "${hosts[@]}"; do
        for port in "${ports[@]}"; do
            if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$host" -p "$port" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
                echo "  DB_HOST=$host DB_PORT=$port ./run_budget_fix.sh"
                break 2
            fi
        done
    done
else
    log_error "所有连接尝试都失败了"
    echo ""
    log_info "故障排除建议:"
    log_info "1. 检查Docker容器状态: docker ps | grep postgres"
    log_info "2. 检查容器日志: docker logs zhiweijz-postgres"
    log_info "3. 检查端口映射: docker port zhiweijz-postgres"
    log_info "4. 检查防火墙设置"
    log_info "5. 验证数据库用户权限"
fi
