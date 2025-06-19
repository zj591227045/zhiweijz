#!/bin/bash

# 公告系统热修复脚本
# 此脚本用于在不重建 Docker 镜像的情况下修复公告系统的 creator.username 错误

echo "🔧 开始热修复公告系统..."

# 1. 复制修复后的后端文件到容器
echo "📝 正在复制修复后的后端文件..."

# 创建临时目录存放修复文件
mkdir -p ./temp-fix

# 复制修复后的文件
cp ../server/src/admin/services/announcement.admin.service.ts ./temp-fix/

# 将修复文件复制到容器中
docker cp ./temp-fix/announcement.admin.service.ts zhiweijz-backend:/app/src/admin/services/announcement.admin.service.ts

# 2. 重启后端服务以应用修复
echo "🔄 重启后端服务..."
docker restart zhiweijz-backend

# 3. 等待服务启动
echo "⏳ 等待后端服务重新启动..."
sleep 10

# 4. 检查后端服务状态
echo "🔍 检查服务状态..."
if docker ps | grep -q "zhiweijz-backend.*Up"; then
    echo "✅ 后端服务重启成功！"
else
    echo "❌ 后端服务重启失败！"
    exit 1
fi

# 5. 测试 API
echo "🧪 测试 API 接口..."
sleep 5

if curl -s -f http://localhost:3000/api/health > /dev/null; then
    echo "✅ 后端 API 响应正常！"
else
    echo "⚠️  API 可能还在启动中，请稍后再次测试"
fi

# 6. 复制修复后的前端文件到容器
echo "📱 正在修复前端文件..."

# 创建前端修复目录
mkdir -p ./temp-fix/frontend

# 复制修复后的前端文件
cp ../apps/web/src/components/admin/AnnouncementList.tsx ./temp-fix/frontend/

# 将修复文件复制到容器中
docker cp ./temp-fix/frontend/AnnouncementList.tsx zhiweijz-frontend:/app/src/components/admin/AnnouncementList.tsx

# 7. 重启前端服务
echo "🔄 重启前端服务..."
docker restart zhiweijz-frontend

# 8. 等待前端服务启动
echo "⏳ 等待前端服务重新启动..."
sleep 15

# 9. 检查前端服务状态
if docker ps | grep -q "zhiweijz-frontend.*Up"; then
    echo "✅ 前端服务重启成功！"
else
    echo "❌ 前端服务重启失败！"
fi

# 10. 清理临时文件
echo "🧹 清理临时文件..."
rm -rf ./temp-fix

echo ""
echo "🎉 热修复完成！"
echo ""
echo "📋 修复内容："
echo "   - 修复了后端 announcement.admin.service.ts 中缺失的 creator 关联查询"
echo "   - 添加了前端 AnnouncementList.tsx 中的安全访问操作符"
echo ""
echo "🌐 请访问以下地址测试："
echo "   - 前端: http://localhost"
echo "   - 后端API: http://localhost:3000"
echo ""
echo "⚠️  注意: 此为临时修复，建议稍后重新构建和部署正式版本" 