#!/bin/bash

# Docker部署脚本
# 用于部署整个应用栈

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始部署只为记账应用...${NC}"

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查Docker和Docker Compose
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未安装Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: 未安装Docker Compose${NC}"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    if [ -f ".env.docker" ]; then
        echo -e "${YELLOW}复制.env.docker为.env${NC}"
        cp .env.docker .env
        echo -e "${YELLOW}请编辑.env文件并设置正确的配置，特别是JWT_SECRET${NC}"
        read -p "按Enter键继续..."
    else
        echo -e "${RED}错误: 未找到环境变量配置文件${NC}"
        exit 1
    fi
fi

# 停止现有服务
echo -e "${BLUE}停止现有服务...${NC}"
docker-compose down

# 构建镜像
echo -e "${BLUE}构建Docker镜像...${NC}"
docker-compose build --no-cache

# 启动服务
echo -e "${BLUE}启动服务...${NC}"
docker-compose up -d

# 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 10

# 运行数据库迁移
echo -e "${BLUE}运行数据库迁移...${NC}"
docker-compose exec backend npx prisma migrate deploy || echo -e "${YELLOW}迁移可能已经运行过了${NC}"

# 检查服务状态
echo -e "${BLUE}检查服务状态...${NC}"
docker-compose ps

# 显示访问信息
echo -e "${GREEN}部署完成！${NC}"
echo -e "${BLUE}应用访问地址:${NC}"
echo -e "  前端: ${YELLOW}http://localhost${NC}"
echo -e "  API: ${YELLOW}http://localhost/api${NC}"
echo -e "  数据库: ${YELLOW}localhost:5432${NC}"

echo -e "${BLUE}管理命令:${NC}"
echo -e "  查看日志: ${YELLOW}docker-compose logs -f${NC}"
echo -e "  停止服务: ${YELLOW}docker-compose down${NC}"
echo -e "  重启服务: ${YELLOW}docker-compose restart${NC}"
