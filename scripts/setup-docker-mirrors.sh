#!/bin/bash

# Docker镜像源配置脚本
# 解决Docker镜像拉取失败问题

set -e

# 设置颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}配置Docker镜像源...${NC}"

# 检查操作系统
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    echo -e "${BLUE}检测到macOS系统${NC}"
    
    # Docker Desktop配置文件路径
    DOCKER_CONFIG_DIR="$HOME/.docker"
    DAEMON_JSON="$DOCKER_CONFIG_DIR/daemon.json"
    
    # 创建配置目录
    mkdir -p "$DOCKER_CONFIG_DIR"
    
    # 备份现有配置
    if [ -f "$DAEMON_JSON" ]; then
        echo -e "${YELLOW}备份现有Docker配置...${NC}"
        cp "$DAEMON_JSON" "$DAEMON_JSON.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # 创建新的daemon.json配置
    cat > "$DAEMON_JSON" << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://dockers.xuanyuan.me",
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://mirror.baidubce.com"
  ],
  "experimental": false,
  "debug": false,
  "log-level": "info"
}
EOF
    
    echo -e "${GREEN}✅ Docker镜像源配置完成${NC}"
    echo -e "${YELLOW}请重启Docker Desktop以使配置生效${NC}"
    echo -e "${BLUE}配置文件位置: ${DAEMON_JSON}${NC}"
    
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    echo -e "${BLUE}检测到Linux系统${NC}"
    
    # 检查是否有sudo权限
    if ! sudo -n true 2>/dev/null; then
        echo -e "${YELLOW}需要sudo权限来配置Docker${NC}"
    fi
    
    # Docker配置目录
    DOCKER_CONFIG_DIR="/etc/docker"
    DAEMON_JSON="$DOCKER_CONFIG_DIR/daemon.json"
    
    # 创建配置目录
    sudo mkdir -p "$DOCKER_CONFIG_DIR"
    
    # 备份现有配置
    if [ -f "$DAEMON_JSON" ]; then
        echo -e "${YELLOW}备份现有Docker配置...${NC}"
        sudo cp "$DAEMON_JSON" "$DAEMON_JSON.backup.$(date +%Y%m%d_%H%M%S)"
    fi
    
    # 创建新的daemon.json配置
    sudo tee "$DAEMON_JSON" > /dev/null << 'EOF'
{
  "registry-mirrors": [
    "https://docker.1ms.run",
    "https://docker.xuanyuan.me",
    "https://dockers.xuanyuan.me",
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://mirror.baidubce.com"
  ],
  "experimental": false,
  "debug": false,
  "log-level": "info"
}
EOF
    
    echo -e "${GREEN}✅ Docker镜像源配置完成${NC}"
    echo -e "${YELLOW}重启Docker服务...${NC}"
    sudo systemctl daemon-reload
    sudo systemctl restart docker
    
else
    echo -e "${RED}不支持的操作系统: $OSTYPE${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}配置的镜像源:${NC}"
echo -e "  • https://docker.1ms.run"
echo -e "  • https://docker.xuanyuan.me"
echo -e "  • https://dockers.xuanyuan.me"
echo -e "  • https://docker.m.daocloud.io"
echo -e "  • https://dockerproxy.com"
echo -e "  • https://mirror.baidubce.com"

echo ""
echo -e "${GREEN}配置完成！${NC}"
echo -e "${YELLOW}请重启Docker后再次尝试构建${NC}"
