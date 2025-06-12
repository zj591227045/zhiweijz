#!/bin/bash

# 手动数据库恢复脚本
# 直接使用psql命令，避免复杂的函数调用

set -e

# 获取脚本目录并加载配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config_loader.sh"

# 检查参数
if [ $# -lt 1 ]; then
    echo "用法: $0 <备份文件路径> [是否清理数据库:true/false]"
    echo "示例: $0 /path/to/backup.sql.gz true"
    exit 1
fi

BACKUP_FILE="$1"
CLEAN_DB="${2:-true}"

echo "=== 手动数据库恢复 ==="

# 初始化配置
init_config
if [ $? -ne 0 ]; then
    echo "❌ 配置加载失败"
    exit 1
fi

echo "✅ 配置加载成功"

# 检查备份文件
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

echo "✅ 备份文件存在: $BACKUP_FILE"

# 设置环境变量
export PGPASSWORD="$DB_PASSWORD"
export PGHOST="$DB_HOST"
export PGPORT="$DB_PORT"
export PGUSER="$DB_USER"
export PGDATABASE="$DB_NAME"

echo ""
echo "数据库配置："
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo "  清理数据库: $CLEAN_DB"
echo ""

# 测试连接
echo "测试数据库连接..."
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
    echo "❌ 数据库连接失败"
    exit 1
fi
echo "✅ 数据库连接正常"

# 创建安全备份
echo ""
echo "创建安全备份..."
SAFETY_BACKUP="$SCRIPT_DIR/$BACKUP_DIR/safety_backup_$(date +"%Y%m%d_%H%M%S").sql"
mkdir -p "$SCRIPT_DIR/$BACKUP_DIR"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password --format=plain --file="$SAFETY_BACKUP"; then
    echo "✅ 安全备份已创建: $SAFETY_BACKUP"
    if [ "$COMPRESS_BACKUP" = "true" ]; then
        gzip "$SAFETY_BACKUP"
        SAFETY_BACKUP="${SAFETY_BACKUP}.gz"
        echo "✅ 安全备份已压缩: $SAFETY_BACKUP"
    fi
else
    echo "⚠️ 安全备份创建失败，继续恢复操作"
fi

# 清理数据库（如果需要）
if [ "$CLEAN_DB" = "true" ]; then
    echo ""
    echo "⚠️ 清理数据库..."
    
    echo "删除public schema..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password -c "DROP SCHEMA IF EXISTS public CASCADE;"; then
        echo "✅ public schema已删除"
    else
        echo "❌ 删除public schema失败"
        exit 1
    fi
    
    echo "创建public schema..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password -c "CREATE SCHEMA public;"; then
        echo "✅ public schema已创建"
    else
        echo "❌ 创建public schema失败"
        exit 1
    fi
    
    echo "设置schema权限..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password -c "GRANT ALL ON SCHEMA public TO $DB_USER;" || true
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password -c "GRANT ALL ON SCHEMA public TO public;" || true
    echo "✅ 数据库清理完成"
fi

# 恢复数据库
echo ""
echo "开始恢复数据库..."

if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "解压并恢复压缩备份文件..."
    if gunzip -c "$BACKUP_FILE" | psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password; then
        echo "✅ 数据库恢复成功"
    else
        echo "❌ 数据库恢复失败"
        if [ -n "$SAFETY_BACKUP" ]; then
            echo "💡 可使用安全备份恢复: $SAFETY_BACKUP"
        fi
        exit 1
    fi
else
    echo "恢复备份文件..."
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password -f "$BACKUP_FILE"; then
        echo "✅ 数据库恢复成功"
    else
        echo "❌ 数据库恢复失败"
        if [ -n "$SAFETY_BACKUP" ]; then
            echo "💡 可使用安全备份恢复: $SAFETY_BACKUP"
        fi
        exit 1
    fi
fi

echo ""
echo "🎉 数据库恢复完成！"
if [ -n "$SAFETY_BACKUP" ]; then
    echo "💾 安全备份位置: $SAFETY_BACKUP"
fi 