#!/bin/bash

# =====================================================
# 手动添加用户签到记录脚本
# =====================================================
#
# 功能：为指定用户添加指定日期的签到记录
#
# 使用方法：
# ./add_checkin_record.sh [用户ID] [日期]
#
# 示例：
# ./add_checkin_record.sh abc123 2024-11-20
# ./add_checkin_record.sh abc123              # 使用今天日期
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

# 辅助函数：从.env文件读取变量（不覆盖已有环境变量）
read_env_var() {
    local var_name="$1"
    local current_value="${!var_name}"

    # 如果环境变量已设置，直接返回
    if [ -n "$current_value" ]; then
        echo "$current_value"
        return
    fi

    # 从.env文件读取
    if [ -f "$ENV_FILE" ]; then
        local file_value=$(grep "^${var_name}=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
        echo "$file_value"
    fi
}

# 显示帮助信息
show_help() {
    echo "手动添加用户签到记录脚本"
    echo ""
    echo "使用方法: $0 [用户ID] [日期]"
    echo ""
    echo "参数:"
    echo "  用户ID    必填，用户的UUID或邮箱"
    echo "  日期      可选，格式为 YYYY-MM-DD，默认为今天"
    echo ""
    echo "示例:"
    echo "  $0 abc123 2024-11-20        # 为用户abc123添加2024-11-20的签到"
    echo "  $0 abc123                   # 为用户abc123添加今天的签到"
    echo "  $0 user@example.com         # 通过邮箱添加今天的签到"
    echo ""
    exit 0
}

# 解析命令行参数
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
fi

USER_ID="$1"
CHECKIN_DATE="$2"

# 如果没有提供日期，使用今天
if [ -z "$CHECKIN_DATE" ]; then
    CHECKIN_DATE=$(date +%Y-%m-%d)
fi

# 验证用户ID
if [ -z "$USER_ID" ]; then
    log_error "请提供用户ID或邮箱"
    echo ""
    show_help
fi

# 验证日期格式
if ! [[ "$CHECKIN_DATE" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    log_error "无效的日期格式: $CHECKIN_DATE (应该是 YYYY-MM-DD 格式)"
    exit 1
fi

# 读取数据库配置（优先使用环境变量）
POSTGRES_DB="${POSTGRES_DB:-$(read_env_var POSTGRES_DB)}"
POSTGRES_DB="${POSTGRES_DB:-$(read_env_var DB_NAME)}"

POSTGRES_USER="${POSTGRES_USER:-$(read_env_var POSTGRES_USER)}"
POSTGRES_USER="${POSTGRES_USER:-$(read_env_var DB_USER)}"

POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(read_env_var POSTGRES_PASSWORD)}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(read_env_var DB_PASSWORD)}"

# 读取DATABASE_URL（如果需要）
if [ -z "$DATABASE_URL" ]; then
    DATABASE_URL=$(read_env_var DATABASE_URL)
fi

# 检查必需的环境变量
if [ -z "$POSTGRES_DB" ] || [ -z "$POSTGRES_USER" ] || [ -z "$POSTGRES_PASSWORD" ]; then
    log_error "缺少必需的数据库配置变量"
    log_error "请通过环境变量或.env文件提供以下变量之一："
    log_error "  POSTGRES_DB/DB_NAME, POSTGRES_USER/DB_USER, POSTGRES_PASSWORD/DB_PASSWORD"
    log_error ""
    log_error "当前读取到的值："
    log_error "  POSTGRES_DB: ${POSTGRES_DB:-未设置}"
    log_error "  POSTGRES_USER: ${POSTGRES_USER:-未设置}"
    log_error "  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:+已设置}"
    log_error "  DATABASE_URL: ${DATABASE_URL:+已设置}"
    log_error "  ENV_FILE: $ENV_FILE"
    exit 1
fi

log_info "数据库配置已加载 (来源: ${DATABASE_URL:+环境变量}${DATABASE_URL:-配置文件})"

# 设置数据库连接参数
# 优先级：DB_HOST环境变量 > DATABASE_URL中的主机 > 默认值
FINAL_DB_HOST="${DB_HOST}"
FINAL_DB_PORT="${DB_PORT:-5432}"

# 如果DB_HOST未设置，尝试从DATABASE_URL中提取
if [ -z "$FINAL_DB_HOST" ] && [ -n "$DATABASE_URL" ]; then
    # 从DATABASE_URL中提取主机名
    # 格式: postgresql://user:pass@host:port/db
    EXTRACTED_HOST=$(echo "$DATABASE_URL" | sed -n 's|.*@\([^:]*\):.*|\1|p')
    if [ -n "$EXTRACTED_HOST" ]; then
        FINAL_DB_HOST="$EXTRACTED_HOST"
        log_info "从DATABASE_URL中提取主机: $FINAL_DB_HOST"
    fi
fi

# 如果仍然未设置，使用默认值
if [ -z "$FINAL_DB_HOST" ]; then
    FINAL_DB_HOST="localhost"
    log_warning "使用默认数据库主机: localhost"
fi

log_info "=== 配置信息 ==="
log_info "数据库主机: $FINAL_DB_HOST"
log_info "数据库端口: $FINAL_DB_PORT"
log_info "数据库名称: $POSTGRES_DB"
log_info "数据库用户: $POSTGRES_USER"
log_info "用户ID: $USER_ID"
log_info "签到日期: $CHECKIN_DATE"
echo ""

# 检查psql是否可用
if ! command -v psql &> /dev/null; then
    log_error "psql命令未找到，请安装PostgreSQL客户端"
    exit 1
fi

# 测试数据库连接
log_info "测试数据库连接..."
CONNECTION_SUCCESS=false

# 尝试多种连接方式
for host in "$FINAL_DB_HOST" "localhost" "127.0.0.1" "zhiweijz-postgres"; do
    if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$host" -p "$FINAL_DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT 1;" &> /dev/null; then
        CONNECTION_SUCCESS=true
        FINAL_DB_HOST="$host"
        log_success "数据库连接测试成功 (使用主机: $host)"
        break
    fi
done

if [ "$CONNECTION_SUCCESS" = false ]; then
    log_error "无法连接到数据库"
    log_error "请检查："
    log_error "  1. 数据库容器是否正在运行: docker ps | grep postgres"
    log_error "  2. 端口是否正确暴露: docker port zhiweijz-postgres"
    exit 1
fi

# 执行SQL脚本
log_info "=== 开始添加签到记录 ==="
echo ""

SQL_SCRIPT="$SCRIPT_DIR/add_checkin_record.sql"

if [ ! -f "$SQL_SCRIPT" ]; then
    log_error "SQL脚本不存在: $SQL_SCRIPT"
    exit 1
fi

# 执行SQL脚本
if PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$FINAL_DB_HOST" -p "$FINAL_DB_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
    -c "SET app.user_id = '$USER_ID'; SET app.checkin_date = '$CHECKIN_DATE';" \
    -f "$SQL_SCRIPT"; then
    echo ""
    log_success "签到记录添加完成！"
else
    echo ""
    log_error "签到记录添加失败"
    exit 1
fi
