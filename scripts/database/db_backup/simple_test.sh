#!/bin/bash

# 简单的数据库连接测试

set -e

# 获取脚本目录并加载配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config_loader.sh"

echo "=== 简单数据库测试 ==="

# 初始化配置
init_config
if [ $? -ne 0 ]; then
    echo "❌ 配置加载失败"
    exit 1
fi

echo "✅ 配置加载成功"

# 设置环境变量
export PGPASSWORD="$DB_PASSWORD"
export PGHOST="$DB_HOST"
export PGPORT="$DB_PORT"
export PGUSER="$DB_USER"
export PGDATABASE="$DB_NAME"

echo "数据库配置："
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  用户: $DB_USER"
echo "  数据库: $DB_NAME"
echo ""

# 测试连接
echo "测试数据库连接..."
if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败"
    exit 1
fi

# 测试简单查询
echo ""
echo "测试简单SQL查询..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password -c "SELECT 'Hello World' as test;"; then
    echo "✅ SQL查询成功"
else
    echo "❌ SQL查询失败"
    exit 1
fi

# 测试版本查询
echo ""
echo "测试版本查询..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" --no-password -c "SELECT version();"; then
    echo "✅ 版本查询成功"
else
    echo "❌ 版本查询失败"
    exit 1
fi

echo ""
echo "🎉 所有基本测试通过！" 