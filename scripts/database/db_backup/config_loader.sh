#!/bin/bash

# 配置文件加载器
# 用途：读取和验证配置文件

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_ENV_FILE="$SCRIPT_DIR/config.env"
CONFIG_TEMPLATE_FILE="$SCRIPT_DIR/config.conf.template"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "ERROR")
            echo -e "${RED}[$timestamp] ERROR: $message${NC}" >&2
            ;;
        "WARN")
            echo -e "${YELLOW}[$timestamp] WARN: $message${NC}" >&2
            ;;
        "INFO")
            echo -e "${GREEN}[$timestamp] INFO: $message${NC}"
            ;;
        "DEBUG")
            if [ "${LOG_LEVEL:-INFO}" = "DEBUG" ]; then
                echo -e "${BLUE}[$timestamp] DEBUG: $message${NC}"
            fi
            ;;
    esac
}

# 检查并创建配置文件
check_and_create_config() {
    if [ ! -f "$CONFIG_ENV_FILE" ]; then
        if [ ! -f "$CONFIG_TEMPLATE_FILE" ]; then
            log "ERROR" "配置模板文件不存在: $CONFIG_TEMPLATE_FILE"
            return 1
        fi
        
        log "WARN" "配置文件不存在: $CONFIG_ENV_FILE"
        echo -e "${YELLOW}请按照以下步骤创建配置文件:${NC}"
        echo "1. 复制模板文件:"
        echo "   cp $CONFIG_TEMPLATE_FILE $CONFIG_ENV_FILE"
        echo ""
        echo "2. 编辑配置文件，修改数据库连接信息:"
        echo "   nano $CONFIG_ENV_FILE"
        echo ""
        echo "3. 重新运行备份工具"
        echo ""
        
        read -p "是否现在自动创建配置文件? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cp "$CONFIG_TEMPLATE_FILE" "$CONFIG_ENV_FILE"
            log "INFO" "已创建配置文件: $CONFIG_ENV_FILE"
            log "WARN" "请编辑配置文件并修改数据库连接信息后重新运行"
            return 2  # 返回特殊状态码，表示需要用户编辑配置
        else
            log "ERROR" "无法继续，请先创建配置文件"
            return 1
        fi
    fi
    
    return 0
}

