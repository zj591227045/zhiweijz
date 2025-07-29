#!/bin/bash

# 热修复脚本 - 修复当前生产环境的迁移问题
# 无需重新构建Docker镜像，直接在容器中执行修复

set -e

echo "🔧 数据库迁移热修复工具"
echo "=================================="

# 检查容器状态
if ! docker ps | grep -q "zhiweijz-backend"; then
    echo "❌ 后端容器未运行"
    echo "请先启动容器: docker-compose up -d backend"
    exit 1
fi

echo "✅ 后端容器正在运行"
echo ""

# 1. 首先检查数据库连接
echo "🔍 检查数据库连接..."
if docker exec zhiweijz-backend npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
    echo "✅ 数据库连接正常"
else
    echo "❌ 数据库连接失败"
    exit 1
fi

# 2. 执行数据完整性修复
echo ""
echo "🔧 执行数据完整性修复..."
echo "=================================="

# 创建临时修复脚本
cat > /tmp/fix_data_integrity.sql << 'EOF'
-- 数据完整性修复脚本

-- 1. 为budgets表添加account_book_id字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN account_book_id TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column account_book_id already exists in budgets table';
END $$;

-- 2. 为categories表添加account_book_id字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE categories ADD COLUMN account_book_id TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column account_book_id already exists in categories table';
END $$;

-- 3. 创建临时表来存储用户和其默认账本的映射
CREATE TEMP TABLE user_default_books AS
SELECT DISTINCT
    u.id as user_id,
    COALESCE(
        (SELECT ab1.id FROM account_books ab1 WHERE ab1.user_id = u.id AND ab1.is_default = true LIMIT 1),
        (SELECT ab2.id FROM account_books ab2 WHERE ab2.user_id = u.id ORDER BY ab2.created_at ASC LIMIT 1)
    ) as default_book_id
FROM users u
WHERE EXISTS (SELECT 1 FROM account_books ab WHERE ab.user_id = u.id);

-- 4. 更新categories表的account_book_id
UPDATE categories
SET account_book_id = udb.default_book_id
FROM user_default_books udb
WHERE categories.user_id = udb.user_id
  AND categories.account_book_id IS NULL
  AND udb.default_book_id IS NOT NULL;

-- 5. 更新budgets表的account_book_id
UPDATE budgets
SET account_book_id = udb.default_book_id
FROM user_default_books udb
WHERE budgets.user_id = udb.user_id
  AND budgets.account_book_id IS NULL
  AND udb.default_book_id IS NOT NULL;

-- 6. 清理无效数据：删除没有对应account_book的记录
DELETE FROM categories 
WHERE account_book_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM account_books WHERE id = categories.account_book_id);

DELETE FROM budgets 
WHERE account_book_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM account_books WHERE id = budgets.account_book_id);

-- 7. 清理重复的budget记录（保留最新的）
WITH duplicate_budgets AS (
    SELECT 
        user_id, account_book_id, budget_type, period, start_date, family_member_id,
        array_agg(id ORDER BY updated_at DESC, created_at DESC) as ids
    FROM budgets 
    WHERE user_id IS NOT NULL AND account_book_id IS NOT NULL
    GROUP BY user_id, account_book_id, budget_type, period, start_date, family_member_id
    HAVING COUNT(*) > 1
)
DELETE FROM budgets 
WHERE id IN (
    SELECT unnest(ids[2:]) 
    FROM duplicate_budgets
);

-- 8. 添加外键约束（在数据清理之后）
DO $$ BEGIN
    ALTER TABLE categories ADD CONSTRAINT categories_account_book_id_fkey 
    FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Foreign key constraint categories_account_book_id_fkey already exists';
END $$;

DO $$ BEGIN
    ALTER TABLE budgets ADD CONSTRAINT budgets_account_book_id_fkey 
    FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Foreign key constraint budgets_account_book_id_fkey already exists';
END $$;

-- 9. 创建索引
CREATE INDEX IF NOT EXISTS idx_categories_account_book_id ON categories(account_book_id);
CREATE INDEX IF NOT EXISTS idx_budgets_account_book_id ON budgets(account_book_id);

-- 10. 添加唯一约束（如果不存在）
DO $$ BEGIN
    ALTER TABLE budgets ADD CONSTRAINT unique_user_budget_period 
    UNIQUE (user_id, account_book_id, budget_type, period, start_date, family_member_id);
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Unique constraint unique_user_budget_period already exists';
END $$;

-- 清理临时表
DROP TABLE IF EXISTS user_default_books;

SELECT 'Data integrity fix completed successfully' as result;
EOF

# 执行修复脚本
echo "执行数据修复..."
if docker exec -i zhiweijz-backend npx prisma db execute --stdin < /tmp/fix_data_integrity.sql; then
    echo "✅ 数据完整性修复成功"
else
    echo "❌ 数据完整性修复失败"
    echo "请查看错误信息并手动处理"
    rm -f /tmp/fix_data_integrity.sql
    exit 1
fi

# 清理临时文件
rm -f /tmp/fix_data_integrity.sql

# 3. 重新生成Prisma客户端
echo ""
echo "🔧 重新生成Prisma客户端..."
docker exec zhiweijz-backend npx prisma generate

# 4. 重启容器以应用更改
echo ""
echo "🔄 重启后端容器..."
docker-compose restart backend

echo ""
echo "✅ 热修复完成！"
echo "=================================="
echo "修复内容："
echo "  ✅ 添加缺失的account_book_id字段"
echo "  ✅ 修复数据完整性问题"
echo "  ✅ 清理无效和重复数据"
echo "  ✅ 添加必要的外键约束和索引"
echo "  ✅ 重新生成Prisma客户端"
echo ""
echo "请检查应用是否正常运行："
echo "  docker logs zhiweijz-backend --tail=20"
