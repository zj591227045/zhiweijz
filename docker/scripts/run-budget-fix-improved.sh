#!/bin/bash

# 预算结转修复工具 (改进版)
# 使用与后端服务一致的计算逻辑

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== 预算结转专用修复工具 (改进版) ==="
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
echo "1. 诊断模式 (分析预算结转问题，对比两种计算方法)"
echo "2. 修复budgetId (修复交易记录的budgetId字段)"
echo "3. 修复结转金额 (使用正确的budgetId计算结转)"
echo "4. 完整修复 (先修复budgetId，再修复结转金额)"
echo "5. 退出"
read -p "请输入选项 (1-5): " choice

case $choice in
    1)
        MODE="diagnose"
        echo "🔍 诊断模式: 分析预算结转问题"
        ;;
    2)
        MODE="fix-budget-ids"
        echo "🔧 修复budgetId模式"
        ;;
    3)
        MODE="fix-rollover"
        echo "🔧 修复结转金额模式"
        ;;
    4)
        MODE="fix-all"
        echo "🔧 完整修复模式"
        ;;
    5)
        echo "👋 退出"
        exit 0
        ;;
    *)
        echo "❌ 无效选项"
        exit 1
        ;;
esac

echo ""
echo "🔧 开始运行预算结转修复..."

# 将脚本复制到容器并执行
docker cp "$SCRIPT_DIR/budget-rollover-fix-improved.js" zhiweijz-backend:/app/budget-rollover-fix-improved.js
docker exec -w /app zhiweijz-backend node budget-rollover-fix-improved.js "$MODE"

# 清理临时文件
docker exec zhiweijz-backend rm -f /app/budget-rollover-fix-improved.js

echo ""
echo "✅ 预算结转修复完成"
