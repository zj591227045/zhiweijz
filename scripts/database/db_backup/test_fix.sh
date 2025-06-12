#!/bin/bash

# 测试修复后的数据库工具脚本

set -e

# 获取脚本目录并加载依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config_loader.sh"
source "$SCRIPT_DIR/db_utils.sh"

echo "开始测试数据库工具修复..."

# 初始化配置
init_config
config_result=$?
if [ $config_result -eq 1 ]; then
    echo "❌ 配置初始化失败"
    exit 1
elif [ $config_result -eq 2 ]; then
    echo "❌ 请先编辑配置文件后重新运行"
    exit 2
fi

echo "✅ 配置加载成功"

# 测试数据库连接
echo "测试数据库连接..."
if test_connection; then
    echo "✅ 数据库连接测试通过"
else
    echo "❌ 数据库连接测试失败"
    exit 1
fi

# 测试简单SQL查询
echo "测试简单SQL查询..."
if execute_pg_cmd psql -c "SELECT version();" > /dev/null 2>&1; then
    echo "✅ SQL查询测试通过"
else
    echo "❌ SQL查询测试失败"
    exit 1
fi

# 测试获取表列表
echo "测试获取表列表..."
table_count=$(get_table_list | wc -l)
echo "✅ 发现 $table_count 个表"

echo ""
echo "🎉 所有测试通过！数据库工具修复成功"
echo ""
echo "现在可以重新尝试数据库恢复操作："
echo "./scripts/database/db_backup/restore.sh full /root/zhiweijz/scripts/database/db_backup/./backups/zhiweijz_full_20250612_013910.sql.gz" 