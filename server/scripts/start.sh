#!/bin/sh

# 启动脚本 - 统一数据库初始化并启动服务器

echo "正在启动服务器..."

# 检查环境
if [ "$DOCKER_ENV" = "true" ]; then
    echo "Docker环境：使用数据库自动初始化"
    # Docker环境中，数据库已通过init.sql初始化，只需要生成Prisma客户端
    echo "生成Prisma客户端..."
    npx prisma generate

    # 执行数据库迁移（用于现有数据库的字段更新）
    echo "执行数据库迁移..."
    if [ -f "./scripts/migration-manager.js" ]; then
        echo "使用迁移管理器执行数据库迁移..."
        if node ./scripts/migration-manager.js; then
            echo "数据库迁移成功"
        else
            echo "数据库迁移失败，但继续启动服务"
        fi
    else
        echo "迁移管理器不存在，跳过迁移"
    fi
else
    echo "开发环境：执行Prisma迁移"
    # 开发环境使用Prisma迁移
    ./scripts/init-database.sh
fi

echo "启动应用服务器..."

# 启动Node.js应用
exec node dist/index.js
