#!/bin/bash

# Docker快速启动脚本
# 一键构建和启动整个应用

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}只为记账 - Docker快速启动${NC}"
echo "=================================="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查Docker环境
echo -e "${BLUE}检查Docker环境...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}错误: 未安装Docker${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}错误: 未安装Docker Compose${NC}"
    exit 1
fi

if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker未运行${NC}"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}创建环境变量文件...${NC}"
    if [ -f ".env.docker" ]; then
        cp .env.docker .env
        echo -e "${YELLOW}已复制.env.docker为.env${NC}"
        echo -e "${YELLOW}请根据需要修改.env文件中的配置${NC}"
    else
        echo -e "${RED}错误: 未找到.env.docker模板文件${NC}"
        exit 1
    fi
fi

# 询问是否重新构建镜像
echo -e "${BLUE}是否重新构建Docker镜像? (y/N)${NC}"
read -r rebuild
if [[ $rebuild =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}停止现有容器...${NC}"
    docker-compose down --remove-orphans

    echo -e "${BLUE}清理旧镜像...${NC}"
    docker-compose build --no-cache

    echo -e "${BLUE}启动服务...${NC}"
    docker-compose up -d
else
    echo -e "${BLUE}使用现有镜像启动服务...${NC}"
    docker-compose up -d
fi

# 等待服务启动
echo -e "${YELLOW}等待服务启动...${NC}"
sleep 15

# 检查服务状态
echo -e "${BLUE}检查服务状态...${NC}"
docker-compose ps

# 检查健康状态
echo -e "${BLUE}检查服务健康状态...${NC}"
for i in {1..30}; do
    if curl -f http://localhost/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 服务健康检查通过${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${YELLOW}⚠️ 健康检查超时，但服务可能仍在启动中${NC}"
    fi
    sleep 2
done

# 运行数据库迁移
echo -e "${BLUE}运行数据库迁移...${NC}"
docker-compose exec -T backend npx prisma migrate deploy || echo -e "${YELLOW}迁移可能已经运行过了${NC}"

# 显示访问信息
echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo "=================================="
echo -e "${BLUE}访问地址:${NC}"
echo -e "  🌐 前端应用: ${YELLOW}http://localhost${NC}"
echo -e "  🔧 API接口: ${YELLOW}http://localhost/api${NC}"
echo -e "  🗄️ 数据库: ${YELLOW}localhost:5432${NC}"
echo ""
echo -e "${BLUE}管理命令:${NC}"
echo -e "  📋 查看日志: ${YELLOW}docker-compose logs -f${NC}"
echo -e "  🔄 重启服务: ${YELLOW}docker-compose restart${NC}"
echo -e "  🛑 停止服务: ${YELLOW}docker-compose down${NC}"
echo -e "  🧹 清理数据: ${YELLOW}docker-compose down -v${NC}"
echo ""
echo -e "${GREEN}享受使用只为记账！${NC}"
