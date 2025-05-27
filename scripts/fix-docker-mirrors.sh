#!/bin/bash

# Docker镜像源快速修复脚本
# 测试可用的镜像源并自动配置

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Docker镜像源快速修复工具${NC}"
echo "=================================="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 可用的镜像源列表
MIRRORS=(
    "docker.1ms.run"
    "docker.xuanyuan.me"
    "dockers.xuanyuan.me"
    "docker.m.daocloud.io"
    "dockerproxy.com"
    "mirror.baidubce.com"
)

# 测试镜像源连通性
test_mirror() {
    local mirror=$1
    echo -e "${BLUE}测试镜像源: ${mirror}${NC}"
    
    # 测试连通性
    if curl -s --connect-timeout 5 "https://${mirror}/v2/" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ ${mirror} 可用${NC}"
        return 0
    else
        echo -e "${RED}❌ ${mirror} 不可用${NC}"
        return 1
    fi
}

# 查找可用的镜像源
find_working_mirror() {
    echo -e "${BLUE}正在测试镜像源...${NC}"
    
    for mirror in "${MIRRORS[@]}"; do
        if test_mirror "$mirror"; then
            echo -e "${GREEN}找到可用镜像源: ${mirror}${NC}"
            echo "$mirror"
            return 0
        fi
    done
    
    echo -e "${RED}未找到可用的镜像源${NC}"
    return 1
}

# 更新docker-compose.yml
update_compose_file() {
    local mirror=$1
    echo -e "${BLUE}更新docker-compose.yml使用镜像源: ${mirror}${NC}"
    
    # 备份原文件
    cp docker-compose.yml docker-compose.yml.backup.$(date +%Y%m%d_%H%M%S)
    
    # 更新PostgreSQL镜像
    sed -i.tmp "s|image: .*postgres:15-alpine|image: ${mirror}/postgres:15-alpine|g" docker-compose.yml
    rm -f docker-compose.yml.tmp
    
    echo -e "${GREEN}✅ docker-compose.yml已更新${NC}"
}

# 主要逻辑
main() {
    echo -e "${BLUE}1. 查找可用的镜像源...${NC}"
    
    if WORKING_MIRROR=$(find_working_mirror); then
        echo ""
        echo -e "${BLUE}2. 更新配置文件...${NC}"
        update_compose_file "$WORKING_MIRROR"
        
        echo ""
        echo -e "${BLUE}3. 测试Docker拉取...${NC}"
        echo -e "${YELLOW}尝试拉取PostgreSQL镜像...${NC}"
        
        if docker pull "${WORKING_MIRROR}/postgres:15-alpine"; then
            echo -e "${GREEN}✅ 镜像拉取成功！${NC}"
            
            echo ""
            echo -e "${BLUE}4. 启动服务...${NC}"
            docker-compose up -d postgres backend
            
            echo ""
            echo -e "${GREEN}🎉 修复完成！${NC}"
            echo -e "${BLUE}现在可以使用以下命令：${NC}"
            echo -e "  make dev-backend"
            echo -e "  make deploy"
            
        else
            echo -e "${RED}❌ 镜像拉取失败${NC}"
            echo -e "${YELLOW}请尝试手动配置Docker镜像源${NC}"
        fi
        
    else
        echo ""
        echo -e "${RED}❌ 所有镜像源都不可用${NC}"
        echo -e "${YELLOW}建议：${NC}"
        echo -e "1. 检查网络连接"
        echo -e "2. 尝试使用VPN"
        echo -e "3. 手动配置Docker镜像源"
        echo -e "4. 使用官方镜像源（可能较慢）"
        
        echo ""
        echo -e "${BLUE}恢复官方镜像源？(y/N)${NC}"
        read -r response
        if [[ "$response" =~ ^[Yy]$ ]]; then
            sed -i.tmp "s|image: .*/postgres:15-alpine|image: postgres:15-alpine|g" docker-compose.yml
            rm -f docker-compose.yml.tmp
            echo -e "${GREEN}已恢复官方镜像源${NC}"
        fi
    fi
}

# 运行主函数
main
