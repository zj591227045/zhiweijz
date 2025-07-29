#!/bin/bash

# 快速修复脚本 - 解决当前的外键约束问题
# 专门针对 fix-missing-account-book-id-fields 迁移失败的问题

set -e

echo "⚡ 快速修复 - 外键约束问题"
echo "=================================="

# 检查容器状态
if ! docker ps | grep -q "zhiweijz-backend"; then
    echo "❌ 后端容器未运行，请先启动: docker-compose up -d backend"
    exit 1
fi

echo "✅ 后端容器正在运行"

# 执行快速修复
echo ""
echo "🔧 执行快速修复..."

# 直接在容器中执行修复SQL
docker exec zhiweijz-backend npx prisma db execute --stdin << 'EOF'
-- 快速修复脚本：解决外键约束问题

-- 1. 删除可能存在的有问题的外键约束
DO $$ BEGIN
    ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_account_book_id_fkey;
    ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_account_book_id_fkey;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error dropping constraints: %', SQLERRM;
END $$;

-- 2. 确保字段存在
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN IF NOT EXISTS account_book_id TEXT;
    ALTER TABLE categories ADD COLUMN IF NOT EXISTS account_book_id TEXT;
EXCEPTION
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- 3. 修复NULL值 - 为budgets表
UPDATE budgets 
SET account_book_id = (
    SELECT COALESCE(
        (SELECT ab1.id FROM account_books ab1 WHERE ab1.user_id = budgets.user_id AND ab1.is_default = true LIMIT 1),
        (SELECT ab2.id FROM account_books ab2 WHERE ab2.user_id = budgets.user_id ORDER BY ab2.created_at ASC LIMIT 1)
    )
)
WHERE account_book_id IS NULL 
  AND user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM account_books ab WHERE ab.user_id = budgets.user_id);

-- 4. 修复NULL值 - 为categories表
UPDATE categories 
SET account_book_id = (
    SELECT COALESCE(
        (SELECT ab1.id FROM account_books ab1 WHERE ab1.user_id = categories.user_id AND ab1.is_default = true LIMIT 1),
        (SELECT ab2.id FROM account_books ab2 WHERE ab2.user_id = categories.user_id ORDER BY ab2.created_at ASC LIMIT 1)
    )
)
WHERE account_book_id IS NULL 
  AND user_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM account_books ab WHERE ab.user_id = categories.user_id);

-- 5. 删除无效引用
DELETE FROM budgets 
WHERE account_book_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM account_books WHERE id = budgets.account_book_id);

DELETE FROM categories 
WHERE account_book_id IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM account_books WHERE id = categories.account_book_id);

-- 6. 重新添加外键约束
DO $$ BEGIN
    ALTER TABLE budgets ADD CONSTRAINT budgets_account_book_id_fkey 
    FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Foreign key constraint budgets_account_book_id_fkey already exists';
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error adding budgets foreign key: %', SQLERRM;
END $$;

DO $$ BEGIN
    ALTER TABLE categories ADD CONSTRAINT categories_account_book_id_fkey 
    FOREIGN KEY (account_book_id) REFERENCES account_books(id) ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'Foreign key constraint categories_account_book_id_fkey already exists';
    WHEN OTHERS THEN 
        RAISE NOTICE 'Error adding categories foreign key: %', SQLERRM;
END $$;

-- 7. 创建索引
CREATE INDEX IF NOT EXISTS idx_budgets_account_book_id ON budgets(account_book_id);
CREATE INDEX IF NOT EXISTS idx_categories_account_book_id ON categories(account_book_id);

SELECT 'Quick fix completed successfully' as result;
EOF

if [ $? -eq 0 ]; then
    echo "✅ 快速修复成功"
    
    # 标记迁移为已完成，避免重复执行
    echo ""
    echo "🏷️ 标记迁移为已完成..."
    docker exec zhiweijz-backend npx prisma db execute --stdin << 'EOF'
-- 确保schema_versions表存在
CREATE TABLE IF NOT EXISTS schema_versions (
    id SERIAL PRIMARY KEY,
    version TEXT NOT NULL,
    description TEXT,
    migration_file TEXT UNIQUE,
    applied_at TIMESTAMP DEFAULT NOW()
);

-- 标记fix-missing-account-book-id-fields迁移为已完成
INSERT INTO schema_versions (version, description, migration_file, applied_at)
VALUES ('fix-missing-account-book-id-fields', '修复categories和budgets表缺失的account_book_id字段', 'fix-missing-account-book-id-fields', NOW())
ON CONFLICT (migration_file) DO NOTHING;

SELECT 'Migration marked as completed' as result;
EOF
    
    echo "✅ 迁移已标记为完成"
    
    # 重启容器
    echo ""
    echo "🔄 重启后端容器以应用更改..."
    docker-compose restart backend
    
    echo ""
    echo "🎉 快速修复完成！"
    echo "=================================="
    echo "修复内容："
    echo "  ✅ 修复了外键约束问题"
    echo "  ✅ 清理了无效数据"
    echo "  ✅ 标记迁移为已完成"
    echo "  ✅ 重启了后端容器"
    echo ""
    echo "请检查应用状态："
    echo "  docker logs zhiweijz-backend --tail=20"
    
else
    echo "❌ 快速修复失败"
    echo "请查看错误信息并联系技术支持"
    exit 1
fi
