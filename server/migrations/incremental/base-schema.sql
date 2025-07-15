/*META
VERSION: 1.0.0
DESCRIPTION: Base schema for fresh installations - Core tables and enums
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 基础架构迁移：全新安装的核心表结构
-- =======================================

-- 创建枚举类型
DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BudgetPeriod" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'MEMBER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AccountBookType" AS ENUM ('PERSONAL', 'FAMILY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BudgetType" AS ENUM ('MONTHLY', 'YEARLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 用户表
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar" TEXT,
    "bio" TEXT,
    "birth_date" TIMESTAMP WITHOUT TIME ZONE,
    "password_changed_at" TIMESTAMP WITHOUT TIME ZONE,
    "is_custodial" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "daily_llm_token_limit" INTEGER,
    "deletion_requested_at" TIMESTAMP WITHOUT TIME ZONE,
    "deletion_scheduled_at" TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- 家庭表
CREATE TABLE IF NOT EXISTS "families" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "families_pkey" PRIMARY KEY ("id")
);

-- 家庭成员表
CREATE TABLE IF NOT EXISTS "family_members" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'MEMBER',
    "is_registered" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "family_member_id" TEXT,
    "invitation_code" TEXT,
    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- 邀请表
CREATE TABLE IF NOT EXISTS "invitations" (
    "id" TEXT NOT NULL,
    "family_id" TEXT NOT NULL,
    "invitation_code" TEXT NOT NULL,
    "expires_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- 账本表
CREATE TABLE IF NOT EXISTS "account_books" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "family_id" TEXT,
    "type" "AccountBookType" NOT NULL DEFAULT 'PERSONAL',
    "created_by" TEXT,
    "user_llm_setting_id" TEXT,
    CONSTRAINT "account_books_pkey" PRIMARY KEY ("id")
);

-- 分类表
CREATE TABLE IF NOT EXISTS "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "icon" TEXT,
    "user_id" TEXT,
    "family_id" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_book_id" TEXT,
    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- 交易记录表
CREATE TABLE IF NOT EXISTS "transactions" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "TransactionType" NOT NULL,
    "category_id" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "user_id" TEXT NOT NULL,
    "family_id" TEXT,
    "family_member_id" TEXT,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "budget_id" TEXT,
    "account_book_id" TEXT,
    "metadata" JSONB,
    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- 预算表
CREATE TABLE IF NOT EXISTS "budgets" (
    "id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "start_date" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "end_date" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "category_id" TEXT,
    "user_id" TEXT,
    "family_id" TEXT,
    "rollover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "name" TEXT NOT NULL,
    "account_book_id" TEXT,
    "is_auto_calculated" BOOLEAN NOT NULL DEFAULT false,
    "enable_category_budget" BOOLEAN NOT NULL DEFAULT false,
    "rollover_amount" DECIMAL(10,2),
    "budget_type" "BudgetType" NOT NULL DEFAULT 'PERSONAL',
    "amount_modified" BOOLEAN NOT NULL DEFAULT false,
    "last_amount_modified_at" TIMESTAMP WITHOUT TIME ZONE,
    "family_member_id" TEXT,
    "refresh_day" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- 预算历史表
CREATE TABLE IF NOT EXISTS "budget_histories" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "period_start" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "period_end" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "original_amount" DECIMAL(10,2) NOT NULL,
    "spent_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rollover_amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "final_amount" DECIMAL(10,2) NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount_modified" BOOLEAN NOT NULL DEFAULT false,
    "amount_modified_at" TIMESTAMP WITHOUT TIME ZONE,
    "amount_modified_reason" TEXT,
    CONSTRAINT "budget_histories_pkey" PRIMARY KEY ("id")
);

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

-- 用户设置表
CREATE TABLE IF NOT EXISTS "user_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("id")
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

-- 密码重置令牌表
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
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

-- 用户LLM设置表
CREATE TABLE IF NOT EXISTS "user_llm_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "api_key" TEXT,
    "temperature" DECIMAL(3,2) DEFAULT 0.7,
    "max_tokens" INTEGER DEFAULT 1000,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "base_url" TEXT,
    "description" TEXT,
    "name" TEXT NOT NULL DEFAULT '默认LLM设置',
    CONSTRAINT "user_llm_settings_pkey" PRIMARY KEY ("id")
);

-- 账本LLM设置表
CREATE TABLE IF NOT EXISTS "account_llm_settings" (
    "id" TEXT NOT NULL,
    "account_book_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "api_key" TEXT,
    "temperature" DECIMAL(3,2) DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 1000,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "account_llm_settings_pkey" PRIMARY KEY ("id")
);

-- AI模型表
CREATE TABLE IF NOT EXISTS "ai_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "model_path" TEXT NOT NULL,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- 分类预算表
CREATE TABLE IF NOT EXISTS "category_budgets" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "spent" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "category_budgets_pkey" PRIMARY KEY ("id")
);

-- 用户分类配置表
CREATE TABLE IF NOT EXISTS "user_category_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_category_configs_pkey" PRIMARY KEY ("id")
);

-- 用户反馈表
CREATE TABLE IF NOT EXISTS "user_feedback" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "transaction_id" TEXT,
    "suggestion_id" TEXT,
    "feedback_type" TEXT NOT NULL,
    "content" TEXT,
    "created_at" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id")
);

-- 创建索引
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_invitation_code_key" ON "invitations"("invitation_code");
CREATE UNIQUE INDEX IF NOT EXISTS "user_settings_user_id_key_key" ON "user_settings"("user_id", "key");
CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_token_key" ON "password_reset_tokens"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_key" ON "sessions"("token");
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions"("user_id");
CREATE INDEX IF NOT EXISTS "sessions_expires_at_idx" ON "sessions"("expires_at");
CREATE INDEX IF NOT EXISTS "verification_codes_user_id_idx" ON "verification_codes"("user_id");
CREATE INDEX IF NOT EXISTS "verification_codes_email_idx" ON "verification_codes"("email");
CREATE INDEX IF NOT EXISTS "security_logs_user_id_idx" ON "security_logs"("user_id");
CREATE INDEX IF NOT EXISTS "user_llm_settings_user_id_idx" ON "user_llm_settings"("user_id");
CREATE INDEX IF NOT EXISTS "account_llm_settings_account_book_id_idx" ON "account_llm_settings"("account_book_id");
CREATE INDEX IF NOT EXISTS "category_budgets_budget_id_idx" ON "category_budgets"("budget_id");
CREATE INDEX IF NOT EXISTS "category_budgets_category_id_idx" ON "category_budgets"("category_id");
CREATE INDEX IF NOT EXISTS "user_category_configs_user_id_idx" ON "user_category_configs"("user_id");
CREATE INDEX IF NOT EXISTS "user_category_configs_category_id_idx" ON "user_category_configs"("category_id");
CREATE INDEX IF NOT EXISTS "user_feedback_user_id_idx" ON "user_feedback"("user_id");

-- 创建外键约束
ALTER TABLE "families" ADD CONSTRAINT "families_created_by_fkey" 
    FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "family_members" ADD CONSTRAINT "family_members_family_id_fkey" 
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "family_members" ADD CONSTRAINT "family_members_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invitations" ADD CONSTRAINT "invitations_family_id_fkey" 
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "account_books" ADD CONSTRAINT "account_books_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "account_books" ADD CONSTRAINT "account_books_family_id_fkey" 
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "categories" ADD CONSTRAINT "categories_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "categories" ADD CONSTRAINT "categories_family_id_fkey"
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "categories" ADD CONSTRAINT "categories_account_book_id_fkey"
    FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_fkey" 
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_id_fkey" 
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_family_member_id_fkey" 
    FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budget_id_fkey" 
    FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_book_id_fkey" 
    FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budgets" ADD CONSTRAINT "budgets_family_id_fkey" 
    FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_fkey" 
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budgets" ADD CONSTRAINT "budgets_family_member_id_fkey"
    FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budgets" ADD CONSTRAINT "budgets_account_book_id_fkey"
    FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "budget_histories" ADD CONSTRAINT "budget_histories_budget_id_fkey"
    FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "user_feedback" ADD CONSTRAINT "user_feedback_transaction_id_fkey"
    FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 新表的外键约束
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_llm_settings" ADD CONSTRAINT "user_llm_settings_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "account_llm_settings" ADD CONSTRAINT "account_llm_settings_account_book_id_fkey"
    FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_budget_id_fkey"
    FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_category_configs" ADD CONSTRAINT "user_category_configs_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_category_configs" ADD CONSTRAINT "user_category_configs_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;