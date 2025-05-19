-- CreateEnum
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BudgetType') THEN
        CREATE TYPE "BudgetType" AS ENUM ('PERSONAL', 'GENERAL');
    END IF;
END $$;

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN IF NOT EXISTS "budget_type" "BudgetType" NOT NULL DEFAULT 'PERSONAL';
