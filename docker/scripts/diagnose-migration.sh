#!/bin/bash

# 数据库迁移诊断脚本
# 帮助用户快速诊断和解决迁移问题

set -e

echo "🔍 数据库迁移诊断工具"
echo "=================================="

# 检查容器状态
if ! docker ps | grep -q "zhiweijz-backend"; then
    echo "❌ 后端容器未运行"
    echo "请先启动容器: docker-compose up -d backend"
    exit 1
fi

echo "✅ 后端容器正在运行"
echo ""

# 1. 生成诊断报告
echo "📋 生成数据库状态诊断报告..."
echo "=================================="
docker exec zhiweijz-backend node migrations/migration-status.js
echo ""

# 2. 检查数据完整性
echo "🔧 检查数据完整性..."
echo "=================================="
if docker exec zhiweijz-backend node migrations/data-integrity-check.js; then
    echo "✅ 数据完整性检查通过"
else
    echo "⚠️ 数据完整性检查发现问题，已尝试自动修复"
fi
echo ""

# 3. 尝试执行迁移
echo "🚀 尝试执行安全迁移..."
echo "=================================="
if docker exec zhiweijz-backend node migrations/migration-manager.js; then
    echo "✅ 迁移执行成功"
    echo ""
    echo "🎉 问题已解决！"
    echo "建议重启后端容器以确保所有更改生效:"
    echo "docker-compose restart backend"
else
    echo "❌ 迁移执行失败"
    echo ""
    echo "📋 故障排除建议:"
    echo "=================================="
    echo "1. 查看详细错误日志:"
    echo "   docker logs zhiweijz-backend --tail=50"
    echo ""
    echo "2. 检查数据库连接:"
    echo "   docker exec zhiweijz-backend npx prisma db execute --stdin <<< 'SELECT 1;'"
    echo ""
    echo "3. 手动检查数据库状态:"
    echo "   docker exec zhiweijz-backend node migrations/migration-status.js"
    echo ""
    echo "4. 如果问题持续存在，请:"
    echo "   - 保存错误日志"
    echo "   - 联系技术支持"
    echo "   - 提供诊断报告输出"
    echo ""
    echo "⚠️ 重要提醒: 我们不会执行任何可能导致数据丢失的操作"
    echo "   您的数据安全是我们的首要考虑"
fi

echo ""
echo "🔍 诊断完成"
