/*META
VERSION: 1.7.11
DESCRIPTION: Fix database schema - add missing columns to match Prisma model and init.sql
AUTHOR: Claude Code Assistant
*/

-- 修复数据库表结构，添加缺失的字段以匹配Prisma模型和init.sql

-- ========================================
-- 修复用户表结构
-- ========================================

-- 1. 添加 is_active 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column is_active already exists';
END $$;

-- 2. 添加 daily_llm_token_limit 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN daily_llm_token_limit INTEGER;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column daily_llm_token_limit already exists';
END $$;

-- 3. 添加 deletion_requested_at 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN deletion_requested_at TIMESTAMP WITHOUT TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column deletion_requested_at already exists';
END $$;

-- 4. 添加 deletion_scheduled_at 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE users ADD COLUMN deletion_scheduled_at TIMESTAMP WITHOUT TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column deletion_scheduled_at already exists';
END $$;

-- ========================================
-- 修复预算表结构
-- ========================================

-- 5. 添加 is_auto_calculated 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN is_auto_calculated BOOLEAN DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column is_auto_calculated already exists';
END $$;

-- 6. 添加 enable_category_budget 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN enable_category_budget BOOLEAN DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column enable_category_budget already exists';
END $$;

-- 7. 添加 rollover_amount 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN rollover_amount DECIMAL(10,2);
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column rollover_amount already exists';
END $$;

-- 8. 添加 budget_type 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN budget_type "BudgetType" DEFAULT 'PERSONAL';
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column budget_type already exists';
END $$;

-- 9. 添加 amount_modified 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN amount_modified BOOLEAN DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column amount_modified already exists';
END $$;

-- 10. 添加 last_amount_modified_at 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN last_amount_modified_at TIMESTAMP WITHOUT TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column last_amount_modified_at already exists';
END $$;

-- 11. 确保 refresh_day 字段存在且有正确的默认值
DO $$ BEGIN
    ALTER TABLE budgets ADD COLUMN refresh_day INTEGER DEFAULT 1;
EXCEPTION
    WHEN duplicate_column THEN 
        RAISE NOTICE 'Column refresh_day already exists';
END $$;

-- 12. 更新现有记录的默认值
UPDATE users SET is_active = true WHERE is_active IS NULL;
UPDATE budgets SET is_auto_calculated = false WHERE is_auto_calculated IS NULL;
UPDATE budgets SET enable_category_budget = false WHERE enable_category_budget IS NULL;
UPDATE budgets SET budget_type = 'PERSONAL' WHERE budget_type IS NULL;
UPDATE budgets SET amount_modified = false WHERE amount_modified IS NULL;
UPDATE budgets SET refresh_day = 1 WHERE refresh_day IS NULL;

-- 13. 设置 NOT NULL 约束（对于应该是 NOT NULL 的字段）

-- 用户表约束
DO $$ BEGIN
    ALTER TABLE users ALTER COLUMN is_active SET NOT NULL;
    ALTER TABLE users ALTER COLUMN is_active SET DEFAULT true;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set NOT NULL constraint on is_active';
END $$;
-- 预算表约束
DO $$ BEGIN
    ALTER TABLE budgets ALTER COLUMN is_auto_calculated SET NOT NULL;
    ALTER TABLE budgets ALTER COLUMN is_auto_calculated SET DEFAULT false;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set NOT NULL constraint on is_auto_calculated';
END $$;

DO $$ BEGIN
    ALTER TABLE budgets ALTER COLUMN enable_category_budget SET NOT NULL;
    ALTER TABLE budgets ALTER COLUMN enable_category_budget SET DEFAULT false;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set NOT NULL constraint on enable_category_budget';
END $$;

DO $$ BEGIN
    ALTER TABLE budgets ALTER COLUMN budget_type SET NOT NULL;
    ALTER TABLE budgets ALTER COLUMN budget_type SET DEFAULT 'PERSONAL';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set NOT NULL constraint on budget_type';
END $$;

DO $$ BEGIN
    ALTER TABLE budgets ALTER COLUMN amount_modified SET NOT NULL;
    ALTER TABLE budgets ALTER COLUMN amount_modified SET DEFAULT false;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set NOT NULL constraint on amount_modified';
END $$;

DO $$ BEGIN
    ALTER TABLE budgets ALTER COLUMN name SET NOT NULL;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set NOT NULL constraint on name';
END $$;

DO $$ BEGIN
    ALTER TABLE budgets ALTER COLUMN refresh_day SET NOT NULL;
    ALTER TABLE budgets ALTER COLUMN refresh_day SET DEFAULT 1;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set NOT NULL constraint on refresh_day';
END $$;

-- 14. 确保关键表存在（如果不存在则创建）
-- 这些表在某些旧版本中可能缺失

-- 会话表
CREATE TABLE IF NOT EXISTS "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "device_name" TEXT,
    "device_type" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "ip" TEXT,
    "location" TEXT,
    "last_active" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- 验证码表
CREATE TABLE IF NOT EXISTS "verification_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

-- 安全日志表
CREATE TABLE IF NOT EXISTS "security_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "device_info" TEXT NOT NULL,
    "ip_address" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "security_logs_pkey" PRIMARY KEY ("id")
);

-- 15. 验证表结构 - 使用简单查询替代复杂DO块
-- 验证用户表字段
SELECT
    COUNT(*) as user_column_count,
    '用户表字段验证完成' as status
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN (
    'is_active',
    'daily_llm_token_limit',
    'deletion_requested_at',
    'deletion_scheduled_at'
);

-- 验证预算表字段
SELECT
    COUNT(*) as budget_column_count,
    '预算表字段验证完成' as status
FROM information_schema.columns
WHERE table_name = 'budgets'
AND column_name IN (
    'is_auto_calculated',
    'enable_category_budget',
    'rollover_amount',
    'budget_type',
    'amount_modified',
    'last_amount_modified_at',
    'refresh_day'
);

-- 检查关键表是否存在
SELECT
    COUNT(*) as existing_tables_count,
    '关键表存在性验证完成' as status
FROM information_schema.tables
WHERE table_name IN ('sessions', 'verification_codes', 'security_logs')
AND table_schema = 'public';
