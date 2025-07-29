#!/bin/sh

# 启动脚本 - 安全的数据库初始化并启动服务器

echo "正在启动服务器..."

# 验证关键环境变量
echo "🔍 验证环境变量配置..."
if [ -n "$DATABASE_URL" ]; then
    # 隐藏密码部分显示DATABASE_URL
    MASKED_URL=$(echo "$DATABASE_URL" | sed 's/:\/\/[^:]*:[^@]*@/:\/\/***:***@/')
    echo "✅ DATABASE_URL: $MASKED_URL"
else
    echo "⚠️ DATABASE_URL 环境变量未设置"
fi

echo "✅ NODE_ENV: ${NODE_ENV:-未设置}"
echo "✅ DOCKER_ENV: ${DOCKER_ENV:-未设置}"
echo "✅ PORT: ${PORT:-未设置}"

# 检查是否存在可能覆盖环境变量的.env文件
if [ -f ".env" ]; then
    echo "⚠️ 警告: 检测到.env文件，可能覆盖Docker环境变量"
    echo "   建议删除容器内的.env文件以确保使用Docker环境变量"
fi

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

    # 运行数据完整性检查
    echo "🔍 执行数据完整性检查..."
    if node migrations/data-integrity-check.js; then
        echo "✅ 数据完整性检查通过"
    else
        echo "⚠️ 数据完整性检查发现问题，但继续执行迁移"
    fi

    # 运行安全的增量迁移系统
    echo "🔍 执行安全的增量迁移..."
    if node migrations/migration-manager.js; then
        echo "✅ 增量迁移完成"
    else
        echo "⚠️ 增量迁移遇到问题，检查数据库状态..."

        # 检查是否为全新数据库
        echo "🔍 检查数据库状态..."
        USER_TABLE_EXISTS=$(echo "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'users';" | npx prisma db execute --stdin 2>/dev/null | grep -o '[0-9]*' | tail -1 || echo "0")

        if [ "$USER_TABLE_EXISTS" = "0" ]; then
            echo "📦 检测到全新数据库，使用init.sql初始化..."
            # 检查是否存在打包的init.sql文件
            if [ -f "docker/init.sql" ]; then
                echo "🗃️ 使用打包的init.sql文件初始化数据库..."
                if psql "$DATABASE_URL" -f docker/init.sql; then
                    echo "✅ 使用init.sql初始化完成"
                else
                    echo "❌ init.sql初始化失败，请检查数据库连接和权限"
                    exit 1
                fi
            else
                echo "❌ 未找到init.sql文件，无法初始化全新数据库"
                echo "请确保Docker镜像包含完整的初始化文件"
                exit 1
            fi
        else
            echo "🔄 检测到现有数据库，但增量迁移失败"
            echo "⚠️ 为保护数据安全，不执行可能导致数据丢失的操作"
            echo "📋 建议操作："
            echo "   1. 检查迁移日志中的具体错误信息"
            echo "   2. 手动修复数据完整性问题"
            echo "   3. 重新运行增量迁移"
            echo "   4. 如需帮助，请联系技术支持"

            # 继续启动应用，让用户能够访问现有数据
            echo "⚠️ 继续启动应用以保持服务可用性"
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
