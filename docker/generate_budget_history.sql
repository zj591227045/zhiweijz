-- 为用户 bc5b8f6e-332f-4bca-8044-59fc475d3096 生成最近三个月的预算历史记录
-- 生成模拟的预算结转信息

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 开始事务
BEGIN;

-- 第一步：为 budget_histories 表添加用户级别字段
ALTER TABLE budget_histories
ADD COLUMN IF NOT EXISTS user_id TEXT,
ADD COLUMN IF NOT EXISTS account_book_id TEXT,
ADD COLUMN IF NOT EXISTS budget_type TEXT DEFAULT 'PERSONAL';

-- 为现有记录补充用户信息
UPDATE budget_histories
SET user_id = b.user_id,
    account_book_id = b.account_book_id,
    budget_type = COALESCE(b.budget_type::TEXT, 'PERSONAL')
FROM budgets b
WHERE budget_histories.budget_id = b.id
  AND budget_histories.user_id IS NULL;

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_budget_histories_user_account
ON budget_histories(user_id, account_book_id, budget_type, created_at DESC);

-- 为2025年4月生成预算历史记录
-- 假设4月份有一个1800元的预算，实际花费1650元，结余150元
INSERT INTO budget_histories (
    id,
    budget_id,
    period,
    amount,
    type,
    description,
    created_at,
    updated_at,
    budget_amount,
    spent_amount,
    previous_rollover,
    user_id,
    account_book_id,
    budget_type
) VALUES (
    gen_random_uuid()::text,
    '2fc14785-c73e-4b5d-a275-6f2c707d0ddf', -- 使用现有的5月预算ID作为参考
    '2025年4月',
    150.00,
    'SURPLUS',
    '4月份预算结余，控制支出良好',
    '2025-04-30 23:59:59',
    '2025-04-30 23:59:59',
    1800.00,
    1650.00,
    0.00,
    'bc5b8f6e-332f-4bca-8044-59fc475d3096',
    (SELECT account_book_id FROM budgets WHERE id = '2fc14785-c73e-4b5d-a275-6f2c707d0ddf'),
    'PERSONAL'
);

-- 为2025年5月生成预算历史记录
-- 基于实际数据：5月份支出1884.50元，预算1500-2000元
-- 第一个预算记录：1500元预算，超支384.50元
INSERT INTO budget_histories (
    id,
    budget_id,
    period,
    amount,
    type,
    description,
    created_at,
    updated_at,
    budget_amount,
    spent_amount,
    previous_rollover,
    user_id,
    account_book_id,
    budget_type
) VALUES (
    gen_random_uuid()::text,
    '2fc14785-c73e-4b5d-a275-6f2c707d0ddf',
    '2025年5月',
    -384.50,
    'DEFICIT',
    '5月份预算超支，需要控制支出',
    '2025-05-31 23:59:59',
    '2025-05-31 23:59:59',
    1500.00,
    1884.50,
    150.00,
    'bc5b8f6e-332f-4bca-8044-59fc475d3096',
    (SELECT account_book_id FROM budgets WHERE id = '2fc14785-c73e-4b5d-a275-6f2c707d0ddf'),
    'PERSONAL'
);

-- 第二个预算记录：2000元预算，结余115.50元
INSERT INTO budget_histories (
    id,
    budget_id,
    period,
    amount,
    type,
    description,
    created_at,
    updated_at,
    budget_amount,
    spent_amount,
    previous_rollover,
    user_id,
    account_book_id,
    budget_type
) VALUES (
    gen_random_uuid()::text,
    'a5849912-884d-4849-81cb-b738a59407a9',
    '2025年5月',
    115.50,
    'SURPLUS',
    '5月份预算结余，支出控制得当',
    '2025-05-31 23:59:59',
    '2025-05-31 23:59:59',
    2000.00,
    1884.50,
    0.00,
    'bc5b8f6e-332f-4bca-8044-59fc475d3096',
    (SELECT account_book_id FROM budgets WHERE id = 'a5849912-884d-4849-81cb-b738a59407a9'),
    'PERSONAL'
);

-- 为2025年6月生成预算历史记录（当前月份，部分数据）
-- 基于实际数据：6月份目前支出199元，预算2000元
INSERT INTO budget_histories (
    id,
    budget_id,
    period,
    amount,
    type,
    description,
    created_at,
    updated_at,
    budget_amount,
    spent_amount,
    previous_rollover,
    user_id,
    account_book_id,
    budget_type
) VALUES (
    gen_random_uuid()::text,
    '20c3e6b4-e40b-4317-9f59-d24112e09353',
    '2025年6月',
    1801.00,
    'SURPLUS',
    '6月份预算执行中，目前控制良好',
    '2025-06-15 12:00:00',
    '2025-06-15 12:00:00',
    2000.00,
    199.00,
    115.50,
    'bc5b8f6e-332f-4bca-8044-59fc475d3096',
    (SELECT account_book_id FROM budgets WHERE id = '20c3e6b4-e40b-4317-9f59-d24112e09353'),
    'PERSONAL'
);

-- 添加一些额外的历史记录以展示不同的预算管理情况

-- 3月份的历史记录（较早的记录）
INSERT INTO budget_histories (
    id,
    budget_id,
    period,
    amount,
    type,
    description,
    created_at,
    updated_at,
    budget_amount,
    spent_amount,
    previous_rollover,
    user_id,
    account_book_id,
    budget_type
) VALUES (
    gen_random_uuid()::text,
    '2fc14785-c73e-4b5d-a275-6f2c707d0ddf',
    '2025年3月',
    -50.00,
    'DEFICIT',
    '3月份预算轻微超支',
    '2025-03-31 23:59:59',
    '2025-03-31 23:59:59',
    1600.00,
    1650.00,
    0.00,
    'bc5b8f6e-332f-4bca-8044-59fc475d3096',
    (SELECT account_book_id FROM budgets WHERE id = '2fc14785-c73e-4b5d-a275-6f2c707d0ddf'),
    'PERSONAL'
);

-- 2月份的历史记录
INSERT INTO budget_histories (
    id,
    budget_id,
    period,
    amount,
    type,
    description,
    created_at,
    updated_at,
    budget_amount,
    spent_amount,
    previous_rollover,
    user_id,
    account_book_id,
    budget_type
) VALUES (
    gen_random_uuid()::text,
    '2fc14785-c73e-4b5d-a275-6f2c707d0ddf',
    '2025年2月',
    200.00,
    'SURPLUS',
    '2月份预算结余，春节期间控制支出',
    '2025-02-28 23:59:59',
    '2025-02-28 23:59:59',
    1500.00,
    1300.00,
    0.00,
    'bc5b8f6e-332f-4bca-8044-59fc475d3096',
    (SELECT account_book_id FROM budgets WHERE id = '2fc14785-c73e-4b5d-a275-6f2c707d0ddf'),
    'PERSONAL'
);

-- 提交事务
COMMIT;

-- 验证插入的数据（使用新的用户级别查询）
SELECT
    bh.period,
    bh.amount,
    bh.type,
    bh.description,
    bh.budget_amount,
    bh.spent_amount,
    bh.previous_rollover,
    bh.user_id,
    bh.account_book_id,
    bh.budget_type,
    bh.created_at
FROM budget_histories bh
WHERE bh.user_id = 'bc5b8f6e-332f-4bca-8044-59fc475d3096'
  AND bh.budget_type = 'PERSONAL'
ORDER BY bh.created_at DESC;
