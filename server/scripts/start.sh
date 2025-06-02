#!/bin/sh

# 启动脚本 - 统一数据库初始化并启动服务器

echo "正在启动服务器..."

# 检查环境
if [ "$DOCKER_ENV" = "true" ]; then
    echo "Docker环境：使用安全迁移脚本"
    # 使用安全迁移脚本，防止数据丢失
    if [ -f "./scripts/docker-safe-migrate.sh" ]; then
        echo "执行Docker安全迁移..."
        ./scripts/docker-safe-migrate.sh
    else
        echo "⚠️  安全迁移脚本不存在，使用传统方式"
        echo "生成Prisma客户端..."
        npx prisma generate
        echo "执行数据库迁移..."
        npx prisma migrate deploy
    fi
else
    echo "开发环境：执行Prisma迁移"
    # 开发环境使用Prisma迁移
    ./scripts/init-database.sh
fi

echo "启动应用服务器..."

# 启动Node.js应用
exec node dist/index.js
