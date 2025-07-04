#!/bin/sh

# 启动脚本 - 安全的数据库初始化并启动服务器

echo "正在启动服务器..."

# 检查环境
if [ "$DOCKER_ENV" = "true" ]; then
    echo "Docker环境：执行安全数据库迁移"

    # 等待数据库连接可用
    echo "⏳ 等待数据库连接..."
    for i in $(seq 1 30); do
        if echo "SELECT 1;" | npx prisma db execute --stdin > /dev/null 2>&1; then
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

    # 运行安全的增量迁移系统
    echo "🔍 执行安全的增量迁移..."
    if node scripts/migration-manager.js; then
        echo "✅ 增量迁移完成"
    else
        echo "⚠️ 增量迁移失败，尝试标准迁移..."
        
        # 检查是否为全新数据库
        echo "🔍 检查数据库状态..."
        USER_TABLE_EXISTS=$(echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users';" | npx prisma db execute --stdin 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")

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
                    echo "⚠️ 标准迁移失败，执行安全的schema推送..."
                    npx prisma db push
                }
                echo "✅ 数据库迁移完成"
            fi
        fi
    fi

    # 生成Prisma客户端
    echo "🔧 生成Prisma客户端..."
    npx prisma generate

    echo "✅ 数据库准备完成"
else
    echo "开发环境：执行Prisma迁移"
    # 开发环境使用安全的初始化脚本
    ./scripts/migration/init-database.sh
fi

echo "启动应用服务器..."

# 启动Node.js应用
exec node dist/index.js
