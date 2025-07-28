-- 添加预算唯一性约束迁移
-- 防止同一用户在同一账本的同一时间周期内创建多个相同类型的预算
-- 日期: 2025-07-17

-- 首先清理重复的预算记录 - 使用简化的方式
-- 创建临时表来标识需要保留的记录
CREATE TEMP TABLE budgets_to_keep AS
SELECT DISTINCT ON (user_id, account_book_id, budget_type, period, start_date, COALESCE(family_member_id, ''))
    id
FROM budgets
WHERE user_id IS NOT NULL
  AND account_book_id IS NOT NULL
ORDER BY user_id, account_book_id, budget_type, period, start_date, COALESCE(family_member_id, ''), created_at DESC;

-- 删除重复的预算记录（保留最新的）
DELETE FROM budgets
WHERE user_id IS NOT NULL
  AND account_book_id IS NOT NULL
  AND id NOT IN (SELECT id FROM budgets_to_keep);

-- 清理临时表
DROP TABLE budgets_to_keep;

-- 添加唯一性约束
-- 注意：PostgreSQL的UNIQUE约束会将NULL值视为不同的值，这正是我们需要的行为
-- 因为不同的family_member_id（包括NULL）应该被视为不同的预算
ALTER TABLE budgets
ADD CONSTRAINT unique_user_budget_period
UNIQUE (user_id, account_book_id, budget_type, period, start_date, family_member_id);

-- 验证约束是否添加成功
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'unique_user_budget_period' 
          AND table_name = 'budgets'
    ) THEN
        RAISE NOTICE '✅ 预算唯一性约束添加成功';
    ELSE
        RAISE EXCEPTION '❌ 预算唯一性约束添加失败';
    END IF;
END $$;
