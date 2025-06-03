#!/bin/bash

# 数据库工具函数
# 用途：提供数据库连接、查询等通用功能

# 获取脚本目录并加载配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config_loader.sh"

# 设置PostgreSQL密码环境变量
setup_pg_env() {
    export PGPASSWORD="$DB_PASSWORD"
    export PGHOST="$DB_HOST"
    export PGPORT="$DB_PORT"
    export PGUSER="$DB_USER"
    export PGDATABASE="$DB_NAME"
}

# 构建Docker运行命令
build_docker_cmd() {
    local cmd="$1"
    shift
    local args="$@"
    
    local docker_cmd="docker run --rm"
    
    # 设置网络模式
    if [ "$DOCKER_NETWORK_MODE" = "host" ]; then
        docker_cmd="$docker_cmd --network host"
    fi
    
    # 设置环境变量
    docker_cmd="$docker_cmd -e PGPASSWORD='$DB_PASSWORD'"
    docker_cmd="$docker_cmd -e PGHOST='$DB_HOST'"
    docker_cmd="$docker_cmd -e PGPORT='$DB_PORT'"
    docker_cmd="$docker_cmd -e PGUSER='$DB_USER'"
    docker_cmd="$docker_cmd -e PGDATABASE='$DB_NAME'"
    
    # 挂载备份目录
    if [ -n "$BACKUP_DIR" ]; then
        docker_cmd="$docker_cmd -v '$SCRIPT_DIR/$BACKUP_DIR:/backup'"
    fi
    
    # 添加容器镜像和命令
    docker_cmd="$docker_cmd $PG_CONTAINER_IMAGE $cmd $args"
    
    echo "$docker_cmd"
}

# 执行PostgreSQL命令
execute_pg_cmd() {
    local cmd="$1"
    shift
    local args="$@"
    
    if [ "$USE_DOCKER" = "true" ]; then
        # 使用Docker执行命令
        local docker_cmd=$(build_docker_cmd "$cmd" "$args")
        log "DEBUG" "执行Docker命令: $docker_cmd"
        eval "$docker_cmd"
    else
        # 使用本地工具执行命令
        setup_pg_env
        log "DEBUG" "执行本地命令: $cmd $args"
        "$cmd" "$@"
    fi
}

# 测试数据库连接
test_connection() {
    log "INFO" "测试数据库连接..."
    
    if execute_pg_cmd pg_isready >/dev/null 2>&1; then
        log "INFO" "数据库连接正常"
        return 0
    else
        log "ERROR" "数据库连接失败"
        return 1
    fi
}

# 获取数据库信息
get_db_info() {
    log "INFO" "获取数据库信息..."
    
    local query="
    SELECT 
        current_database() as database_name,
        current_user as current_user,
        version() as version,
        pg_size_pretty(pg_database_size(current_database())) as database_size,
        (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') as table_count
    "
    
    if execute_pg_cmd psql -t -c "$query" 2>/dev/null; then
        return 0
    else
        log "ERROR" "获取数据库信息失败"
        return 1
    fi
}

# 获取表列表
get_table_list() {
    local schema="${1:-public}"
    
    log "DEBUG" "获取表列表 (schema: $schema)"
    
    local query="
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = '$schema' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
    "
    
    execute_pg_cmd psql -t -c "$query" 2>/dev/null | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' | grep -v '^$'
}

# 获取表大小信息
get_table_sizes() {
    local schema="${1:-public}"
    
    log "DEBUG" "获取表大小信息 (schema: $schema)"
    
    local query="
    SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
    FROM pg_tables 
    WHERE schemaname = '$schema'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    "
    
    execute_pg_cmd psql -t -c "$query" 2>/dev/null
}

# 检查表是否存在
table_exists() {
    local table_name="$1"
    local schema="${2:-public}"
    
    local query="
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = '$schema' 
        AND table_name = '$table_name'
    )
    "
    
    local result=$(execute_pg_cmd psql -t -c "$query" 2>/dev/null | tr -d ' ')
    
    if [ "$result" = "t" ]; then
        return 0
    else
        return 1
    fi
}

