#!/bin/bash

# 启用版本管理系统脚本
# 用于在Docker容器环境中启用版本检查功能

set -e

echo "🚀 启用版本管理系统..."

# 检查是否在docker目录中
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ 错误: 请在docker目录中运行此脚本"
    exit 1
fi

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "❌ 错误: .env文件不存在，请先复制.env.example为.env"
    echo "   cp .env.example .env"
    exit 1
fi

echo "📝 更新.env文件中的版本管理配置..."

# 备份原始.env文件
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# 更新或添加版本管理配置
update_env_var() {
    local key=$1
    local value=$2
    local file=".env"
    
    if grep -q "^${key}=" "$file"; then
        # 如果变量存在，更新它
        sed -i.bak "s/^${key}=.*/${key}=${value}/" "$file"
        echo "  ✅ 更新 ${key}=${value}"
    else
        # 如果变量不存在，添加它
        echo "${key}=${value}" >> "$file"
        echo "  ✅ 添加 ${key}=${value}"
    fi
}

# 设置版本管理相关环境变量
update_env_var "ENABLE_VERSION_MANAGEMENT" "true"
update_env_var "VERSION_CHECK_API_ENABLED" "true"
update_env_var "VERSION_CHECK_INTERVAL" "86400"
update_env_var "FORCE_UPDATE_GRACE_PERIOD" "604800"
update_env_var "UPDATE_NOTIFICATION_ENABLED" "true"

echo "🔄 重启容器以应用配置..."

# 重启后端容器
docker-compose restart backend

echo "⏳ 等待后端服务启动..."
sleep 10

# 检查后端服务状态
if docker-compose ps backend | grep -q "Up"; then
    echo "✅ 后端服务已启动"
else
    echo "❌ 后端服务启动失败，请检查日志:"
    echo "   docker-compose logs backend"
    exit 1
fi

echo "🔧 在数据库中启用版本检查功能..."

# 在容器中运行启用脚本
docker-compose exec backend node scripts/enable-version-check.js

echo "🧪 测试版本检查API..."

# 等待服务完全启动
sleep 5

# 测试API
response=$(curl -s -X POST http://localhost:3000/api/version/check \
    -H "Content-Type: application/json" \
    -d '{"platform": "web", "currentVersion": "1.0.0"}' \
    -w "%{http_code}")

http_code="${response: -3}"
response_body="${response%???}"

if [ "$http_code" = "200" ]; then
    echo "✅ 版本检查API测试成功!"
    echo "   响应: $response_body"
elif [ "$http_code" = "400" ] && echo "$response_body" | grep -q "版本检查功能未启用"; then
    echo "❌ 版本检查功能仍未启用，可能需要手动配置数据库"
    echo "   请运行: docker-compose exec backend node scripts/enable-version-check.js"
else
    echo "⚠️  API响应异常 (HTTP $http_code): $response_body"
fi

echo ""
echo "🎉 版本管理系统配置完成!"
echo ""
echo "📋 后续步骤:"
echo "1. 访问管理后台创建版本: http://localhost/admin/version"
echo "2. 测试版本检查API: curl -X POST http://localhost/api/version/check -H 'Content-Type: application/json' -d '{\"platform\": \"web\", \"currentVersion\": \"1.0.0\"}'"
echo "3. 查看容器日志: docker-compose logs backend"
echo ""
echo "📚 更多信息请参考: docs/version/VERSION_MANAGEMENT.md"
