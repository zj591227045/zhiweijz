-- 添加预算唯一性约束迁移
-- 防止同一用户在同一账本的同一时间周期内创建多个相同类型的预算
-- 日期: 2025-07-17

-- 首先清理重复的预算记录
DO $$
DECLARE
    duplicate_record RECORD;
    budget_ids_to_delete TEXT[];
BEGIN
    -- 查找重复的预算记录
    FOR duplicate_record IN
        SELECT
            user_id,
            account_book_id,
            budget_type,
            period,
            start_date,
            family_member_id,
            COUNT(*) as count,
            array_agg(id ORDER BY created_at DESC) as budget_ids
        FROM budgets
        WHERE user_id IS NOT NULL
          AND account_book_id IS NOT NULL
        GROUP BY user_id, account_book_id, budget_type, period, start_date, family_member_id
        HAVING COUNT(*) > 1
    LOOP
        -- 保留最新的一个（第一个），删除其余的
        budget_ids_to_delete := duplicate_record.budget_ids[2:];
        
        RAISE NOTICE '删除重复预算记录: 用户 %, 账本 %, 类型 %', 
            duplicate_record.user_id, 
            duplicate_record.account_book_id, 
            duplicate_record.budget_type;
        RAISE NOTICE '保留预算ID: %, 删除预算ID: %', 
            duplicate_record.budget_ids[1], 
            array_to_string(budget_ids_to_delete, ', ');

        -- 删除重复的预算记录
        DELETE FROM budgets WHERE id = ANY(budget_ids_to_delete);
    END LOOP;
END $$;

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
