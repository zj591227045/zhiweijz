#!/bin/bash

# 预算结转历史记录创建工具

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== 预算结转历史记录创建工具 ==="
echo "当前时间: $(date)"

# 检查容器状态
echo "🔍 检查容器状态..."
if ! docker ps | grep -q zhiweijz-backend; then
    echo "❌ 后端容器未运行，请先启动容器"
    exit 1
fi
echo "✅ 容器状态正常"
echo ""

# 选择执行模式
echo "选择执行模式:"
echo "1. 创建缺失的结转历史记录"
echo "2. 查看现有历史记录"
echo "3. 创建所有缺失的历史记录"
echo "4. 退出"
read -p "请输入选项 (1-4): " choice

case $choice in
    1)
        MODE="create-missing"
        echo "🔧 创建缺失的结转历史记录..."
        ;;
    2)
        MODE="list"
        echo "📋 查看现有历史记录..."
        ;;
    3)
        MODE="create-all"
        echo "🔧 创建所有缺失的历史记录..."
        ;;
    4)
        echo "👋 退出"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "🔧 开始执行..."

# 将脚本复制到容器并执行
docker cp "$SCRIPT_DIR/create-rollover-history.js" zhiweijz-backend:/app/
docker exec -w /app zhiweijz-backend node create-rollover-history.js "$MODE"

# 清理临时文件
docker exec zhiweijz-backend rm -f /app/create-rollover-history.js

echo ""
echo "✅ 执行完成"
