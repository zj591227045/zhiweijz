#!/bin/sh

# 启动脚本 - 统一数据库初始化并启动服务器

echo "正在启动服务器..."

# 检查环境
if [ "$DOCKER_ENV" = "true" ]; then
    echo "Docker环境：使用数据库自动初始化"
    # Docker环境中，数据库已通过init.sql初始化，只需要生成Prisma客户端
    echo "生成Prisma客户端..."
    npx prisma generate
else
    echo "开发环境：执行Prisma迁移"
    # 开发环境使用Prisma迁移
    ./scripts/init-database.sh
fi

echo "启动应用服务器..."

# 启动Node.js应用
exec node dist/index.js
