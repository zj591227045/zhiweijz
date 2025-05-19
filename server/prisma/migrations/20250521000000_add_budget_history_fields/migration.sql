-- AlterTable
ALTER TABLE "budget_histories" 
ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "budget_amount" DECIMAL(10,2),
ADD COLUMN "spent_amount" DECIMAL(10,2),
ADD COLUMN "previous_rollover" DECIMAL(10,2);
