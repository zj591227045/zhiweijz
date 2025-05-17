-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "enable_category_budget" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rollover_amount" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "budget_id" TEXT;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
