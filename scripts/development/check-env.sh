#!/bin/bash

# 环境检测工具
# 检查当前开发环境配置和服务状态

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}只为记账 - 环境检测工具${NC}"
echo "=================================="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查Docker环境
echo -e "${BLUE}1. Docker环境检查${NC}"
if command -v docker &> /dev/null; then
    echo -e "  ✅ Docker已安装: $(docker --version | cut -d' ' -f3)"
    if docker info > /dev/null 2>&1; then
        echo -e "  ✅ Docker服务运行中"
        
        # 检查Docker容器状态
        if docker-compose ps | grep -q "zhiweijz"; then
            echo -e "  📦 Docker容器状态:"
            docker-compose ps | grep "zhiweijz" | while read line; do
                echo -e "    ${line}"
            done
        else
            echo -e "  ⚪ 没有运行的Docker容器"
        fi
    else
        echo -e "  ❌ Docker服务未运行"
    fi
else
    echo -e "  ❌ Docker未安装"
fi

echo ""

# 检查Node.js环境
echo -e "${BLUE}2. Node.js环境检查${NC}"
if command -v node &> /dev/null; then
    echo -e "  ✅ Node.js已安装: $(node --version)"
    echo -e "  ✅ npm版本: $(npm --version)"
else
    echo -e "  ❌ Node.js未安装"
fi

echo ""

# 检查后端服务
echo -e "${BLUE}3. 后端服务检查${NC}"

# 检查本地后端
if curl -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
    echo -e "  ✅ 本地后端服务 (http://localhost:3000) 运行正常"
elif curl -f "http://localhost:3000/" > /dev/null 2>&1; then
    echo -e "  ⚠️ 本地后端服务 (http://localhost:3000) 运行中，但无健康检查端点"
else
    echo -e "  ❌ 本地后端服务 (http://localhost:3000) 不可访问"
fi

# 检查Docker后端
if docker-compose ps | grep -q "zhiweijz-backend.*Up"; then
    echo -e "  ✅ Docker后端容器运行中"
    if curl -f "http://localhost:3000/api/health" > /dev/null 2>&1; then
        echo -e "  ✅ Docker后端服务健康检查通过"
    else
        echo -e "  ⚠️ Docker后端服务健康检查失败"
    fi
else
    echo -e "  ⚪ Docker后端容器未运行"
fi

echo ""

# 检查前端服务
echo -e "${BLUE}4. 前端服务检查${NC}"

# 检查本地前端
if curl -f "http://localhost:3003/" > /dev/null 2>&1; then
    echo -e "  ✅ 本地前端服务 (http://localhost:3003) 运行正常"
else
    echo -e "  ❌ 本地前端服务 (http://localhost:3003) 不可访问"
fi

# 检查Docker前端
if docker-compose ps | grep -q "zhiweijz-frontend.*Up"; then
    echo -e "  ✅ Docker前端容器运行中"
    if curl -f "http://localhost/" > /dev/null 2>&1; then
        echo -e "  ✅ Docker前端服务 (http://localhost) 可访问"
    else
        echo -e "  ⚠️ Docker前端服务 (http://localhost) 不可访问"
    fi
else
    echo -e "  ⚪ Docker前端容器未运行"
fi

echo ""

# 检查环境配置
echo -e "${BLUE}5. 环境配置检查${NC}"

# 检查前端环境配置
if [ -f "apps/web/.env.local" ]; then
    echo -e "  ✅ 前端本地配置文件存在"
    if grep -q "DEV_BACKEND_URL" apps/web/.env.local; then
        BACKEND_URL=$(grep "DEV_BACKEND_URL" apps/web/.env.local | cut -d'=' -f2)
        echo -e "  📝 配置的后端地址: ${BACKEND_URL}"
    fi
else
    echo -e "  ⚠️ 前端本地配置文件不存在 (apps/web/.env.local)"
fi

# 检查Docker环境配置
if [ -f ".env" ]; then
    echo -e "  ✅ Docker环境配置文件存在"
else
    echo -e "  ⚠️ Docker环境配置文件不存在 (.env)"
fi

echo ""

# 给出建议
echo -e "${BLUE}6. 启动建议${NC}"
echo -e "${GREEN}本地开发模式:${NC}"
echo -e "  1. 启动后端: ${YELLOW}cd server && npm run dev${NC}"
echo -e "  2. 启动前端: ${YELLOW}./scripts/start-dev-frontend.sh${NC}"
echo ""
echo -e "${GREEN}Docker模式:${NC}"
echo -e "  1. 快速启动: ${YELLOW}./scripts/docker-quick-start.sh${NC}"
echo -e "  2. 或使用: ${YELLOW}make deploy${NC}"
echo ""
echo -e "${GREEN}混合模式:${NC}"
echo -e "  1. Docker后端: ${YELLOW}docker-compose up backend postgres${NC}"
echo -e "  2. 本地前端: ${YELLOW}./scripts/start-dev-frontend.sh${NC}"

echo ""
echo "=================================="
