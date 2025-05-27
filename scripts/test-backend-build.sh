#!/bin/bash

# 测试后端构建过程

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}测试后端构建过程...${NC}"

# 切换到项目根目录
cd "$(dirname "$0")/.."

echo -e "${BLUE}1. 检查server目录结构...${NC}"
if [ ! -d "server/src" ]; then
    echo -e "${RED}❌ server/src 目录不存在${NC}"
    exit 1
fi

if [ ! -f "server/package.json" ]; then
    echo -e "${RED}❌ server/package.json 不存在${NC}"
    exit 1
fi

if [ ! -f "server/tsconfig.json" ]; then
    echo -e "${RED}❌ server/tsconfig.json 不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 目录结构正确${NC}"

echo -e "${BLUE}2. 检查依赖...${NC}"
cd server

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装依赖...${NC}"
    npm install
fi

# 检查TypeScript是否可用
if ! npx tsc --version > /dev/null 2>&1; then
    echo -e "${RED}❌ TypeScript编译器不可用${NC}"
    echo -e "${YELLOW}尝试安装TypeScript...${NC}"
    npm install typescript
fi

echo -e "${GREEN}✅ TypeScript版本: $(npx tsc --version)${NC}"

echo -e "${BLUE}3. 测试本地构建...${NC}"
if npm run build; then
    echo -e "${GREEN}✅ 本地构建成功${NC}"
    
    if [ -d "dist" ]; then
        echo -e "${GREEN}✅ dist目录已创建${NC}"
        echo -e "${BLUE}构建产物:${NC}"
        ls -la dist/
    else
        echo -e "${RED}❌ dist目录未创建${NC}"
    fi
else
    echo -e "${RED}❌ 本地构建失败${NC}"
    exit 1
fi

echo -e "${BLUE}4. 清理构建产物...${NC}"
rm -rf dist

echo -e "${BLUE}5. 测试Docker构建...${NC}"
cd ..

# 构建Docker镜像
if docker build -f server/Dockerfile -t zhiweijz-backend-test .; then
    echo -e "${GREEN}✅ Docker构建成功${NC}"
    
    # 清理测试镜像
    docker rmi zhiweijz-backend-test || true
else
    echo -e "${RED}❌ Docker构建失败${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 所有测试通过！${NC}"
echo -e "${BLUE}现在可以安全地运行:${NC}"
echo -e "  make dev-backend"
echo -e "  make deploy"
