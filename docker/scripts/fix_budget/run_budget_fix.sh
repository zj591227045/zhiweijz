#!/bin/bash

# =====================================================
# 预算修复脚本执行器
# =====================================================
# 
# 功能：
# 1. 自动读取docker/.env配置
# 2. 连接数据库并执行预算修复脚本
# 3. 支持指定年月或使用当前月份
#
# 使用方法：
# ./run_budget_fix.sh [年份] [月份]
# 
# 示例：
# ./run_budget_fix.sh                    # 修复当前月份
# ./run_budget_fix.sh 2025 9            # 修复2025年9月
# ./run_budget_fix.sh 2025 10           # 修复2025年10月
# =====================================================

set -e  # 遇到错误立即退出

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

# 检查.env文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    log_error ".env文件不存在: $ENV_FILE"
    log_error "请确保在docker目录下有.env配置文件"
    exit 1
fi

# 读取.env文件
log_info "读取配置文件: $ENV_FILE"
source "$ENV_FILE"

# 兼容不同的环境变量命名
# 优先使用POSTGRES_*变量，如果不存在则使用DB_*变量
POSTGRES_DB="${POSTGRES_DB:-$DB_NAME}"
POSTGRES_USER="${POSTGRES_USER:-$DB_USER}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$DB_PASSWORD}"

# 检查必需的环境变量
if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    log_error "缺少必需的数据库配置变量"
    log_error "请检查.env文件中的以下变量之一："
    log_error "  POSTGRES_DB/DB_NAME, POSTGRES_USER/DB_USER, POSTGRES_PASSWORD/DB_PASSWORD"
    log_error ""
    log_error "当前读取到的值："
    log_error "  POSTGRES_DB/DB_NAME: ${POSTGRES_DB:-未设置}"
    log_error "  POSTGRES_USER/DB_USER: ${POSTGRES_USER:-未设置}"
    log_error "  POSTGRES_PASSWORD/DB_PASSWORD: ${POSTGRES_PASSWORD:+已设置}"
    exit 1
fi

# 设置数据库连接参数
# 优先使用环境变量，然后是.env文件中的值，最后是默认值
FINAL_DB_HOST="${DB_HOST:-localhost}"
FINAL_DB_PORT="${DB_PORT:-5432}"

# 如果是在Docker环境中，且DB_HOST是默认值，尝试使用容器名
if [ "$FINAL_DB_HOST" = "localhost" ] && [ -n "$DOCKER_ENV" ]; then
    log_warning "检测到Docker环境，尝试使用容器名连接数据库"
    FINAL_DB_HOST="zhiweijz-postgres"
fi

# 解析命令行参数
TARGET_YEAR=""
TARGET_MONTH=""

