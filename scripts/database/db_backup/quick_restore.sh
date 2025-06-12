#!/bin/bash

# 快速数据库恢复脚本
# 简化版本，专门用于测试和快速恢复

set -e

# 获取脚本目录并加载配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config_loader.sh"
source "$SCRIPT_DIR/db_utils.sh"

# 检查参数
if [ $# -lt 1 ]; then
    echo "用法: $0 <备份文件路径> [清理数据库:true/false]"
    echo "示例: $0 /path/to/backup.sql.gz true"
    exit 1
fi

BACKUP_FILE="$1"
CLEAN_DB="${2:-true}"

echo "=== 快速数据库恢复 ==="

# 初始化配置
init_config
if [ $? -ne 0 ]; then
    echo "❌ 配置加载失败"
    exit 1
fi

echo "✅ 配置加载成功"
echo "  USE_DOCKER: $USE_DOCKER"
echo "  备份文件: $BACKUP_FILE"
echo "  清理数据库: $CLEAN_DB"

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

echo "✅ 备份文件存在"

# 测试数据库连接
echo ""
echo "测试数据库连接..."
if ! test_connection; then
    echo "❌ 数据库连接失败"
    exit 1
fi

# 清理数据库（如果需要）
if [ "$CLEAN_DB" = "true" ]; then
    echo ""
    echo "⚠️ 清理数据库..."
    if ! clean_database; then
        echo "❌ 清理数据库失败"
        exit 1
    fi
    echo "✅ 数据库清理完成"
fi

# 准备恢复文件
echo ""
echo "准备恢复文件..."

RESTORE_FILE=""
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "解压备份文件..."
    RESTORE_FILE="/tmp/$(basename "$BACKUP_FILE" .gz)"
    if gunzip -c "$BACKUP_FILE" > "$RESTORE_FILE"; then
        echo "✅ 文件解压成功: $RESTORE_FILE"
    else
        echo "❌ 文件解压失败"
        exit 1
    fi
else
    RESTORE_FILE="$BACKUP_FILE"
    echo "✅ 使用原始文件: $RESTORE_FILE"
fi

# 执行恢复
echo ""
echo "开始恢复数据库..."

if [ "$USE_DOCKER" = "true" ]; then
    echo "使用Docker模式恢复..."
    
    # 确保备份目录存在
    BACKUP_DIR_PATH="$SCRIPT_DIR/$BACKUP_DIR"
    mkdir -p "$BACKUP_DIR_PATH"
    
    # 复制文件到备份目录
    FILENAME=$(basename "$RESTORE_FILE")
    TARGET_FILE="$BACKUP_DIR_PATH/$FILENAME"
    
    echo "复制文件到备份目录: $RESTORE_FILE -> $TARGET_FILE"
    if cp "$RESTORE_FILE" "$TARGET_FILE"; then
        echo "✅ 文件复制成功"
    else
        echo "❌ 文件复制失败"
        exit 1
    fi
    
    # 使用Docker执行恢复
    echo "执行Docker恢复命令..."
    if execute_pg_cmd psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password -f "/backup/$FILENAME"; then
        echo "✅ 数据库恢复成功"
    else
        echo "❌ 数据库恢复失败"
        exit 1
    fi
else
    echo "使用本地模式恢复..."
    
    # 设置环境变量
    export PGPASSWORD="$DB_PASSWORD"
    export PGHOST="$DB_HOST"
    export PGPORT="$DB_PORT"
    export PGUSER="$DB_USER"
    export PGDATABASE="$DB_NAME"
    
    # 使用本地psql执行恢复
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password -f "$RESTORE_FILE"; then
        echo "✅ 数据库恢复成功"
    else
        echo "❌ 数据库恢复失败"
        exit 1
    fi
fi

# 清理临时文件
if [[ "$RESTORE_FILE" == /tmp/* ]] && [ -f "$RESTORE_FILE" ]; then
    rm -f "$RESTORE_FILE"
    echo "✅ 临时文件已清理"
fi

echo ""
echo "🎉 数据库恢复完成！" 