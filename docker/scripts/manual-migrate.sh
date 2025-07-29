#!/bin/bash

# 手动数据库迁移脚本 - 安全版本
# 用于Docker升级后手动执行数据库结构更新

set -e

echo "🔧 执行安全数据库迁移..."

# 检查容器状态
if ! docker ps | grep -q "zhiweijz-backend"; then
    echo "❌ 后端容器未运行，请先启动: docker-compose up -d"
    exit 1
fi

# 执行数据完整性检查
echo "1️⃣ 执行数据完整性检查..."
if docker exec zhiweijz-backend node migrations/data-integrity-check.js; then
    echo "✅ 数据完整性检查通过"
else
    echo "⚠️ 数据完整性检查发现问题，但继续执行迁移"
fi

# 只使用安全的增量迁移系统
echo "2️⃣ 执行安全增量迁移..."
if docker exec zhiweijz-backend node migrations/migration-manager.js; then
    echo "✅ 增量迁移成功完成"
else
    echo "❌ 增量迁移失败"
    echo "⚠️ 为保护数据安全，不执行可能导致数据丢失的操作"
    echo "📋 请检查以下内容："
    echo "   1. 数据库连接是否正常"
    echo "   2. 是否存在数据完整性问题"
    echo "   3. 查看详细错误日志"
    echo ""
    echo "💡 建议操作："
    echo "   - 查看容器日志: docker logs zhiweijz-backend"
    echo "   - 检查数据库状态: docker exec zhiweijz-backend node migrations/migration-manager.js status"
    echo "   - 如需技术支持，请保存错误日志"
    exit 1
fi

# 生成客户端
echo "3️⃣ 生成Prisma客户端..."
docker exec zhiweijz-backend npx prisma generate

# 添加缺失字段（如果需要）
echo "4️⃣ 检查并添加缺失字段..."
docker exec zhiweijz-backend npx prisma db execute --stdin <<< "
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT false;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS refresh_day INTEGER DEFAULT 1;
ALTER TABLE account_books ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE account_books ADD COLUMN IF NOT EXISTS user_llm_setting_id TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS family_member_id TEXT;
"

# 重启容器
echo "5️⃣ 重启后端容器..."
docker-compose restart backend

echo "✅ 安全数据库迁移完成！"
