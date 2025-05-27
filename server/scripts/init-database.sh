#!/bin/sh

# 数据库初始化脚本
# 确保数据库schema为最新状态

echo "开始数据库初始化..."

# 等待数据库连接可用
echo "等待数据库连接..."
max_attempts=30
attempt=0

until npx prisma db push --accept-data-loss --skip-generate 2>/dev/null; do
  attempt=$((attempt + 1))
  if [ $attempt -ge $max_attempts ]; then
    echo "数据库连接超时，退出..."
    exit 1
  fi
  echo "数据库连接失败，5秒后重试... (尝试 $attempt/$max_attempts)"
  sleep 5
done

echo "数据库连接成功！"

# 执行数据库迁移
echo "执行数据库迁移..."
if npx prisma migrate deploy; then
  echo "数据库迁移成功"
else
  echo "数据库迁移失败，但继续启动..."
fi

# 检查迁移状态
echo "检查迁移状态..."
npx prisma migrate status

# 生成Prisma客户端
echo "生成Prisma客户端..."
if npx prisma generate; then
  echo "Prisma客户端生成成功"
else
  echo "Prisma客户端生成失败，但继续启动..."
fi

echo "数据库初始化完成！"
