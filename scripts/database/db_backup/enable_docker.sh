#!/bin/bash

# 启用Docker模式的配置脚本

set -e

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/config.env"

echo "=== 启用Docker模式 ==="

# 检查配置文件是否存在
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ 配置文件不存在: $CONFIG_FILE"
    exit 1
fi

echo "✅ 找到配置文件: $CONFIG_FILE"

# 备份原配置文件
BACKUP_CONFIG="$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
cp "$CONFIG_FILE" "$BACKUP_CONFIG"
echo "✅ 配置文件已备份: $BACKUP_CONFIG"

# 更新配置
echo ""
echo "更新配置..."

# 启用Docker模式
sed -i 's/^USE_DOCKER=false/USE_DOCKER=true/' "$CONFIG_FILE"
echo "✅ 已设置 USE_DOCKER=true"

# 检查并设置网络模式
if grep -q "^DOCKER_NETWORK_MODE=host" "$CONFIG_FILE"; then
    echo "✅ 网络模式已设置为 host（适用于本地数据库）"
elif grep -q "^DOCKER_NETWORK_MODE=bridge" "$CONFIG_FILE"; then
    echo "✅ 网络模式已设置为 bridge（适用于远程数据库）"
else
    echo "⚠️ 未找到网络模式配置，使用默认值 bridge"
fi

# 检查容器镜像
if grep -q "^PG_CONTAINER_IMAGE=" "$CONFIG_FILE"; then
    PG_IMAGE=$(grep "^PG_CONTAINER_IMAGE=" "$CONFIG_FILE" | cut -d'=' -f2)
    echo "✅ PostgreSQL容器镜像: $PG_IMAGE"
else
    echo "⚠️ 未找到容器镜像配置，使用默认值 postgres:15"
fi

echo ""
echo "配置更新完成！"
echo ""
echo "当前Docker相关配置："
echo "===================="
grep -E "^(USE_DOCKER|PG_CONTAINER_IMAGE|DOCKER_NETWORK_MODE)=" "$CONFIG_FILE"
echo ""

# 测试Docker是否可用
echo "检查Docker环境..."
if command -v docker >/dev/null 2>&1; then
    echo "✅ Docker 命令可用"
    
    if docker info >/dev/null 2>&1; then
        echo "✅ Docker 服务运行正常"
        
        # 检查PostgreSQL镜像
        PG_IMAGE=$(grep "^PG_CONTAINER_IMAGE=" "$CONFIG_FILE" | cut -d'=' -f2)
        echo ""
        echo "检查PostgreSQL镜像: $PG_IMAGE"
        if docker image inspect "$PG_IMAGE" >/dev/null 2>&1; then
            echo "✅ PostgreSQL镜像已存在"
        else
            echo "⚠️ PostgreSQL镜像不存在，将在首次使用时自动下载"
            echo "   可以手动下载: docker pull $PG_IMAGE"
        fi
    else
        echo "❌ Docker 服务未运行"
        echo "   请启动Docker服务后重试"
    fi
else
    echo "❌ Docker 未安装"
    echo "   请安装Docker后重试"
fi

echo ""
echo "🎉 Docker模式已启用！"
echo ""
echo "现在可以运行以下命令测试："
echo "  ./scripts/database/db_backup/test_docker.sh"
echo ""
echo "或直接进行数据库恢复："
echo "  ./scripts/database/db_backup/restore.sh full /path/to/backup.sql.gz" 