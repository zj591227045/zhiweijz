#!/bin/bash

# 预算修复脚本一键执行工具
# 使用方法: ./run-budget-fix.sh [--execute]

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 确保脚本在 docker 目录中执行
cd "$(dirname "$0")"

echo -e "${BLUE}🚀 预算修复脚本启动...${NC}"
echo ""

# 检查参数
EXECUTE_MODE=false
if [[ "$1" == "--execute" ]]; then
    EXECUTE_MODE=true
    echo -e "${YELLOW}⚠️  实际执行模式：将修改数据库数据${NC}"
else
    echo -e "${GREEN}🔍 试运行模式：只检查不修改数据${NC}"
    echo -e "   如需实际执行，请使用: $0 --execute"
fi
echo ""

# 检查容器是否运行
echo "检查容器状态..."
if ! docker ps | grep -q zhiweijz-backend; then
    echo -e "${RED}❌ 后端容器未运行，请先启动服务${NC}"
    echo "   执行: docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✅ 容器运行正常${NC}"

# 检查数据库连接
echo "检查数据库连接..."
if ! docker exec zhiweijz-backend sh -c "psql \$DATABASE_URL -c 'SELECT 1;'" >/dev/null 2>&1; then
    echo -e "${RED}❌ 数据库连接失败${NC}"
    echo "尝试更详细的检查..."
    docker exec zhiweijz-backend sh -c "psql \$DATABASE_URL -c 'SELECT 1;'" || true
    exit 1
fi
echo -e "${GREEN}✅ 数据库连接正常${NC}"

# 检查脚本文件是否存在
SCRIPT_EXISTS=false
if [[ -f "../server/src/scripts/fix-budget-assignment.ts" ]]; then
    SCRIPT_EXISTS=true
    echo -e "${GREEN}✅ 找到脚本文件${NC}"
else
    echo -e "${RED}❌ 脚本文件不存在: ../server/src/scripts/fix-budget-assignment.ts${NC}"
    exit 1
fi

# 检查 CSV 文件是否存在
CSV_EXISTS=false
CSV_FILE="../docs/详细导入报告_2025-06-16.csv"
if [[ -f "$CSV_FILE" ]]; then
    CSV_EXISTS=true
    echo -e "${GREEN}✅ 找到 CSV 文件${NC}"
else
    echo -e "${RED}❌ CSV 文件不存在: $CSV_FILE${NC}"
    exit 1
fi

echo ""

# 如果是实际执行模式，进行额外确认
if [[ "$EXECUTE_MODE" == "true" ]]; then
    echo -e "${YELLOW}🚨 重要警告：您即将执行实际的数据库修改操作！${NC}"
    echo "   建议在执行前备份数据库"
    echo ""
    read -p "是否继续？(y/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "操作已取消"
        exit 0
    fi
    echo ""
fi

# 复制脚本到容器
echo "📁 部署脚本到容器..."
docker exec zhiweijz-backend mkdir -p /app/src/scripts >/dev/null 2>&1 || true
docker cp ../server/src/scripts/fix-budget-assignment-cjs.js zhiweijz-backend:/app/src/scripts/
echo -e "${GREEN}✅ 脚本部署完成${NC}"

# 复制 CSV 文件到容器
echo "📄 复制 CSV 文件到容器..."
docker cp "$CSV_FILE" zhiweijz-backend:/tmp/
echo -e "${GREEN}✅ CSV 文件复制完成${NC}"

echo ""

# 执行脚本
if [[ "$EXECUTE_MODE" == "true" ]]; then
    echo -e "${BLUE}🔧 开始执行预算修复（实际修改）...${NC}"
    docker exec zhiweijz-backend node /app/src/scripts/fix-budget-assignment-cjs.js /tmp/详细导入报告_2025-06-16.csv
else
    echo -e "${BLUE}🔍 开始试运行...${NC}"
    docker exec zhiweijz-backend node /app/src/scripts/fix-budget-assignment-cjs.js /tmp/详细导入报告_2025-06-16.csv --dry-run
fi

SCRIPT_EXIT_CODE=$?

echo ""

# 清理临时文件
echo "🧹 清理临时文件..."
docker exec zhiweijz-backend rm -f /tmp/详细导入报告_2025-06-16.csv
echo -e "${GREEN}✅ 清理完成${NC}"

echo ""

# 总结
if [[ $SCRIPT_EXIT_CODE -eq 0 ]]; then
    if [[ "$EXECUTE_MODE" == "true" ]]; then
        echo -e "${GREEN}🎉 预算修复执行完成！${NC}"
        echo ""
        echo "建议检查："
        echo "1. 查看上方的执行统计信息"
        echo "2. 登录系统验证预算分配是否正确"
        echo "3. 检查交易记录的预算字段"
    else
        echo -e "${GREEN}🎉 试运行完成！${NC}"
        echo ""
        echo "如果结果正确，执行实际操作："
        echo -e "${YELLOW}  $0 --execute${NC}"
    fi
else
    echo -e "${RED}❌ 脚本执行失败，请检查上方的错误信息${NC}"
    exit $SCRIPT_EXIT_CODE
fi

echo ""
echo "有用的检查命令："
echo "  查看容器日志: docker logs zhiweijz-backend"
echo "  连接数据库: docker exec -it zhiweijz-postgres psql -U zhiweijz -d zhiweijz"
echo "" 