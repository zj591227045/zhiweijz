#!/bin/bash

# 本地构建测试脚本
# 模拟Docker构建过程，用于在本地验证构建步骤

set -e

echo "🧪 开始本地构建测试..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试函数
test_step() {
    local step_name="$1"
    local command="$2"
    
    echo -e "${BLUE}📋 测试步骤: $step_name${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ $step_name - 成功${NC}"
        return 0
    else
        echo -e "${RED}❌ $step_name - 失败${NC}"
        return 1
    fi
}

# 创建临时测试目录
TEST_DIR="/tmp/zhiweijz-local-build-test"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo -e "${YELLOW}📂 测试目录: $TEST_DIR${NC}"

# 切换到项目根目录
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
echo -e "${YELLOW}📂 项目根目录: $PROJECT_ROOT${NC}"

echo ""
echo "🔍 ===== 后端构建模拟测试 ====="

# 模拟后端构建
test_step "复制后端文件" "
    mkdir -p '$TEST_DIR/backend' &&
    cp -r server/ '$TEST_DIR/backend/'
"

test_step "后端依赖安装测试" "
    cd '$TEST_DIR/backend/server' &&
    npm install --dry-run > /dev/null 2>&1
"

test_step "后端TypeScript编译测试" "
    cd '$TEST_DIR/backend/server' &&
    npx tsc --noEmit
"

test_step "后端Prisma生成测试" "
    cd '$TEST_DIR/backend/server' &&
    npx prisma generate --schema=./prisma/schema.prisma
"

echo ""
echo "🔍 ===== 前端构建模拟测试 ====="

# 模拟前端构建
test_step "复制前端和内部包文件" "
    mkdir -p '$TEST_DIR/frontend/apps/web' &&
    mkdir -p '$TEST_DIR/frontend/packages' &&
    cp -r apps/web/ '$TEST_DIR/frontend/apps/' &&
    cp -r packages/core '$TEST_DIR/frontend/packages/' &&
    cp -r packages/web '$TEST_DIR/frontend/packages/' &&
    cp package.json '$TEST_DIR/frontend/'
"

test_step "内部包core构建测试" "
    cd '$TEST_DIR/frontend/packages/core' &&
    npm install --dry-run > /dev/null 2>&1 &&
    npx tsc --noEmit
"

test_step "内部包web构建测试" "
    cd '$TEST_DIR/frontend/packages/web' &&
    npm install --dry-run > /dev/null 2>&1 &&
    npx tsc --noEmit
"

test_step "前端依赖检查" "
    cd '$TEST_DIR/frontend/apps/web' &&
    npm install --dry-run > /dev/null 2>&1
"

test_step "前端TypeScript编译测试" "
    cd '$TEST_DIR/frontend/apps/web' &&
    npx tsc --noEmit
"

test_step "Next.js配置验证" "
    cd '$TEST_DIR/frontend/apps/web' &&
    node -e 'require(\"./next.config.docker.js\")'
"

echo ""
echo "🔍 ===== 依赖关系验证 ====="

test_step "检查lucide-react依赖" "
    grep -q 'lucide-react' '$PROJECT_ROOT/apps/web/package.json'
"

test_step "检查separator组件" "
    [ -f '$PROJECT_ROOT/apps/web/src/components/ui/separator.tsx' ]
"

test_step "检查内部包导出" "
    [ -f '$PROJECT_ROOT/packages/core/src/index.ts' ] &&
    [ -f '$PROJECT_ROOT/packages/web/src/index.ts' ]
"

echo ""
echo "🔍 ===== 构建命令生成 ====="

echo -e "${BLUE}📋 推荐的构建命令:${NC}"
echo ""
echo -e "${YELLOW}后端构建:${NC}"
echo "docker buildx build --platform linux/amd64 --file server/Dockerfile --tag zj591227045/zhiweijz-backend:0.1.6 --load ."
echo ""
echo -e "${YELLOW}前端构建:${NC}"
echo "docker buildx build --platform linux/amd64 --file apps/web/Dockerfile --tag zj591227045/zhiweijz-frontend:0.1.4 --load ."

# 清理测试目录
echo ""
echo -e "${BLUE}🧹 清理测试目录...${NC}"
rm -rf "$TEST_DIR"

echo ""
echo -e "${GREEN}🎉 本地构建测试完成!${NC}"
echo ""
echo -e "${YELLOW}💡 建议:${NC}"
echo "1. 如果所有测试都通过，Docker构建应该能成功"
echo "2. 如果有测试失败，请先修复相关问题"
echo "3. 运行此脚本: chmod +x scripts/local-build-test.sh && ./scripts/local-build-test.sh"
echo "" 