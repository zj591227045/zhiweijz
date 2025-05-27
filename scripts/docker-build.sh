#!/bin/bash

# Docker构建脚本
# 用于构建所有Docker镜像

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始构建Docker镜像...${NC}"

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查Docker是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker未运行，请先启动Docker${NC}"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    if [ -f ".env.docker" ]; then
        echo -e "${YELLOW}复制.env.docker为.env${NC}"
        cp .env.docker .env
    else
        echo -e "${RED}错误: 未找到.env文件，请先创建环境变量配置${NC}"
        exit 1
    fi
fi

# 构建镜像
echo -e "${BLUE}构建后端镜像...${NC}"
docker build -f server/Dockerfile -t zhiweijz-backend:latest .

echo -e "${BLUE}构建前端镜像...${NC}"
docker build -f apps/web/Dockerfile -t zhiweijz-frontend:latest .

echo -e "${BLUE}构建Nginx镜像...${NC}"
docker build -f nginx/Dockerfile -t zhiweijz-nginx:latest .

echo -e "${GREEN}所有镜像构建完成！${NC}"

# 显示镜像信息
echo -e "${BLUE}构建的镜像:${NC}"
docker images | grep zhiweijz

echo -e "${GREEN}构建完成！使用以下命令启动服务:${NC}"
echo -e "${YELLOW}docker-compose up -d${NC}"
