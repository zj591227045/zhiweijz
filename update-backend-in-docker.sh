#!/bin/bash

# 更新Docker容器中的后端代码
# 
# 使用方法：
# chmod +x update-backend-in-docker.sh
# ./update-backend-in-docker.sh

set -e

echo "🚀 开始更新Docker容器中的后端代码..."

# 检查后端容器是否运行
if ! docker ps | grep -q zhiweijz-backend; then
    echo "❌ 后端容器 zhiweijz-backend 未运行，请先启动容器"
    exit 1
fi

echo "✅ 后端容器正在运行"

# 检查构建目录是否存在
if [ ! -d "server/dist" ]; then
    echo "❌ 构建目录 server/dist 不存在，请先运行构建命令"
    echo "可以使用以下命令构建："
    echo "cd server && npm run build"
    exit 1
fi

echo "✅ 构建目录存在"

# 停止容器中的应用进程（可选）
echo "⏸️  准备更新代码..."

# 备份容器中的现有代码（可选）
echo "💾 备份现有代码..."
docker exec zhiweijz-backend mkdir -p /app/backups
docker exec zhiweijz-backend cp -r /app/dist /app/backups/dist-$(date +%Y%m%d-%H%M%S) || true

# 复制新的构建代码到容器
echo "📋 复制新的构建代码到容器..."
docker cp server/dist/. zhiweijz-backend:/app/dist/

echo "✅ 代码更新完成"

# 重启容器以应用更改
echo "🔄 重启容器以应用更改..."
docker restart zhiweijz-backend

echo "⏳ 等待容器启动..."
sleep 10

# 检查容器状态
if docker ps | grep -q zhiweijz-backend; then
    echo "✅ 容器已成功重启"
    echo "🎉 后端代码更新完成！"
    
    # 检查容器健康状态
    echo "🔍 检查应用健康状态..."
    sleep 5
    
    # 尝试健康检查
    if docker exec zhiweijz-backend curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ 应用健康检查通过"
    else
        echo "⚠️  应用可能还在启动中，请稍后检查"
    fi
else
    echo "❌ 容器重启失败，请检查日志"
    echo "可以使用以下命令查看日志："
    echo "docker logs zhiweijz-backend"
fi 