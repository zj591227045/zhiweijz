#!/bin/bash

# 数据库备份脚本
# 用途：根据配置文件执行数据库备份操作

set -e

# 获取脚本目录并加载依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config_loader.sh"
source "$SCRIPT_DIR/db_utils.sh"

# 生成备份文件名
generate_backup_filename() {
    local backup_type="$1"  # full, schema, data, table
    local table_name="$2"   # 仅在backup_type=table时使用
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    
    local filename="${BACKUP_PREFIX}_${backup_type}_${timestamp}"
    
    if [ "$backup_type" = "table" ] && [ -n "$table_name" ]; then
        filename="${BACKUP_PREFIX}_table_${table_name}_${timestamp}"
    fi
    
    case $BACKUP_FORMAT in
        "plain")
            filename="${filename}.sql"
            ;;
        "custom")
            filename="${filename}.dump"
            ;;
        "directory")
            filename="${filename}_dir"
            ;;
        "tar")
            filename="${filename}.tar"
            ;;
    esac
    
    echo "$SCRIPT_DIR/$BACKUP_DIR/$filename"
}

# 构建pg_dump参数
build_pg_dump_args() {
    local backup_type="$1"
    local backup_file="$2"
    local table_name="$3"
    
    local args="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    args="$args --no-password --verbose"
    
    # 设置备份格式
    case $BACKUP_FORMAT in
        "plain")
            args="$args --format=plain"
            ;;
        "custom")
            args="$args --format=custom"
            ;;
        "directory")
            args="$args --format=directory"
            ;;
        "tar")
            args="$args --format=tar"
            ;;
    esac
    
    # 设置并行作业数
    if [ "$PARALLEL_JOBS" -gt 1 ] && [[ "$BACKUP_FORMAT" =~ ^(custom|directory)$ ]]; then
        args="$args --jobs=$PARALLEL_JOBS"
    fi
    
    # 设置备份类型
    case $backup_type in
        "schema")
            args="$args --schema-only"
            ;;
        "data")
            args="$args --data-only"
            ;;
        "table")
            if [ -n "$table_name" ]; then
                args="$args --table=$table_name"
            fi
            ;;
    esac
    
    # 处理包含/排除表
    if [ -n "$INCLUDE_TABLES" ] && [ "$backup_type" != "table" ]; then
        IFS=',' read -ra TABLES <<< "$INCLUDE_TABLES"
        for table in "${TABLES[@]}"; do
            args="$args --table=$(echo "$table" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
        done
    fi
    
    if [ -n "$EXCLUDE_TABLES" ] && [ "$backup_type" != "table" ]; then
        IFS=',' read -ra TABLES <<< "$EXCLUDE_TABLES"
        for table in "${TABLES[@]}"; do
            args="$args --exclude-table=$(echo "$table" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
        done
    fi
    
    # 设置输出文件
    if [ "$USE_DOCKER" = "true" ]; then
        args="$args --file=/backup/$(basename "$backup_file")"
    else
        args="$args --file=$backup_file"
    fi
    
    echo "$args"
}

# 执行备份
perform_backup() {
    local backup_type="$1"
    local table_name="$2"
    
    log "INFO" "开始执行 $backup_type 备份..."
    
    local backup_file=$(generate_backup_filename "$backup_type" "$table_name")
    local pg_dump_args=$(build_pg_dump_args "$backup_type" "$backup_file" "$table_name")
    
    log "INFO" "备份文件: $backup_file"
    log "DEBUG" "pg_dump参数: $pg_dump_args"
    
    # 执行备份
    if execute_pg_cmd pg_dump $pg_dump_args; then
        log "INFO" "$backup_type 备份成功: $backup_file"
        
        # 压缩备份文件
        if [ "$COMPRESS_BACKUP" = "true" ] && [ "$BACKUP_FORMAT" = "plain" ]; then
            log "INFO" "压缩备份文件..."
            if gzip "$backup_file"; then
                backup_file="${backup_file}.gz"
                log "INFO" "备份文件已压缩: $backup_file"
            else
                log "WARN" "压缩备份文件失败"
            fi
        fi
        
        # 显示备份文件信息
        if [ -f "$backup_file" ]; then
            local file_size=$(ls -lh "$backup_file" | awk '{print $5}')
            log "INFO" "备份文件大小: $file_size"
        elif [ -d "$backup_file" ]; then
            local dir_size=$(du -sh "$backup_file" | cut -f1)
            log "INFO" "备份目录大小: $dir_size"
        fi
        
        return 0
    else
        log "ERROR" "$backup_type 备份失败"
        return 1
    fi
}

