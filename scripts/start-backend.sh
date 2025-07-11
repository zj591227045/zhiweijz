#!/bin/bash

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}启动后端服务...${NC}"
echo -e "${YELLOW}实时日志将被显示${NC}"

# 设置环境变量以启用详细日志（排除prisma相关日志）
export DEBUG=express:*,app:*
export NODE_ENV=development
#export LOG_LEVEL=debug

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查server目录是否存在
if [ ! -d "./server" ]; then
  echo -e "${YELLOW}警告: server目录不存在${NC}"
  exit 1
fi

# 切换到server目录
cd server

# 检查是否安装了依赖
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}正在安装依赖...${NC}"
  npm install
fi

# 使用nodemon启动服务器，并显示详细日志
echo -e "${BLUE}启动服务器...${NC}"
echo -e "${YELLOW}按 Ctrl+C 停止服务器${NC}"

# 使用nodemon启动服务器
npx nodemon --exec "ts-node -r tsconfig-paths/register src/index.ts" --watch src --ext ts,json --verbose