# 获取表记录数
get_table_count() {
    local table_name="$1"
    local schema="${2:-public}"
    
    if ! table_exists "$table_name" "$schema"; then
        log "ERROR" "表不存在: $schema.$table_name"
        return 1
    fi
    
    local query="SELECT count(*) FROM $schema.$table_name"
    execute_pg_cmd psql -t -c "$query" 2>/dev/null | tr -d ' '
}

# 执行SQL查询
execute_query() {
    local query="$1"
    local output_format="${2:-table}"  # table, csv, json
    
    local psql_args=""
    case $output_format in
        "csv")
            psql_args="-A -F, --no-align"
            ;;
        "json")
            psql_args="-t --no-align"
            query="SELECT row_to_json(t) FROM ($query) t"
            ;;
        *)
            psql_args=""
            ;;
    esac
    
    execute_pg_cmd psql $psql_args -c "$query"
}

# 备份单个表
backup_table() {
    local table_name="$1"
    local backup_file="$2"
    local schema="${3:-public}"
    local backup_type="${4:-both}"  # schema, data, both
    
    if ! table_exists "$table_name" "$schema"; then
        log "ERROR" "表不存在: $schema.$table_name"
        return 1
    fi
    
    log "INFO" "备份表: $schema.$table_name -> $backup_file"
    
    local pg_dump_args="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    pg_dump_args="$pg_dump_args --no-password --verbose"
    pg_dump_args="$pg_dump_args --table=$schema.$table_name"
    
    case $backup_type in
        "schema")
            pg_dump_args="$pg_dump_args --schema-only"
            ;;
        "data")
            pg_dump_args="$pg_dump_args --data-only"
            ;;
        "both")
            # 默认包含结构和数据
            ;;
    esac
    
    if [ "$USE_DOCKER" = "true" ]; then
        # 使用Docker执行备份
        local docker_cmd=$(build_docker_cmd "pg_dump" "$pg_dump_args --file=/backup/$(basename "$backup_file")")
        eval "$docker_cmd"
    else
        # 使用本地工具执行备份
        setup_pg_env
        pg_dump $pg_dump_args --file="$backup_file"
    fi
}

# 恢复单个表
restore_table() {
    local backup_file="$1"
    local table_name="$2"
    local schema="${3:-public}"
    local restore_type="${4:-both}"  # schema, data, both
    
    if [ ! -f "$backup_file" ]; then
        log "ERROR" "备份文件不存在: $backup_file"
        return 1
    fi
    
    log "INFO" "恢复表: $backup_file -> $schema.$table_name"
    
    local psql_args="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
    psql_args="$psql_args --no-password"
    
    if [ "$USE_DOCKER" = "true" ]; then
        # 使用Docker执行恢复
        local docker_cmd=$(build_docker_cmd "psql" "$psql_args --file=/backup/$(basename "$backup_file")")
        eval "$docker_cmd"
    else
        # 使用本地工具执行恢复
        setup_pg_env
        psql $psql_args --file="$backup_file"
    fi
}

# 清理数据库（删除所有表）
clean_database() {
    local schema="${1:-public}"
    
    log "WARN" "清理数据库schema: $schema"
    
    local query="
    DROP SCHEMA IF EXISTS $schema CASCADE;
    CREATE SCHEMA $schema;
    GRANT ALL ON SCHEMA $schema TO $DB_USER;
    GRANT ALL ON SCHEMA $schema TO public;
    "
    
    execute_pg_cmd psql -c "$query"
}

# 如果直接运行此脚本，执行测试
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    if ! init_config; then
        exit 1
    fi
    
    echo "测试数据库工具..."
    
    if test_connection; then
        echo "✅ 数据库连接测试通过"
        echo ""
        echo "数据库信息:"
        get_db_info
        echo ""
        echo "表列表:"
        get_table_list
    else
        echo "❌ 数据库连接测试失败"
        exit 1
    fi
fi
