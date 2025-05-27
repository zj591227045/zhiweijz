#!/bin/bash

# 快速测试Docker镜像源连通性

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}测试Docker镜像源连通性...${NC}"
echo ""

# 镜像源列表
MIRRORS=(
    "docker.1ms.run"
    "docker.xuanyuan.me"
    "dockers.xuanyuan.me"
    "docker.m.daocloud.io"
    "dockerproxy.com"
    "mirror.baidubce.com"
    "registry-1.docker.io"
)

# 测试函数
test_mirror() {
    local mirror=$1
    printf "%-25s " "$mirror"
    
    if curl -s --connect-timeout 3 --max-time 5 "https://${mirror}/v2/" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ 可用${NC}"
        return 0
    else
        echo -e "${RED}❌ 不可用${NC}"
        return 1
    fi
}

# 测试所有镜像源
echo -e "${BLUE}镜像源                    状态${NC}"
echo "----------------------------------------"

WORKING_MIRRORS=()
for mirror in "${MIRRORS[@]}"; do
    if test_mirror "$mirror"; then
        WORKING_MIRRORS+=("$mirror")
    fi
done

echo ""

if [ ${#WORKING_MIRRORS[@]} -gt 0 ]; then
    echo -e "${GREEN}可用的镜像源 (${#WORKING_MIRRORS[@]}个):${NC}"
    for mirror in "${WORKING_MIRRORS[@]}"; do
        echo -e "  • $mirror"
    done
    
    echo ""
    echo -e "${BLUE}推荐使用: ${WORKING_MIRRORS[0]}${NC}"
    echo -e "${YELLOW}运行以下命令自动修复:${NC}"
    echo -e "  make fix-mirrors"
else
    echo -e "${RED}❌ 没有可用的镜像源${NC}"
    echo -e "${YELLOW}建议:${NC}"
    echo -e "  1. 检查网络连接"
    echo -e "  2. 尝试使用VPN"
    echo -e "  3. 稍后重试"
fi
