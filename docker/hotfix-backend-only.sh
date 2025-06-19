#!/bin/bash

# 后端公告系统快速热修复脚本
echo "🔧 开始修复后端公告系统..."

# 检查容器是否存在
if ! docker ps -a | grep -q "zhiweijz-backend"; then
    echo "❌ 找不到 zhiweijz-backend 容器！"
    exit 1
fi

# 1. 复制修复后的文件到容器
echo "📝 复制修复文件到容器..."
docker cp ../server/src/admin/services/announcement.admin.service.ts zhiweijz-backend:/app/src/admin/services/announcement.admin.service.ts

# 2. 重启后端容器
echo "🔄 重启后端容器..."
docker restart zhiweijz-backend

# 3. 等待容器启动
echo "⏳ 等待容器启动 (30秒)..."
sleep 30

# 4. 检查容器状态
if docker ps | grep -q "zhiweijz-backend.*Up"; then
    echo "✅ 后端容器重启成功！"
    
    # 测试健康检查
    echo "🔍 测试API连接..."
    sleep 10
    
    if curl -s -f http://localhost:3000/api/health > /dev/null 2>&1; then
        echo "✅ API 连接正常！热修复成功！"
    else
        echo "⚠️  API 可能还在启动中，请稍等片刻后测试公告功能"
    fi
else
    echo "❌ 后端容器重启失败！请检查容器日志："
    echo "   docker logs zhiweijz-backend"
fi

echo ""
echo "🎉 后端热修复完成！"
echo "📋 修复内容: 添加了 creator 和 updater 的关联查询"
echo "⚠️  注意: 此为临时修复，建议后续重新构建镜像" 