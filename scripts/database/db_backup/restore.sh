#!/bin/bash

# 数据库恢复脚本
# 用途：根据配置文件执行数据库恢复操作

set -e

# 获取脚本目录并加载依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config_loader.sh"
source "$SCRIPT_DIR/db_utils.sh"

# 列出可用的备份文件
list_backup_files() {
    local backup_type="$1"  # full, schema, data, table, all
    local backup_dir="$SCRIPT_DIR/$BACKUP_DIR"
    
    if [ ! -d "$backup_dir" ]; then
        log "ERROR" "备份目录不存在: $backup_dir"
        return 1
    fi
    
    log "INFO" "可用的备份文件:"
    
    local pattern=""
    case $backup_type in
        "full")
            pattern="${BACKUP_PREFIX}_full_*"
            ;;
        "schema")
            pattern="${BACKUP_PREFIX}_schema_*"
            ;;
        "data")
            pattern="${BACKUP_PREFIX}_data_*"
            ;;
        "table")
            pattern="${BACKUP_PREFIX}_table_*"
            ;;
        "all"|*)
            pattern="${BACKUP_PREFIX}_*"
            ;;
    esac
    
    local files=($(ls -t "$backup_dir"/$pattern 2>/dev/null || true))
    
    if [ ${#files[@]} -eq 0 ]; then
        log "WARN" "未找到匹配的备份文件"
        return 1
    fi
    
    for i in "${!files[@]}"; do
        local file="${files[$i]}"
        local filename=$(basename "$file")
        local filesize=""
        local filedate=""
        
        if [ -f "$file" ]; then
            filesize=$(ls -lh "$file" | awk '{print $5}')
            filedate=$(stat -c "%y" "$file" 2>/dev/null | cut -d'.' -f1 || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null)
        elif [ -d "$file" ]; then
            filesize=$(du -sh "$file" | cut -f1)
            filedate=$(stat -c "%y" "$file" 2>/dev/null | cut -d'.' -f1 || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null)
        fi
        
        echo "  $((i+1)). $filename ($filesize) - $filedate"
    done
}

# 选择备份文件
select_backup_file() {
    local backup_type="$1"
    local backup_dir="$SCRIPT_DIR/$BACKUP_DIR"
    
    if [ ! -d "$backup_dir" ]; then
        log "ERROR" "备份目录不存在: $backup_dir"
        return 1
    fi
    
    local pattern=""
    case $backup_type in
        "full")
            pattern="${BACKUP_PREFIX}_full_*"
            ;;
        "schema")
            pattern="${BACKUP_PREFIX}_schema_*"
            ;;
        "data")
            pattern="${BACKUP_PREFIX}_data_*"
            ;;
        "table")
            pattern="${BACKUP_PREFIX}_table_*"
            ;;
        "all"|*)
            pattern="${BACKUP_PREFIX}_*"
            ;;
    esac
    
    local files=($(ls -t "$backup_dir"/$pattern 2>/dev/null || true))
    
    if [ ${#files[@]} -eq 0 ]; then
        log "WARN" "未找到匹配的备份文件"
        return 1
    fi
    
    echo "可用的备份文件:"
    for i in "${!files[@]}"; do
        local file="${files[$i]}"
        local filename=$(basename "$file")
        local filesize=""
        local filedate=""
        
        if [ -f "$file" ]; then
            filesize=$(ls -lh "$file" | awk '{print $5}')
            filedate=$(stat -c "%y" "$file" 2>/dev/null | cut -d'.' -f1 || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null)
        elif [ -d "$file" ]; then
            filesize=$(du -sh "$file" | cut -f1)
            filedate=$(stat -c "%y" "$file" 2>/dev/null | cut -d'.' -f1 || stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$file" 2>/dev/null)
        fi
        
        echo "  $((i+1)). $filename ($filesize) - $filedate"
    done
    
    echo ""
    read -p "请选择要恢复的备份文件 (1-${#files[@]}): " choice
    
    if ! [[ "$choice" =~ ^[0-9]+$ ]] || [ "$choice" -lt 1 ] || [ "$choice" -gt ${#files[@]} ]; then
        log "ERROR" "无效的选择"
        return 1
    fi
    
    echo "${files[$((choice-1))]}"
}

# 创建安全备份
create_safety_backup() {
    if [ "$CREATE_SAFETY_BACKUP" != "true" ]; then
        log "INFO" "跳过安全备份创建"
        return 0
    fi
    
    log "INFO" "创建安全备份..."
    
    local safety_backup_file="$SCRIPT_DIR/$BACKUP_DIR/safety_backup_$(date +"%Y%m%d_%H%M%S").sql"
    local pg_dump_args="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    pg_dump_args="$pg_dump_args --no-password --format=plain"
    
    if [ "$USE_DOCKER" = "true" ]; then
        pg_dump_args="$pg_dump_args --file=/backup/$(basename "$safety_backup_file")"
        local docker_cmd=$(build_docker_cmd "pg_dump" "$pg_dump_args")
        if eval "$docker_cmd"; then
            log "INFO" "安全备份已创建: $safety_backup_file"
            
            if [ "$COMPRESS_BACKUP" = "true" ]; then
                gzip "$safety_backup_file"
                safety_backup_file="${safety_backup_file}.gz"
                log "INFO" "安全备份已压缩: $safety_backup_file"
            fi
            
            echo "$safety_backup_file"
            return 0
        else
            log "ERROR" "安全备份创建失败"
            return 1
        fi
    else
        setup_pg_env
        pg_dump $pg_dump_args --file="$safety_backup_file"
        
        if [ -f "$safety_backup_file" ]; then
            log "INFO" "安全备份已创建: $safety_backup_file"
            
            if [ "$COMPRESS_BACKUP" = "true" ]; then
                gzip "$safety_backup_file"
                safety_backup_file="${safety_backup_file}.gz"
                log "INFO" "安全备份已压缩: $safety_backup_file"
            fi
            
            echo "$safety_backup_file"
            return 0
        else
            log "ERROR" "安全备份创建失败"
            return 1
        fi
    fi
}

# 准备恢复文件
prepare_restore_file() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ] && [ ! -d "$backup_file" ]; then
        log "ERROR" "备份文件不存在: $backup_file"
        return 1
    fi
    
    # 如果是压缩文件，需要解压
    if [[ "$backup_file" == *.gz ]]; then
        log "INFO" "解压备份文件..." >&2  # 将日志输出重定向到stderr
        local temp_file="/tmp/$(basename "$backup_file" .gz)"
        if gunzip -c "$backup_file" > "$temp_file"; then
            echo "$temp_file"  # 只输出文件路径到stdout
        else
            log "ERROR" "解压备份文件失败" >&2
            return 1
        fi
    else
        echo "$backup_file"
    fi
}

# 构建恢复命令参数
build_restore_args() {
    local backup_file="$1"
    local restore_mode="$2"
    local target_tables="$3"
    
    local args=""
    local use_psql=false
    
    # 根据备份文件格式选择恢复工具
    if [[ "$backup_file" == *.sql ]] || [[ "$backup_file" == *plain* ]]; then
        # SQL文件使用psql恢复
        use_psql=true
        args="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --no-password"
        
        if [ "$USE_DOCKER" = "true" ]; then
            # Docker模式下，需要将文件复制到备份目录，然后使用容器内路径
            local backup_dir="$SCRIPT_DIR/$BACKUP_DIR"
            local filename=$(basename "$backup_file")
            
            # 确保备份目录存在
            mkdir -p "$backup_dir"
            
            # 如果文件不在备份目录中，复制过去
            if [[ "$backup_file" != "$backup_dir"* ]]; then
                log "DEBUG" "复制备份文件到备份目录: $backup_file -> $backup_dir/$filename" >&2
                if cp "$backup_file" "$backup_dir/$filename"; then
                    log "DEBUG" "文件复制成功" >&2
                else
                    log "ERROR" "文件复制失败" >&2
                    return 1
                fi
            fi
            
            args="$args -f /backup/$filename"
        else
            args="$args -f $backup_file"
        fi
    else
        # 其他格式使用pg_restore恢复
        use_psql=false
        args="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME --no-password --verbose"
        
        # 设置恢复模式
        case $restore_mode in
            "schema")
                args="$args --schema-only"
                ;;
            "data")
                args="$args --data-only"
                ;;
            "table")
                if [ -n "$target_tables" ]; then
                    IFS=',' read -ra TABLES <<< "$target_tables"
                    for table in "${TABLES[@]}"; do
                        table=$(echo "$table" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
                        args="$args --table=$table"
                    done
                fi
                ;;
        esac
        
        # 设置清理选项
        if [ "$CLEAN_TARGET_DB" = "true" ] && [ "$restore_mode" = "full" ]; then
            args="$args --clean --if-exists"
        fi
        
        if [ "$USE_DOCKER" = "true" ]; then
            local backup_dir="$SCRIPT_DIR/$BACKUP_DIR"
            local filename=$(basename "$backup_file")
            
            # 确保备份目录存在
            mkdir -p "$backup_dir"
            
            # 如果文件不在备份目录中，复制过去
            if [[ "$backup_file" != "$backup_dir"* ]]; then
                log "DEBUG" "复制备份文件到备份目录: $backup_file -> $backup_dir/$filename" >&2
                if cp "$backup_file" "$backup_dir/$filename"; then
                    log "DEBUG" "文件复制成功" >&2
                else
                    log "ERROR" "文件复制失败" >&2
                    return 1
                fi
            fi
            
            args="$args /backup/$filename"
        else
            args="$args $backup_file"
        fi
    fi
    
    echo "$use_psql|$args"
}

