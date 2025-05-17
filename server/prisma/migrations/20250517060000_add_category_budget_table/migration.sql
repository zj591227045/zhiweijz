-- 添加 isAutoCalculated 字段到 Budget 表
ALTER TABLE "budgets" ADD COLUMN "is_auto_calculated" BOOLEAN NOT NULL DEFAULT false;

-- 创建 CategoryBudget 表
CREATE TABLE "category_budgets" (
  "id" TEXT NOT NULL,
  "budget_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "spent" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "category_budgets_pkey" PRIMARY KEY ("id")
);

-- 添加外键约束
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 添加唯一约束，确保每个预算下每个分类只有一个预算
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_budget_id_category_id_key" UNIQUE ("budget_id", "category_id");
