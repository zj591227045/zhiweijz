#!/bin/bash

# Docker构建测试脚本
# 用于在本地测试Dockerfile是否可以正常构建

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Docker构建测试脚本${NC}"
echo "=================================="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查Docker是否运行
if ! docker info >/dev/null 2>&1; then
    echo -e "${RED}❌ Docker未运行，请先启动Docker${NC}"
    exit 1
fi

echo -e "${BLUE}开始测试后端Docker构建...${NC}"

# 构建测试镜像（不推送）
docker build \
    --tag "zhiweijz-backend:test" \
    --file server/Dockerfile \
    --no-cache \
    .

echo -e "${GREEN}✅ 后端Docker构建测试成功！${NC}"

# 可选：运行容器进行基本功能测试
echo -e "${BLUE}是否要运行容器进行基本测试？(y/N)${NC}"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${BLUE}启动后端容器进行测试...${NC}"

    # 设置测试环境变量
    docker run -d \
        --name "zhiweijz-backend-test" \
        -e NODE_ENV=production \
        -e DOCKER_ENV=true \
        -e DATABASE_URL="postgresql://test:test@localhost:5432/testdb" \
        -e JWT_SECRET="test-secret-key" \
        -p 3001:3000 \
        "zhiweijz-backend:test"

    # 等待容器启动
    echo -e "${YELLOW}等待容器启动...${NC}"
    sleep 10

    # 检查健康状态
    if curl -f http://localhost:3001/api/health >/dev/null 2>&1; then
        echo -e "${GREEN}✅ 后端服务健康检查通过！${NC}"
    else
        echo -e "${RED}❌ 后端服务健康检查失败${NC}"
    fi

    # 停止并删除测试容器
    docker stop "zhiweijz-backend-test" >/dev/null 2>&1 || true
    docker rm "zhiweijz-backend-test" >/dev/null 2>&1 || true

    echo -e "${GREEN}✅ 容器测试完成，已清理测试容器${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Docker构建测试完成！${NC}"
echo ""
echo -e "${BLUE}下一步:${NC}"
echo "  1. 可以运行以下命令查看测试镜像:"
echo "     docker images | grep zhiweijz-backend"
echo "  2. 可以删除测试镜像:"
echo "     docker rmi zhiweijz-backend:test"
echo "  3. 如果测试成功，可以使用构建脚本进行生产构建:"
echo "     ./docker/scripts/build-and-push.sh --backend-only"