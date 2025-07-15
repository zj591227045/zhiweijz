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

-- 为现有数据设置默认的account_book_id
-- 对于每个用户，将其分类和预算关联到其默认账本
DO $$ 
DECLARE
    user_record RECORD;
    default_book_id TEXT;
BEGIN
    -- 遍历所有用户
    FOR user_record IN SELECT id FROM users LOOP
        -- 查找用户的默认账本
        SELECT id INTO default_book_id 
        FROM account_books 
        WHERE user_id = user_record.id AND is_default = true 
        LIMIT 1;
        
        -- 如果没有默认账本，查找用户的第一个账本
        IF default_book_id IS NULL THEN
            SELECT id INTO default_book_id 
            FROM account_books 
            WHERE user_id = user_record.id 
            ORDER BY created_at ASC 
            LIMIT 1;
        END IF;
        
        -- 如果找到了账本，更新该用户的分类和预算
        IF default_book_id IS NOT NULL THEN
            -- 更新用户的分类
            UPDATE categories 
            SET account_book_id = default_book_id 
            WHERE user_id = user_record.id AND account_book_id IS NULL;
            
            -- 更新用户的预算
            UPDATE budgets 
            SET account_book_id = default_book_id 
            WHERE user_id = user_record.id AND account_book_id IS NULL;
            
            RAISE NOTICE 'Updated categories and budgets for user % with account book %', user_record.id, default_book_id;
        END IF;
    END LOOP;
END $$;
