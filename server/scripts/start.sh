#!/bin/sh

# 启动脚本 - 自动执行数据库迁移并启动服务器

echo "正在启动服务器..."

# 执行数据库初始化
./scripts/init-database.sh

echo "启动应用服务器..."

# 启动Node.js应用
exec node dist/index.js