# 加载配置文件
load_config() {
    # 检查并创建配置文件
    check_and_create_config
    local check_result=$?
    
    if [ $check_result -eq 1 ]; then
        return 1
    elif [ $check_result -eq 2 ]; then
        return 2
    fi
    
    log "INFO" "加载配置文件: $CONFIG_ENV_FILE"
    
    # 读取配置文件，忽略注释和空行
    while IFS='=' read -r key value; do
        # 跳过注释行和空行
        if [[ $key =~ ^[[:space:]]*# ]] || [[ -z $key ]]; then
            continue
        fi
        
        # 移除前后空格
        key=$(echo "$key" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        value=$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        
        # 移除值两边的引号
        value=$(echo "$value" | sed 's/^["'\'']*//;s/["'\'']*$//')
        
        # 导出环境变量
        export "$key"="$value"
        log "DEBUG" "加载配置: $key=$value"
        
    done < "$CONFIG_ENV_FILE"
    
    log "INFO" "配置文件加载完成"
    return 0
}

# 验证必需的配置项
validate_config() {
    log "INFO" "验证配置参数..."
    
    local required_vars=(
        "DB_HOST"
        "DB_PORT" 
        "DB_NAME"
        "DB_USER"
        "DB_PASSWORD"
        "PG_CONTAINER_IMAGE"
        "BACKUP_DIR"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        log "ERROR" "缺少必需的配置项: ${missing_vars[*]}"
        return 1
    fi
    
    # 验证数值类型配置
    if ! [[ "$DB_PORT" =~ ^[0-9]+$ ]]; then
        log "ERROR" "DB_PORT必须是数字: $DB_PORT"
        return 1
    fi
    
    if ! [[ "$BACKUP_RETENTION_DAYS" =~ ^[0-9]+$ ]]; then
        log "ERROR" "BACKUP_RETENTION_DAYS必须是数字: $BACKUP_RETENTION_DAYS"
        return 1
    fi
    
    # 验证布尔类型配置
    local bool_vars=(
        "USE_DOCKER"
        "COMPRESS_BACKUP"
        "BACKUP_FULL_DATA"
        "BACKUP_SCHEMA_ONLY"
        "BACKUP_DATA_ONLY"
        "CREATE_SAFETY_BACKUP"
        "CLEAN_TARGET_DB"
        "ENABLE_NOTIFICATIONS"
    )
    
    for var in "${bool_vars[@]}"; do
        local value="${!var}"
        if [ -n "$value" ] && [[ ! "$value" =~ ^(true|false)$ ]]; then
            log "ERROR" "$var 必须是 true 或 false: $value"
            return 1
        fi
    done
    
    # 验证备份格式
    if [ -n "$BACKUP_FORMAT" ] && [[ ! "$BACKUP_FORMAT" =~ ^(plain|custom|directory|tar)$ ]]; then
        log "ERROR" "BACKUP_FORMAT 必须是 plain、custom、directory 或 tar: $BACKUP_FORMAT"
        return 1
    fi
    
    # 验证恢复模式
    if [ -n "$RESTORE_MODE" ] && [[ ! "$RESTORE_MODE" =~ ^(full|schema|data|table)$ ]]; then
        log "ERROR" "RESTORE_MODE 必须是 full、schema、data 或 table: $RESTORE_MODE"
        return 1
    fi
    
    # 验证网络模式
    if [ -n "$DOCKER_NETWORK_MODE" ] && [[ ! "$DOCKER_NETWORK_MODE" =~ ^(host|bridge|none)$ ]]; then
        log "ERROR" "DOCKER_NETWORK_MODE 必须是 host、bridge 或 none: $DOCKER_NETWORK_MODE"
        return 1
    fi
    
    log "INFO" "配置验证通过"
    return 0
}

# 显示配置信息
show_config() {
    echo -e "${BLUE}当前配置信息:${NC}"
    echo -e "${BLUE}================${NC}"
    echo "数据库连接:"
    echo "  主机: $DB_HOST:$DB_PORT"
    echo "  数据库: $DB_NAME"
    echo "  用户: $DB_USER"
    echo "  密码: ${DB_PASSWORD:0:3}***"
    echo ""
    echo "容器配置:"
    echo "  使用Docker: $USE_DOCKER"
    echo "  容器镜像: $PG_CONTAINER_IMAGE"
    echo "  网络模式: $DOCKER_NETWORK_MODE"
    echo ""
    echo "备份配置:"
    echo "  备份目录: $BACKUP_DIR"
    echo "  备份格式: $BACKUP_FORMAT"
    echo "  压缩备份: $COMPRESS_BACKUP"
    echo "  保留天数: $BACKUP_RETENTION_DAYS"
    echo ""
    echo "备份选项:"
    echo "  完整数据: $BACKUP_FULL_DATA"
    echo "  仅结构: $BACKUP_SCHEMA_ONLY"
    echo "  仅数据: $BACKUP_DATA_ONLY"
    echo ""
    echo "恢复配置:"
    echo "  恢复模式: $RESTORE_MODE"
    echo "  安全备份: $CREATE_SAFETY_BACKUP"
    echo "  清理目标: $CLEAN_TARGET_DB"
}

# 创建必要的目录
create_directories() {
    local dirs=(
        "$BACKUP_DIR"
        "$(dirname "$LOG_FILE")"
    )
    
    for dir in "${dirs[@]}"; do
        if [ ! -d "$dir" ]; then
            mkdir -p "$dir"
            log "INFO" "创建目录: $dir"
        fi
    done
}

# 初始化配置
init_config() {
    local load_result
    load_config
    load_result=$?
    
    if [ $load_result -eq 1 ]; then
        return 1
    elif [ $load_result -eq 2 ]; then
        log "WARN" "配置文件已创建，但需要编辑后才能使用"
        echo -e "${YELLOW}请编辑配置文件并重新运行：${NC}"
        echo "  nano $CONFIG_ENV_FILE"
        return 2
    fi
    
    if ! validate_config; then
        return 1
    fi
    
    create_directories
    
    # 设置默认值
    export USE_DOCKER="${USE_DOCKER:-true}"
    export COMPRESS_BACKUP="${COMPRESS_BACKUP:-true}"
    export BACKUP_FULL_DATA="${BACKUP_FULL_DATA:-true}"
    export BACKUP_SCHEMA_ONLY="${BACKUP_SCHEMA_ONLY:-true}"
    export BACKUP_DATA_ONLY="${BACKUP_DATA_ONLY:-false}"
    export BACKUP_FORMAT="${BACKUP_FORMAT:-plain}"
    export PARALLEL_JOBS="${PARALLEL_JOBS:-1}"
    export RESTORE_MODE="${RESTORE_MODE:-full}"
    export CREATE_SAFETY_BACKUP="${CREATE_SAFETY_BACKUP:-true}"
    export CLEAN_TARGET_DB="${CLEAN_TARGET_DB:-true}"
    export DOCKER_NETWORK_MODE="${DOCKER_NETWORK_MODE:-bridge}"
    export LOG_LEVEL="${LOG_LEVEL:-INFO}"
    export BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
    
    return 0
}

# 如果直接运行此脚本，显示配置信息
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    if init_config; then
        show_config
    else
        exit 1
    fi
fi
