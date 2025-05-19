#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}启动前端服务...${NC}"
echo -e "${YELLOW}实时日志将被显示${NC}"

# 设置环境变量以启用详细日志
export NODE_ENV=development
export NEXT_TELEMETRY_DISABLED=1
export DEBUG=next:*,react:*,app:*

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查client目录是否存在
if [ ! -d "./client" ]; then
  echo -e "${YELLOW}警告: client目录不存在${NC}"
  exit 1
fi

# 切换到client目录
cd client

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}正在安装依赖...${NC}"
  npm install
fi

# 使用Next.js启动前端开发服务器，并显示详细日志
echo -e "${BLUE}启动前端开发服务器...${NC}"
echo -e "${YELLOW}按 Ctrl+C 停止服务器${NC}"

# 使用Next.js启动前端开发服务器，使用turbopack加速构建
npx next dev --turbopack -p 3001
