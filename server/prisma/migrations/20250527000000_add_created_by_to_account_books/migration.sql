-- 一次性迁移脚本：将数据库更新到最新状态
-- 这个脚本确保Docker环境中的数据库与生产环境保持一致

-- 检查并添加缺失的列到 account_books 表
DO $$
BEGIN
    -- 添加 created_by 列（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'account_books' AND column_name = 'created_by'
    ) THEN
        ALTER TABLE "account_books" ADD COLUMN "created_by" TEXT;
    END IF;

    -- 添加 user_llm_setting_id 列（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'account_books' AND column_name = 'user_llm_setting_id'
    ) THEN
        ALTER TABLE "account_books" ADD COLUMN "user_llm_setting_id" TEXT;
    END IF;
END $$;

-- 检查并添加缺失的列到 budgets 表
DO $$
BEGIN
    -- 添加 family_member_id 列（如果不存在）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'budgets' AND column_name = 'family_member_id'
    ) THEN
        ALTER TABLE "budgets" ADD COLUMN "family_member_id" TEXT;
    END IF;
END $$;

-- 创建 user_llm_settings 表（如果不存在）
CREATE TABLE IF NOT EXISTS "user_llm_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "api_key" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "max_tokens" INTEGER NOT NULL DEFAULT 1000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "base_url" TEXT,
    "description" TEXT,
    "name" TEXT NOT NULL DEFAULT '默认LLM设置',

    CONSTRAINT "user_llm_settings_pkey" PRIMARY KEY ("id")
);

-- 创建 user_account_books 表（如果不存在）
CREATE TABLE IF NOT EXISTS "user_account_books" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "account_book_id" UUID NOT NULL,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT now(),

    CONSTRAINT "user_account_books_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "user_account_books_user_id_account_book_id_key" UNIQUE ("user_id", "account_book_id")
);

-- 添加外键约束（如果不存在）
DO $$
BEGIN
    -- account_books.user_llm_setting_id -> user_llm_settings.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'account_books_user_llm_setting_id_fkey'
    ) THEN
        ALTER TABLE "account_books" ADD CONSTRAINT "account_books_user_llm_setting_id_fkey"
        FOREIGN KEY ("user_llm_setting_id") REFERENCES "user_llm_settings"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- user_llm_settings.user_id -> users.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_llm_settings_user_id_fkey'
    ) THEN
        ALTER TABLE "user_llm_settings" ADD CONSTRAINT "user_llm_settings_user_id_fkey"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- budgets.family_member_id -> family_members.id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'budgets_family_member_id_fkey'
    ) THEN
        ALTER TABLE "budgets" ADD CONSTRAINT "budgets_family_member_id_fkey"
        FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