# 备份指定表
backup_tables() {
    local tables="$1"
    
    if [ -z "$tables" ]; then
        log "ERROR" "未指定要备份的表"
        return 1
    fi
    
    IFS=',' read -ra TABLE_LIST <<< "$tables"
    local success_count=0
    local total_count=${#TABLE_LIST[@]}
    
    for table in "${TABLE_LIST[@]}"; do
        table=$(echo "$table" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        log "INFO" "备份表: $table"
        
        if table_exists "$table"; then
            if perform_backup "table" "$table"; then
                ((success_count++))
            fi
        else
            log "ERROR" "表不存在: $table"
        fi
    done
    
    log "INFO" "表备份完成: $success_count/$total_count 成功"
    
    if [ $success_count -eq $total_count ]; then
        return 0
    else
        return 1
    fi
}

# 清理旧备份
cleanup_old_backups() {
    if [ "$BACKUP_RETENTION_DAYS" -le 0 ]; then
        log "INFO" "跳过备份清理 (BACKUP_RETENTION_DAYS=$BACKUP_RETENTION_DAYS)"
        return 0
    fi
    
    log "INFO" "清理 $BACKUP_RETENTION_DAYS 天前的备份文件..."
    
    local backup_dir="$SCRIPT_DIR/$BACKUP_DIR"
    local deleted_count=0
    
    # 查找并删除旧文件
    while IFS= read -r -d '' file; do
        rm -f "$file"
        log "INFO" "删除旧备份: $(basename "$file")"
        ((deleted_count++))
    done < <(find "$backup_dir" -name "${BACKUP_PREFIX}_*" -type f -mtime +$BACKUP_RETENTION_DAYS -print0 2>/dev/null)
    
    # 查找并删除旧目录
    while IFS= read -r -d '' dir; do
        rm -rf "$dir"
        log "INFO" "删除旧备份目录: $(basename "$dir")"
        ((deleted_count++))
    done < <(find "$backup_dir" -name "${BACKUP_PREFIX}_*" -type d -mtime +$BACKUP_RETENTION_DAYS -print0 2>/dev/null)
    
    log "INFO" "清理完成，删除了 $deleted_count 个旧备份"
}

# 显示备份统计
show_backup_stats() {
    local backup_dir="$SCRIPT_DIR/$BACKUP_DIR"
    
    if [ ! -d "$backup_dir" ]; then
        log "INFO" "备份目录不存在"
        return 0
    fi
    
    log "INFO" "备份统计信息:"
    
    # 统计各类型备份数量
    local full_count=$(ls "$backup_dir"/${BACKUP_PREFIX}_full_* 2>/dev/null | wc -l)
    local schema_count=$(ls "$backup_dir"/${BACKUP_PREFIX}_schema_* 2>/dev/null | wc -l)
    local data_count=$(ls "$backup_dir"/${BACKUP_PREFIX}_data_* 2>/dev/null | wc -l)
    local table_count=$(ls "$backup_dir"/${BACKUP_PREFIX}_table_* 2>/dev/null | wc -l)
    
    echo "  完整备份: $full_count 个"
    echo "  结构备份: $schema_count 个"
    echo "  数据备份: $data_count 个"
    echo "  表备份: $table_count 个"
    
    # 计算总大小
    local total_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)
    echo "  总大小: $total_size"
    
    # 最新备份时间
    local latest_backup=$(ls -t "$backup_dir"/${BACKUP_PREFIX}_* 2>/dev/null | head -1)
    if [ -n "$latest_backup" ]; then
        local latest_time=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$latest_backup" 2>/dev/null || stat -c "%y" "$latest_backup" 2>/dev/null | cut -d'.' -f1)
        echo "  最新备份: $latest_time"
    fi
}

# 主函数
main() {
    local action="$1"
    local target="$2"
    
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
        "full")
            if [ "$BACKUP_FULL_DATA" = "true" ]; then
                perform_backup "full"
            else
                log "WARN" "完整备份已禁用 (BACKUP_FULL_DATA=false)"
            fi
            ;;
        "schema")
            if [ "$BACKUP_SCHEMA_ONLY" = "true" ]; then
                perform_backup "schema"
            else
                log "WARN" "结构备份已禁用 (BACKUP_SCHEMA_ONLY=false)"
            fi
            ;;
        "data")
            if [ "$BACKUP_DATA_ONLY" = "true" ]; then
                perform_backup "data"
            else
                log "WARN" "数据备份已禁用 (BACKUP_DATA_ONLY=false)"
            fi
            ;;
        "table")
            if [ -z "$target" ]; then
                log "ERROR" "请指定要备份的表名"
                exit 1
            fi
            backup_tables "$target"
            ;;
        "all")
            local success=true
            
            if [ "$BACKUP_FULL_DATA" = "true" ]; then
                perform_backup "full" || success=false
            fi
            
            if [ "$BACKUP_SCHEMA_ONLY" = "true" ]; then
                perform_backup "schema" || success=false
            fi
            
            if [ "$BACKUP_DATA_ONLY" = "true" ]; then
                perform_backup "data" || success=false
            fi
            
            if [ "$success" = "false" ]; then
                exit 1
            fi
            ;;
        "cleanup")
            cleanup_old_backups
            ;;
        "stats")
            show_backup_stats
            ;;
        *)
            echo "用法: $0 {full|schema|data|table|all|cleanup|stats} [table_names]"
            echo ""
            echo "备份类型:"
            echo "  full     - 完整备份（结构+数据）"
            echo "  schema   - 仅备份表结构"
            echo "  data     - 仅备份数据"
            echo "  table    - 备份指定表（用逗号分隔多个表名）"
            echo "  all      - 执行所有启用的备份类型"
            echo ""
            echo "管理操作:"
            echo "  cleanup  - 清理旧备份文件"
            echo "  stats    - 显示备份统计信息"
            echo ""
            echo "示例:"
            echo "  $0 full                    # 完整备份"
            echo "  $0 table users,orders      # 备份指定表"
            echo "  $0 all                     # 执行所有备份"
            exit 1
            ;;
    esac
    
    # 清理旧备份
    cleanup_old_backups
    
    # 显示统计信息
    show_backup_stats
    
    log "INFO" "备份操作完成"
}

# 如果直接运行此脚本
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
