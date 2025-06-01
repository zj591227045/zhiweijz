#!/bin/sh

# 数据库迁移脚本 - 添加refresh_day字段
# 此脚本用于在现有数据库中安全地添加refresh_day字段

set -e

echo "开始数据库迁移：添加refresh_day字段..."

# 检查环境变量
if [ -z "$DATABASE_URL" ]; then
    echo "错误：DATABASE_URL环境变量未设置"
    exit 1
fi

# 检查是否在Docker环境中
if [ "$DOCKER_ENV" = "true" ]; then
    echo "Docker环境：使用内部数据库连接"
    DB_HOST="postgres"
    DB_PORT="5432"
    DB_NAME="zhiweijz"
    DB_USER="zhiweijz"
    DB_PASS="zhiweijz123"
else
    echo "开发环境：解析DATABASE_URL"

    # 提取数据库连接信息
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*\/\/[^:]*:\([^@]*\)@.*/\1/p')
fi

echo "数据库连接信息："
echo "  主机: $DB_HOST"
echo "  端口: $DB_PORT"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"

# 使用Node.js和Prisma进行迁移（避免依赖psql客户端）
echo "使用Node.js执行数据库迁移..."

node -e "
const { PrismaClient } = require('@prisma/client');

async function migrate() {
  const prisma = new PrismaClient();

  try {
    console.log('检查refresh_day字段是否已存在...');

    // 检查字段是否存在
    const result = await prisma.\$queryRaw\`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'budgets'
      AND column_name = 'refresh_day'
    \`;

    if (result.length > 0) {
      console.log('refresh_day字段已存在，跳过迁移');
      return;
    }

    console.log('refresh_day字段不存在，开始迁移...');

    // 执行迁移
    await prisma.\$executeRaw\`
      ALTER TABLE budgets ADD COLUMN refresh_day INTEGER DEFAULT 1
    \`;

    await prisma.\$executeRaw\`
      ALTER TABLE budgets ADD CONSTRAINT budgets_refresh_day_check
      CHECK (refresh_day IN (1, 5, 10, 15, 20, 25))
    \`;

    await prisma.\$executeRaw\`
      UPDATE budgets SET refresh_day = 1 WHERE refresh_day IS NULL
    \`;

    await prisma.\$executeRaw\`
      ALTER TABLE budgets ALTER COLUMN refresh_day SET NOT NULL
    \`;

    // 验证迁移结果
    const budgetCount = await prisma.budget.count();
    console.log('✅ 数据库迁移完成！');
    console.log('   - 已添加refresh_day字段');
    console.log('   - 已设置默认值为1');
    console.log('   - 已添加约束检查');
    console.log('   - 现有数据已更新');
    console.log('   - 预算总数:', budgetCount);

  } catch (error) {
    console.error('❌ 数据库迁移失败:', error.message);
    process.exit(1);
  } finally {
    await prisma.\$disconnect();
  }
}

migrate();
"
