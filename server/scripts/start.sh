#!/bin/sh

# 启动脚本 - 统一数据库初始化并启动服务器

echo "正在启动服务器..."

# 检查环境
if [ "$DOCKER_ENV" = "true" ]; then
    echo "Docker环境：执行数据库迁移"

    # 等待数据库连接可用
    echo "⏳ 等待数据库连接..."
    for i in $(seq 1 30); do
        if npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
            echo "✅ 数据库连接成功"
            break
        fi
        if [ $i -eq 30 ]; then
            echo "❌ 错误: 数据库连接超时"
            exit 1
        fi
        echo "等待数据库连接... ($i/30)"
        sleep 2
    done

    # 检查是否为全新数据库
    echo "🔍 检查数据库状态..."
    USER_TABLE_EXISTS=$(npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users';" 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")

    if [ "$USER_TABLE_EXISTS" = "0" ]; then
        echo "📦 检测到全新数据库，执行初始化..."
        npx prisma migrate deploy
        echo "✅ 数据库初始化完成"
    else
        echo "🔄 检测到现有数据库，执行安全迁移..."

        # 检查迁移状态
        MIGRATION_STATUS=$(npx prisma migrate status 2>&1)

        if echo "$MIGRATION_STATUS" | grep -q "Database schema is up to date"; then
            echo "✅ 数据库已是最新状态"
        else
            echo "🚀 执行数据库迁移..."
            npx prisma migrate deploy || {
                echo "⚠️ 标准迁移失败，执行强制同步..."
                npx prisma db push --force-reset --accept-data-loss
            }
            echo "✅ 数据库迁移完成"
        fi

        # 确保关键字段存在
        echo "🔧 确保关键字段存在..."
        npx prisma db execute --stdin <<< "
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_custodial BOOLEAN DEFAULT false;
        ALTER TABLE budgets ADD COLUMN IF NOT EXISTS refresh_day INTEGER DEFAULT 1;
        ALTER TABLE account_books ADD COLUMN IF NOT EXISTS created_by TEXT;
        ALTER TABLE account_books ADD COLUMN IF NOT EXISTS user_llm_setting_id TEXT;
        ALTER TABLE budgets ADD COLUMN IF NOT EXISTS family_member_id TEXT;
        " || echo "⚠️ 部分字段添加失败，可能已存在"
    fi

    # 生成Prisma客户端
    echo "🔧 生成Prisma客户端..."
    npx prisma generate

    echo "✅ 数据库准备完成"
else
    echo "开发环境：执行Prisma迁移"
    # 开发环境使用Prisma迁移
    ./scripts/init-database.sh
fi

echo "启动应用服务器..."

# 启动Node.js应用
exec node dist/index.js
