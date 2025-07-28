/*META
VERSION: fix-missing-account-book-id-fields
DESCRIPTION: 修复categories和budgets表缺失的account_book_id字段
AUTHOR: system
DATE: 2025-01-15
*/

-- 为categories表添加account_book_id字段
DO $$ BEGIN
    ALTER TABLE categories ADD COLUMN account_book_id TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column account_book_id already exists in categories table';
END $$;

-- 为budgets表添加account_book_id字段
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN account_book_id TEXT;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column account_book_id already exists in budgets table';
END $$;

-- 添加外键约束
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_categories_account_book_id ON categories(account_book_id);
CREATE INDEX IF NOT EXISTS idx_budgets_account_book_id ON budgets(account_book_id);

-- 为现有数据设置默认的account_book_id - 使用简化的方式
-- 创建临时表来存储用户和其默认账本的映射
CREATE TEMP TABLE user_default_books AS
SELECT DISTINCT
    u.id as user_id,
    COALESCE(
        (SELECT ab1.id FROM account_books ab1 WHERE ab1.user_id = u.id AND ab1.is_default = true LIMIT 1),
        (SELECT ab2.id FROM account_books ab2 WHERE ab2.user_id = u.id ORDER BY ab2.created_at ASC LIMIT 1)
    ) as default_book_id
FROM users u
WHERE EXISTS (SELECT 1 FROM account_books ab WHERE ab.user_id = u.id);

-- 更新分类表
UPDATE categories
SET account_book_id = udb.default_book_id
FROM user_default_books udb
WHERE categories.user_id = udb.user_id
  AND categories.account_book_id IS NULL
  AND udb.default_book_id IS NOT NULL;

-- 更新预算表
UPDATE budgets
SET account_book_id = udb.default_book_id
FROM user_default_books udb
WHERE budgets.user_id = udb.user_id
  AND budgets.account_book_id IS NULL
  AND udb.default_book_id IS NOT NULL;

-- 清理临时表
DROP TABLE user_default_books;
