#!/bin/bash

# 数据库备份工具设置脚本
# 用途：帮助用户初始化配置文件

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_ENV_FILE="$SCRIPT_DIR/config.env"
CONFIG_TEMPLATE_FILE="$SCRIPT_DIR/config.conf.template"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}数据库备份工具配置设置${NC}"
echo -e "${BLUE}========================${NC}"
echo

# 检查模板文件是否存在
if [ ! -f "$CONFIG_TEMPLATE_FILE" ]; then
    echo -e "${RED}错误: 配置模板文件不存在: $CONFIG_TEMPLATE_FILE${NC}"
    exit 1
fi

# 检查配置文件是否已存在
if [ -f "$CONFIG_ENV_FILE" ]; then
    echo -e "${YELLOW}配置文件已存在: $CONFIG_ENV_FILE${NC}"
    read -p "是否要重新创建配置文件? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${GREEN}保持现有配置文件不变${NC}"
        exit 0
    fi
fi

# 复制模板文件
echo -e "${BLUE}正在创建配置文件...${NC}"
cp "$CONFIG_TEMPLATE_FILE" "$CONFIG_ENV_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 配置文件创建成功: $CONFIG_ENV_FILE${NC}"
else
    echo -e "${RED}✗ 配置文件创建失败${NC}"
    exit 1
fi

echo
echo -e "${YELLOW}接下来请按照以下步骤完成配置:${NC}"
echo
echo "1. 编辑配置文件:"
echo "   nano $CONFIG_ENV_FILE"
echo
echo "2. 主要需要修改的配置项:"
echo "   - DB_HOST: 数据库服务器地址"
echo "   - DB_PORT: 数据库端口 (默认5432)"
echo "   - DB_NAME: 数据库名称"
echo "   - DB_USER: 数据库用户名"
echo "   - DB_PASSWORD: 数据库密码"
echo
echo "3. 可选配置项:"
echo "   - USE_DOCKER: 是否使用Docker执行备份 (true/false)"
echo "   - BACKUP_DIR: 备份文件存储目录"
echo "   - BACKUP_RETENTION_DAYS: 备份保留天数"
echo
echo "4. 测试配置:"
echo "   ./test_connection.sh"
echo
echo "5. 执行备份:"
echo "   ./backup.sh"
echo

read -p "是否现在打开配置文件进行编辑? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # 尝试使用不同的编辑器
    if command -v nano >/dev/null 2>&1; then
        nano "$CONFIG_ENV_FILE"
    elif command -v vim >/dev/null 2>&1; then
        vim "$CONFIG_ENV_FILE"
    elif command -v vi >/dev/null 2>&1; then
        vi "$CONFIG_ENV_FILE"
    else
        echo -e "${YELLOW}未找到文本编辑器，请手动编辑配置文件:${NC}"
        echo "$CONFIG_ENV_FILE"
    fi
fi

echo
echo -e "${GREEN}设置完成！${NC}"
echo -e "${BLUE}配置文件位置: $CONFIG_ENV_FILE${NC}"
echo -e "${BLUE}注意: 此配置文件已被添加到 .gitignore，不会被提交到版本控制${NC}" 