-- CreateEnum
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RolloverType') THEN
        CREATE TYPE "RolloverType" AS ENUM ('SURPLUS', 'DEFICIT');
    END IF;
END $$;

-- CreateTable
CREATE TABLE "budget_histories" (
    "id" TEXT NOT NULL,
    "budget_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "type" "RolloverType" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_histories_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "budget_histories" ADD CONSTRAINT "budget_histories_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
