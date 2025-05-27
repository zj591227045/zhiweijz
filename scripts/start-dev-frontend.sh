#!/bin/bash

# 前端开发环境启动脚本
# 自动检测后端服务并配置代理

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}启动前端开发服务...${NC}"

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 切换到前端目录
cd apps/web

# 检查是否存在.env.local文件
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}创建本地环境配置文件...${NC}"
    if [ -f ".env.local.example" ]; then
        cp .env.local.example .env.local
        echo -e "${YELLOW}已复制 .env.local.example 为 .env.local${NC}"
    else
        echo -e "${BLUE}创建默认 .env.local 文件...${NC}"
        cat > .env.local << EOF
# 本地开发环境配置
DEV_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=/api
NEXT_TELEMETRY_DISABLED=1
EOF
    fi
fi

# 检测后端服务
echo -e "${BLUE}检测后端服务...${NC}"

# 从.env.local读取后端地址
BACKEND_URL=$(grep "DEV_BACKEND_URL" .env.local 2>/dev/null | cut -d'=' -f2 || echo "http://localhost:3000")

# 检查后端是否可访问
if curl -f "${BACKEND_URL}/api/health" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 后端服务运行正常: ${BACKEND_URL}${NC}"
elif curl -f "${BACKEND_URL}/" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️ 后端服务运行中，但健康检查端点不可用: ${BACKEND_URL}${NC}"
    echo -e "${YELLOW}   这可能是正常的，如果后端没有 /api/health 端点${NC}"
else
    echo -e "${RED}❌ 无法连接到后端服务: ${BACKEND_URL}${NC}"
    echo -e "${YELLOW}请确保后端服务正在运行，或修改 .env.local 中的 DEV_BACKEND_URL${NC}"
    echo ""
    echo -e "${BLUE}启动后端服务的方法：${NC}"
    echo -e "  1. 本地启动: ${YELLOW}cd ../../server && npm run dev${NC}"
    echo -e "  2. Docker启动: ${YELLOW}cd ../.. && docker-compose up backend${NC}"
    echo ""
    read -p "是否继续启动前端服务? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖...${NC}"
    npm install
fi

# 显示配置信息
echo ""
echo -e "${BLUE}前端开发服务配置:${NC}"
echo -e "  前端地址: ${YELLOW}http://localhost:3003${NC}"
echo -e "  后端代理: ${YELLOW}${BACKEND_URL}${NC}"
echo -e "  API路径: ${YELLOW}/api -> ${BACKEND_URL}/api${NC}"
echo ""

# 启动前端服务
echo -e "${GREEN}启动前端开发服务...${NC}"
echo -e "${YELLOW}按 Ctrl+C 停止服务${NC}"
echo ""

# 设置环境变量并启动
export DEV_BACKEND_URL="${BACKEND_URL}"
npm run dev -- -p 3003