# 执行恢复操作
perform_restore() {
    local backup_file="$1"
    local restore_mode="$2"
    local target_tables="$3"
    
    log "INFO" "开始恢复数据库..."
    log "INFO" "备份文件: $(basename "$backup_file")"
    log "INFO" "恢复模式: $restore_mode"
    
    # 检查备份文件是否存在
    if [ ! -f "$backup_file" ] && [ ! -d "$backup_file" ]; then
        log "ERROR" "备份文件不存在: $backup_file"
        return 1
    fi
    
    # 准备恢复文件
    local restore_file=$(prepare_restore_file "$backup_file")
    if [ $? -ne 0 ]; then
        return 1
    fi
    
    # 如果需要清理数据库
    if [ "$CLEAN_TARGET_DB" = "true" ] && [ "$restore_mode" = "full" ]; then
        log "WARN" "清理目标数据库..."
        if ! clean_database; then
            log "ERROR" "清理数据库失败"
            return 1
        fi
    fi
    
    # 构建恢复命令
    local restore_info=$(build_restore_args "$restore_file" "$restore_mode" "$target_tables")
    local use_psql=$(echo "$restore_info" | cut -d'|' -f1)
    local restore_args=$(echo "$restore_info" | cut -d'|' -f2-)
    
    log "DEBUG" "恢复工具: $([ "$use_psql" = "true" ] && echo "psql" || echo "pg_restore")"
    log "DEBUG" "恢复参数: $restore_args"
    
    # 执行恢复
    local success=false
    if [ "$use_psql" = "true" ]; then
        if execute_pg_cmd psql $restore_args; then
            success=true
        fi
    else
        if execute_pg_cmd pg_restore $restore_args; then
            success=true
        fi
    fi
    
    # 清理临时文件
    if [[ "$restore_file" == /tmp/* ]] && [ -f "$restore_file" ]; then
        rm -f "$restore_file"
    fi
    
    if [ "$success" = "true" ]; then
        log "INFO" "数据库恢复成功"
        return 0
    else
        log "ERROR" "数据库恢复失败"
        return 1
    fi
}

# 恢复指定表
restore_tables() {
    local table_names="$1"
    
    if [ -z "$table_names" ]; then
        log "ERROR" "未指定要恢复的表"
        return 1
    fi
    
    # 选择表备份文件
    local backup_file=$(select_backup_file "table")
    if [ $? -ne 0 ] || [ -z "$backup_file" ]; then
        log "ERROR" "未选择有效的备份文件"
        return 1
    fi
    
    perform_restore "$backup_file" "table" "$table_names"
}

# 交互式恢复
interactive_restore() {
    echo -e "${BLUE}交互式数据库恢复${NC}"
    echo -e "${BLUE}==================${NC}"
    
    # 选择恢复模式
    echo "请选择恢复模式:"
    echo "1. 完整恢复（删除现有数据）"
    echo "2. 仅恢复表结构"
    echo "3. 仅恢复数据"
    echo "4. 恢复指定表"
    echo ""
    read -p "请选择 (1-4): " mode_choice
    
    local restore_mode=""
    local target_tables=""
    
    case $mode_choice in
        1)
            restore_mode="full"
            ;;
        2)
            restore_mode="schema"
            ;;
        3)
            restore_mode="data"
            ;;
        4)
            restore_mode="table"
            read -p "请输入要恢复的表名（用逗号分隔）: " target_tables
            if [ -z "$target_tables" ]; then
                log "ERROR" "未指定表名"
                return 1
            fi
            ;;
        *)
            log "ERROR" "无效的选择"
            return 1
            ;;
    esac
    
    # 选择备份文件
    local backup_type="all"
    if [ "$restore_mode" != "full" ]; then
        backup_type="$restore_mode"
    fi
    
    local backup_file=$(select_backup_file "$backup_type")
    if [ $? -ne 0 ] || [ -z "$backup_file" ]; then
        log "ERROR" "未选择有效的备份文件"
        return 1
    fi
    
    # 确认恢复操作
    echo ""
    echo -e "${YELLOW}⚠️  警告: 此操作将修改数据库内容！${NC}"
    if [ "$restore_mode" = "full" ] && [ "$CLEAN_TARGET_DB" = "true" ]; then
        echo -e "${YELLOW}⚠️  警告: 将删除现有数据库中的所有数据！${NC}"
    fi
    echo ""
    echo "恢复信息:"
    echo "  备份文件: $(basename "$backup_file")"
    echo "  恢复模式: $restore_mode"
    if [ -n "$target_tables" ]; then
        echo "  目标表: $target_tables"
    fi
    echo ""
    read -p "确认执行恢复操作? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        log "INFO" "恢复操作已取消"
        return 0
    fi
    
    # 创建安全备份
    local safety_backup=""
    if [ "$CREATE_SAFETY_BACKUP" = "true" ]; then
        safety_backup=$(create_safety_backup)
        if [ $? -ne 0 ]; then
            log "ERROR" "安全备份创建失败，恢复操作已取消"
            return 1
        fi
    fi
    
    # 执行恢复
    if perform_restore "$backup_file" "$restore_mode" "$target_tables"; then
        log "INFO" "恢复操作完成"
        if [ -n "$safety_backup" ]; then
            log "INFO" "安全备份位置: $safety_backup"
        fi
        return 0
    else
        log "ERROR" "恢复操作失败"
        if [ -n "$safety_backup" ]; then
            log "INFO" "可使用安全备份恢复: $safety_backup"
        fi
        return 1
    fi
}

# 主函数
main() {
    local action="$1"
    local backup_file="$2"
    local target_tables="$3"
    
    # 初始化配置
    init_config
local config_result=$?
if [ $config_result -eq 1 ]; then
    log "ERROR" "配置初始化失败"
    exit 1
elif [ $config_result -eq 2 ]; then
    log "ERROR" "请先编辑配置文件后重新运行"
    exit 2
fi
    
    # 测试数据库连接
    if ! test_connection; then
        log "ERROR" "数据库连接失败"
        exit 1
    fi
    
    case $action in
        "interactive"|"i")
            interactive_restore
            ;;
        "full")
            if [ -z "$backup_file" ]; then
                backup_file=$(select_backup_file "full")
            fi
            if [ -n "$backup_file" ]; then
                create_safety_backup >/dev/null
                perform_restore "$backup_file" "full"
            fi
            ;;
        "schema")
            if [ -z "$backup_file" ]; then
                backup_file=$(select_backup_file "schema")
            fi
            if [ -n "$backup_file" ]; then
                perform_restore "$backup_file" "schema"
            fi
            ;;
        "data")
            if [ -z "$backup_file" ]; then
                backup_file=$(select_backup_file "data")
            fi
            if [ -n "$backup_file" ]; then
                perform_restore "$backup_file" "data"
            fi
            ;;
        "table")
            if [ -z "$target_tables" ]; then
                restore_tables "$backup_file"
            else
                if [ -z "$backup_file" ]; then
                    backup_file=$(select_backup_file "table")
                fi
                if [ -n "$backup_file" ]; then
                    perform_restore "$backup_file" "table" "$target_tables"
                fi
            fi
            ;;
        "list")
            list_backup_files "all"
            return 0
            ;;
        *)
            echo "用法: $0 {interactive|full|schema|data|table|list} [backup_file] [table_names]"
            echo ""
            echo "恢复模式:"
            echo "  interactive  - 交互式恢复（推荐）"
            echo "  full         - 完整恢复（结构+数据）"
            echo "  schema       - 仅恢复表结构"
            echo "  data         - 仅恢复数据"
            echo "  table        - 恢复指定表"
            echo "  list         - 列出可用备份文件"
            echo ""
            echo "示例:"
            echo "  $0 interactive                    # 交互式恢复"
            echo "  $0 full /path/to/backup.sql       # 从指定文件完整恢复"
            echo "  $0 table backup.sql users,orders  # 恢复指定表"
            exit 1
            ;;
    esac
    
    log "INFO" "恢复操作完成"
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
