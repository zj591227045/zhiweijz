#!/bin/bash

# 测试数据库连接脚本

# 加载配置
source ./config_loader.sh

if ! init_config; then
    echo "配置加载失败"
    exit 1
fi

echo "测试数据库连接..."
echo "主机: $DB_HOST"
echo "端口: $DB_PORT"
echo "数据库: $DB_NAME"
echo "用户: $DB_USER"
echo "使用Docker: $USE_DOCKER"
echo ""

# 测试Docker连接
echo "测试Docker PostgreSQL连接..."
docker run --rm postgres:15 pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
echo "Docker测试返回码: $?"

echo ""
echo "测试Docker网络连接..."
docker run --rm --network host postgres:15 pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"
echo "Docker host网络测试返回码: $?"

echo ""
echo "测试简单连接..."
docker run --rm -e PGPASSWORD="$DB_PASSWORD" postgres:15 psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;"
echo "简单查询返回码: $?"
