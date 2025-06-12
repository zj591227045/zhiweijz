#!/bin/bash

# Docker模式数据库测试脚本

set -e

# 获取脚本目录并加载依赖
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/config_loader.sh"
source "$SCRIPT_DIR/db_utils.sh"

echo "=== Docker模式数据库测试 ==="

# 初始化配置
init_config
config_result=$?
if [ $config_result -ne 0 ]; then
    echo "❌ 配置初始化失败"
    exit 1
fi

echo "✅ 配置加载成功"

# 检查Docker配置
echo ""
echo "Docker配置："
echo "  USE_DOCKER: $USE_DOCKER"
echo "  PG_CONTAINER_IMAGE: $PG_CONTAINER_IMAGE"
echo "  DOCKER_NETWORK_MODE: $DOCKER_NETWORK_MODE"
echo ""

if [ "$USE_DOCKER" != "true" ]; then
    echo "⚠️ 警告: USE_DOCKER 设置为 false，但此测试需要 Docker 模式"
    echo "请在配置文件中设置 USE_DOCKER=true"
    exit 1
fi

# 检查Docker是否可用
echo "检查Docker是否可用..."
if ! command -v docker >/dev/null 2>&1; then
    echo "❌ Docker 未安装或不可用"
    exit 1
fi

if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker 服务未运行"
    exit 1
fi

echo "✅ Docker 可用"

# 测试Docker命令构建
echo ""
echo "测试Docker命令构建..."
test_docker_cmd=$(build_docker_cmd "psql" "-c" "SELECT 1;")
echo "构建的Docker命令: $test_docker_cmd"

# 测试数据库连接
echo ""
echo "测试数据库连接..."
if test_connection; then
    echo "✅ 数据库连接测试通过"
else
    echo "❌ 数据库连接测试失败"
    exit 1
fi

# 测试简单SQL查询
echo ""
echo "测试简单SQL查询..."
if execute_pg_cmd psql -c "SELECT 'Docker Test' as test;" 2>/dev/null; then
    echo "✅ SQL查询测试通过"
else
    echo "❌ SQL查询测试失败"
    exit 1
fi

# 测试复杂SQL查询
echo ""
echo "测试复杂SQL查询..."
if execute_pg_cmd psql -c "SELECT version();" 2>/dev/null; then
    echo "✅ 复杂SQL查询测试通过"
else
    echo "❌ 复杂SQL查询测试失败"
    exit 1
fi

# 测试表列表获取
echo ""
echo "测试获取表列表..."
table_count=$(get_table_list | wc -l)
echo "✅ 发现 $table_count 个表"

# 测试schema操作（非破坏性）
echo ""
echo "测试schema操作..."
if execute_pg_cmd psql -c "SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'public';" 2>/dev/null; then
    echo "✅ Schema查询测试通过"
else
    echo "❌ Schema查询测试失败"
    exit 1
fi

echo ""
echo "🎉 所有Docker模式测试通过！"
echo ""
echo "现在可以使用以下命令进行恢复："
echo "1. 确保配置文件中 USE_DOCKER=true"
echo "2. 运行恢复命令："
echo "   ./scripts/database/db_backup/restore.sh full /path/to/backup.sql.gz" 