if [ $# -eq 0 ]; then
    # 没有参数，使用当前年月
    TARGET_YEAR=$(date +%Y)
    TARGET_MONTH=$(date +%m | sed 's/^0//')  # 去掉前导零
    log_info "未指定年月，使用当前月份: ${TARGET_YEAR}年${TARGET_MONTH}月"
elif [ $# -eq 2 ]; then
    # 指定了年月
    TARGET_YEAR="$1"
    TARGET_MONTH="$2"
    
    # 验证年份
    if ! [[ "$TARGET_YEAR" =~ ^[0-9]{4}$ ]] || [ "$TARGET_YEAR" -lt 2020 ] || [ "$TARGET_YEAR" -gt 2030 ]; then
        log_error "无效的年份: $TARGET_YEAR (应该是2020-2030之间的四位数字)"
        exit 1
    fi
    
    # 验证月份
    if ! [[ "$TARGET_MONTH" =~ ^[0-9]{1,2}$ ]] || [ "$TARGET_MONTH" -lt 1 ] || [ "$TARGET_MONTH" -gt 12 ]; then
        log_error "无效的月份: $TARGET_MONTH (应该是1-12之间的数字)"
        exit 1
    fi
    
    log_info "指定目标月份: ${TARGET_YEAR}年${TARGET_MONTH}月"
else
    log_error "参数错误"
    echo "使用方法: $0 [年份] [月份]"
    echo "示例:"
    echo "  $0                    # 修复当前月份"
    echo "  $0 2025 9            # 修复2025年9月"
    echo "  $0 2025 10           # 修复2025年10月"
    exit 1
fi

# 显示配置信息
echo ""
log_info "=== 配置信息 ==="
log_info "数据库主机: $FINAL_DB_HOST"
log_info "数据库端口: $FINAL_DB_PORT"
log_info "数据库名称: $POSTGRES_DB"
log_info "数据库用户: $POSTGRES_USER"
log_info "目标年月: ${TARGET_YEAR}年${TARGET_MONTH}月"
log_info "配置文件: $ENV_FILE"
echo ""

# 检查psql是否可用
if ! command -v psql &> /dev/null; then
    log_error "psql命令未找到，请安装PostgreSQL客户端"
    exit 1
fi

# 测试数据库连接
log_info "测试数据库连接..."
log_info "尝试连接: $POSTGRES_USER@$FINAL_DB_HOST:$FINAL_DB_PORT/$POSTGRES_DB"

# 尝试多种连接方式
CONNECTION_SUCCESS=false

# 方式1：使用配置的主机
if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$FINAL_DB_HOST" -p "$FINAL_DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
    CONNECTION_SUCCESS=true
    log_success "数据库连接测试成功 (使用主机: $FINAL_DB_HOST)"
else
    log_warning "无法连接到 $FINAL_DB_HOST，尝试其他连接方式..."

    # 方式2：尝试容器名
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "zhiweijz-postgres" -p "$FINAL_DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
        CONNECTION_SUCCESS=true
        FINAL_DB_HOST="zhiweijz-postgres"
        log_success "数据库连接测试成功 (使用容器名: zhiweijz-postgres)"
    else
        # 方式3：尝试localhost
        if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "localhost" -p "$FINAL_DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
            CONNECTION_SUCCESS=true
            FINAL_DB_HOST="localhost"
            log_success "数据库连接测试成功 (使用localhost)"
        else
            # 方式4：尝试127.0.0.1
            if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "127.0.0.1" -p "$FINAL_DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
                CONNECTION_SUCCESS=true
                FINAL_DB_HOST="127.0.0.1"
                log_success "数据库连接测试成功 (使用127.0.0.1)"
            fi
        fi
    fi
fi

if [ "$CONNECTION_SUCCESS" = false ]; then
    log_error "无法连接到数据库"
    log_error "已尝试的连接方式："
    log_error "  1. $FINAL_DB_HOST:$FINAL_DB_PORT"
    log_error "  2. zhiweijz-postgres:$FINAL_DB_PORT"
    log_error "  3. localhost:$FINAL_DB_PORT"
    log_error "  4. 127.0.0.1:$FINAL_DB_PORT"
    log_error ""
    log_error "请检查："
    log_error "  1. 数据库容器是否正在运行: docker ps | grep postgres"
    log_error "  2. 端口是否正确暴露: docker port zhiweijz-postgres"
    log_error "  3. 防火墙设置"
    log_error "  4. 数据库用户权限"
    exit 1
fi

# 确认执行
echo ""
log_warning "即将执行预算修复操作"
log_warning "目标: 为${TARGET_YEAR}年${TARGET_MONTH}月创建缺失的个人预算"
log_warning "数据库: $POSTGRES_DB@$FINAL_DB_HOST:$FINAL_DB_PORT"
echo ""
read -p "确认执行吗? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_info "操作已取消"
    exit 0
fi

# 执行主修复脚本
log_info "开始执行预算修复脚本..."
echo ""

MAIN_SCRIPT="$SCRIPT_DIR/fix_current_month_budget_creation.sql"
if [ ! -f "$MAIN_SCRIPT" ]; then
    log_error "修复脚本不存在: $MAIN_SCRIPT"
    exit 1
fi

# 执行SQL脚本
if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$FINAL_DB_HOST" -p "$FINAL_DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -v target_year="$TARGET_YEAR" \
    -v target_month="$TARGET_MONTH" \
    -f "$MAIN_SCRIPT"; then
    
    echo ""
    log_success "预算修复脚本执行完成"
    
    # 询问是否执行结转历史修复
    echo ""
    log_info "是否需要执行结转历史修复脚本?"
    log_info "此脚本会修复所有历史预算的结转记录"
    read -p "执行结转历史修复? (y/N): " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        HISTORY_SCRIPT="$SCRIPT_DIR/fix_budget_rollover_history.sql"
        if [ -f "$HISTORY_SCRIPT" ]; then
            log_info "执行结转历史修复脚本..."
            if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$FINAL_DB_HOST" -p "$FINAL_DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
                -f "$HISTORY_SCRIPT"; then
                log_success "结转历史修复脚本执行完成"
            else
                log_error "结转历史修复脚本执行失败"
                exit 1
            fi
        else
            log_warning "结转历史修复脚本不存在: $HISTORY_SCRIPT"
        fi
    fi
    
    echo ""
    log_success "所有修复操作完成!"
    echo ""
    log_info "建议执行以下验证查询来检查结果:"
    echo ""
    echo "1. 检查${TARGET_YEAR}年${TARGET_MONTH}月预算创建情况:"
    echo "   SELECT COUNT(*) FROM budgets WHERE start_date >= '${TARGET_YEAR}-$(printf "%02d" $TARGET_MONTH)-01' AND start_date <= '${TARGET_YEAR}-$(printf "%02d" $TARGET_MONTH)-01' AND budget_type = 'PERSONAL';"
    echo ""
    echo "2. 查看详细预算信息:"
    echo "   SELECT u.name, b.name, b.amount, b.rollover_amount FROM budgets b JOIN users u ON b.user_id = u.id WHERE b.start_date >= '${TARGET_YEAR}-$(printf "%02d" $TARGET_MONTH)-01' AND b.start_date <= '${TARGET_YEAR}-$(printf "%02d" $TARGET_MONTH)-01';"
    
else
    log_error "预算修复脚本执行失败"
    exit 1
fi
