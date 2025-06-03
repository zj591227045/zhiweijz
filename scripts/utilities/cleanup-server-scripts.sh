#!/bin/bash

# Server脚本清理脚本
# 根据分析结果清理server目录下的脚本文件

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧹 Server脚本清理工具${NC}"
echo "=================================="

# 切换到项目根目录
cd "$(dirname "$0")/../.."

# 确认操作
echo -e "${YELLOW}此操作将：${NC}"
echo "1. 删除21个过时的调试脚本"
echo "2. 归档23个有用的脚本到server/scripts目录"
echo "3. 保留1个配置文件在原位置"
echo ""
echo -e "${RED}⚠️  警告：此操作不可逆！${NC}"
echo -e "${YELLOW}是否继续？(y/N)${NC}"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "操作已取消"
    exit 0
fi

# 创建备份
echo -e "${BLUE}📦 创建备份...${NC}"
BACKUP_DIR="backups/server-scripts-$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# 备份要删除的文件
echo "备份即将删除的文件..."
mkdir -p "$BACKUP_DIR/to-delete"

# 要删除的文件列表
TO_DELETE=(
    "server/analyze-budget-details.js"
    "server/check-budget-rollover-amount.js"
    "server/check-duplicate-budgets.js"
    "server/create-test-rollover-data.js"
    "server/debug-rollover-difference.js"
    "server/fix-budget-rollover-logic.js"
    "server/fix-custodial-budget-issues.js"
    "server/fix-final-rollover.js"
    "server/fix-june-rollover.js"
    "server/fix-rollover-amounts.js"
    "server/src/test/budget-api-test.js"
    "server/src/test/check-budget-records.js"
    "server/src/test/create-budget-records.js"
    "server/test/check-invitations.js"
    "server/test/test-api.js"
    "server/test-budget-display.js"
    "server/test-budget-names.js"
    "server/test-custodial-api.js"
    "server/test-custodial-budget-rollover.js"
    "server/trigger-auto-create-budgets.js"
    "server/verify-current-rollover.js"
)

for file in "${TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/to-delete/"
    fi
done

# 备份要移动的文件
echo "备份即将移动的文件..."
mkdir -p "$BACKUP_DIR/to-archive"

TO_ARCHIVE=(
    "server/check-custodial-members.js"
    "server/cleanup-custodial-users.js"
    "server/cleanup-duplicate-duoduo.js"
    "server/create-budget-history-table.js"
    "server/create-test-custodial-user.js"
    "server/fix-duplicate-family-accounts.js"
    "server/list-budgets.js"
    "server/simple-create-custodial.js"
    "server/test/test-invitation-format.js"
    "server/test/test-invitation.js"
    "server/test-active-budgets.js"
    "server/test-new-rollover-logic.js"
    "server/test-prisma.js"
    "server/test-rollover-history.js"
)

for file in "${TO_ARCHIVE[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "$BACKUP_DIR/to-archive/"
    fi
done

echo -e "${GREEN}✅ 备份完成: $BACKUP_DIR${NC}"

# 开始清理
echo -e "${BLUE}🗑️  删除过时脚本...${NC}"

for file in "${TO_DELETE[@]}"; do
    if [ -f "$file" ]; then
        rm -f "$file"
        echo "  ❌ 删除: $file"
    fi
done

# 归档有用脚本
echo -e "${BLUE}📦 归档有用脚本...${NC}"

# 确保目标目录存在
mkdir -p server/scripts/database
mkdir -p server/scripts/testing
mkdir -p server/scripts/utilities

# 移动数据库相关脚本
DATABASE_SCRIPTS=(
    "server/check-custodial-members.js"
    "server/cleanup-custodial-users.js"
    "server/cleanup-duplicate-duoduo.js"
    "server/create-budget-history-table.js"
    "server/fix-duplicate-family-accounts.js"
    "server/list-budgets.js"
    "server/simple-create-custodial.js"
)

for file in "${DATABASE_SCRIPTS[@]}"; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        mv "$file" "server/scripts/database/$filename"
        echo "  📁 移动到database: $filename"
    fi
done

# 移动测试相关脚本
TESTING_SCRIPTS=(
    "server/create-test-custodial-user.js"
    "server/test/test-invitation-format.js"
    "server/test/test-invitation.js"
    "server/test-active-budgets.js"
    "server/test-new-rollover-logic.js"
    "server/test-prisma.js"
    "server/test-rollover-history.js"
)

for file in "${TESTING_SCRIPTS[@]}"; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        mv "$file" "server/scripts/testing/$filename"
        echo "  🧪 移动到testing: $filename"
    fi
done

echo -e "${GREEN}✅ 清理完成！${NC}"
