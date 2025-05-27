-- Add missing fields to family_members table
ALTER TABLE "family_members" ADD COLUMN "birth_date" TIMESTAMP(3);
ALTER TABLE "family_members" ADD COLUMN "gender" TEXT;
ALTER TABLE "family_members" ADD COLUMN "is_custodial" BOOLEAN NOT NULL DEFAULT false;

-- Add missing fields to invitations table
ALTER TABLE "invitations" ADD COLUMN "is_used" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "invitations" ADD COLUMN "used_at" TIMESTAMP(3);
ALTER TABLE "invitations" ADD COLUMN "used_by_user_id" TEXT;
ALTER TABLE "invitations" ADD COLUMN "used_by_user_name" TEXT;

-- Add missing fields to users table
ALTER TABLE "users" ADD COLUMN "avatar" TEXT;
ALTER TABLE "users" ADD COLUMN "bio" TEXT;
ALTER TABLE "users" ADD COLUMN "birth_date" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "password_changed_at" TIMESTAMP(3);

-- Add missing fields to budgets table
ALTER TABLE "budgets" ADD COLUMN "name" TEXT NOT NULL DEFAULT '预算';
ALTER TABLE "budgets" ADD COLUMN "account_book_id" TEXT;
ALTER TABLE "budgets" ADD COLUMN "is_auto_calculated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "budgets" ADD COLUMN "enable_category_budget" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "budgets" ADD COLUMN "rollover_amount" DECIMAL(10,2);
ALTER TABLE "budgets" ADD COLUMN "budget_type" TEXT NOT NULL DEFAULT 'PERSONAL';
ALTER TABLE "budgets" ADD COLUMN "amount_modified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "budgets" ADD COLUMN "last_amount_modified_at" TIMESTAMP(3);
ALTER TABLE "budgets" ADD COLUMN "family_member_id" TEXT;

-- Add missing fields to transactions table
ALTER TABLE "transactions" ADD COLUMN "account_book_id" TEXT;
ALTER TABLE "transactions" ADD COLUMN "budget_id" TEXT;

-- Add missing fields to categories table
ALTER TABLE "categories" ADD COLUMN "account_book_id" TEXT;
