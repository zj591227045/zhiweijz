-- AlterTable
ALTER TABLE "budgets" 
ADD COLUMN "amount_modified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "last_amount_modified_at" TIMESTAMP(3);
