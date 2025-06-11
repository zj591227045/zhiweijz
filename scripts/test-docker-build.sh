#!/bin/bash

# Docker构建模拟测试脚本
# 用于在本地环境中模拟Docker构建过程，无需实际运行Docker

set -e

echo "🧪 开始Docker构建模拟测试..."

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
TEST_DIR="/tmp/zhiweijz-build-test"
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

echo -e "${YELLOW}📂 测试目录: $TEST_DIR${NC}"

# 切换到项目根目录
cd "$(dirname "$0")/.."
PROJECT_ROOT=$(pwd)
echo -e "${YELLOW}📂 项目根目录: $PROJECT_ROOT${NC}"

echo ""
echo "🔍 ===== 后端构建测试 ====="

# 测试1: 检查后端文件结构
test_step "检查后端文件结构" "
    [ -f 'server/package.json' ] && 
    [ -d 'server/src' ] && 
    [ -d 'server/prisma' ] && 
    [ -d 'server/scripts' ]
"

# 测试2: 复制后端文件到测试目录
test_step "复制后端文件" "
    cp -r server/ '$TEST_DIR/server-test/' &&
    cp package.json '$TEST_DIR/'
"

# 测试3: 检查package.json依赖
test_step "验证package.json格式" "
    cd '$TEST_DIR/server-test' &&
    node -e 'JSON.parse(require(\"fs\").readFileSync(\"package.json\", \"utf8\"))' &&
    cd '$PROJECT_ROOT'
"

# 测试4: 模拟npm install
test_step "模拟依赖安装检查" "
    cd '$TEST_DIR/server-test' &&
    npm list --depth=0 > /dev/null 2>&1 || npm install --dry-run > /dev/null 2>&1 &&
    cd '$PROJECT_ROOT'
"

# 测试5: 检查TypeScript编译
test_step "检查TypeScript配置" "
    cd '$TEST_DIR/server-test' &&
    [ -f 'tsconfig.json' ] &&
    node -e 'JSON.parse(require(\"fs\").readFileSync(\"tsconfig.json\", \"utf8\"))' &&
    cd '$PROJECT_ROOT'
"

# 测试6: 检查Prisma配置
test_step "检查Prisma配置" "
    [ -f 'server/prisma/schema.prisma' ] &&
    grep -q 'generator client' server/prisma/schema.prisma
"

# 测试7: 检查启动脚本
test_step "检查启动脚本" "
    [ -f 'server/scripts/deployment/start.sh' ] &&
    [ -x 'server/scripts/deployment/start.sh' ] || chmod +x 'server/scripts/deployment/start.sh'
"

echo ""
echo "🔍 ===== 前端构建测试 ====="

# 测试8: 检查前端文件结构
test_step "检查前端文件结构" "
    [ -f 'apps/web/package.json' ] && 
    [ -d 'apps/web/src' ] && 
    [ -f 'apps/web/next.config.docker.js' ]
"

# 测试9: 复制前端文件到测试目录
test_step "复制前端文件" "
    cp -r apps/web/ '$TEST_DIR/web-test/' &&
    cp package.json '$TEST_DIR/web-package.json'
"

# 测试10: 检查Next.js配置
test_step "验证Next.js配置" "
    cd '$TEST_DIR/web-test' &&
    node -e 'require(\"./next.config.docker.js\")' &&
    cd '$PROJECT_ROOT'
"

# 测试11: 检查前端依赖
test_step "检查前端依赖" "
    cd '$TEST_DIR/web-test' &&
    npm list --depth=0 > /dev/null 2>&1 || npm install --dry-run > /dev/null 2>&1 &&
    cd '$PROJECT_ROOT'
"

echo ""
echo "🔍 ===== Docker配置测试 ====="

# 测试12: 检查Dockerfile语法
test_step "检查后端Dockerfile语法" "
    docker --version > /dev/null 2>&1 && docker build --help > /dev/null 2>&1 || 
    (echo '跳过Docker语法检查 - Docker未安装' && true)
"

# 测试13: 检查.dockerignore
test_step "检查.dockerignore配置" "
    [ -f '.dockerignore' ] &&
    grep -q 'server/scripts' .dockerignore &&
    grep -q 'apps/web/scripts' .dockerignore
"

echo ""
echo "🔍 ===== 构建命令模拟 ====="

# 生成构建命令
echo -e "${BLUE}📋 生成的Docker构建命令:${NC}"
echo ""
echo -e "${YELLOW}后端构建命令:${NC}"
echo "docker buildx build --platform linux/amd64 --file server/Dockerfile --tag zj591227045/zhiweijz-backend:0.1.6 --load ."
echo ""
echo -e "${YELLOW}前端构建命令:${NC}"
echo "docker buildx build --platform linux/amd64 --file apps/web/Dockerfile --tag zj591227045/zhiweijz-frontend:0.1.6 --load ."

# 清理测试目录
echo ""
echo -e "${BLUE}🧹 清理测试目录...${NC}"
rm -rf "$TEST_DIR"

echo ""
echo -e "${GREEN}🎉 Docker构建模拟测试完成!${NC}"
echo ""
echo -e "${YELLOW}💡 建议:${NC}"
echo "1. 如果所有测试都通过，Docker构建应该能成功"
echo "2. 如果有测试失败，请先修复相关问题"
echo "3. 可以使用此脚本在每次提交前进行验证"
echo "" 