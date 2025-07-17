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

# 优先使用增量迁移系统
echo "1️⃣ 执行增量迁移..."
docker exec zhiweijz-backend node migrations/migration-manager.js || {
    echo "⚠️ 增量迁移失败，尝试标准Prisma迁移..."
    docker exec zhiweijz-backend npx prisma migrate deploy || {
        echo "⚠️ 标准迁移失败，执行安全的schema推送..."
        docker exec zhiweijz-backend npx prisma db push
    }
}

# 生成客户端
echo "2️⃣ 生成Prisma客户端..."
docker exec zhiweijz-backend npx prisma generate

# 添加缺失字段
echo "3️⃣ 添加缺失字段..."
docker exec zhiweijz-backend npx prisma db execute --stdin <<< "
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT false;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS refresh_day INTEGER DEFAULT 1;
ALTER TABLE account_books ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE account_books ADD COLUMN IF NOT EXISTS user_llm_setting_id TEXT;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS family_member_id TEXT;
"

# 重启容器
echo "4️⃣ 重启后端容器..."
docker-compose restart backend

echo "✅ 安全数据库迁移完成！"
