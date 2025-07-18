-- 为test13@test.com用户生成过去3个月的预算和交易数据
-- 用于测试跨月个人预算聚合功能

-- 首先查找test13用户的信息
DO $$
DECLARE
    test_user_id TEXT;
    test_account_book_id TEXT;
    food_category_id TEXT;
    transport_category_id TEXT;
    entertainment_category_id TEXT;
    shopping_category_id TEXT;
    current_month_start DATE;
    last_month_start DATE;
    two_months_ago_start DATE;
    current_month_end DATE;
    last_month_end DATE;
    two_months_ago_end DATE;
BEGIN
    -- 获取test13用户ID
    SELECT id INTO test_user_id FROM users WHERE email = 'test13@test.com';
    
    IF test_user_id IS NULL THEN
        RAISE EXCEPTION 'test13@test.com 用户不存在';
    END IF;
    
    RAISE NOTICE '找到用户ID: %', test_user_id;
    
    -- 获取用户的默认账本ID
    SELECT id INTO test_account_book_id 
    FROM account_books 
    WHERE user_id = test_user_id 
    ORDER BY is_default DESC, created_at ASC 
    LIMIT 1;
    
    IF test_account_book_id IS NULL THEN
        RAISE EXCEPTION 'test13用户没有账本';
    END IF;
    
    RAISE NOTICE '找到账本ID: %', test_account_book_id;
    
    -- 获取分类ID（使用默认分类）
    SELECT id INTO food_category_id FROM categories WHERE name = '餐饮' AND is_default = true LIMIT 1;
    SELECT id INTO transport_category_id FROM categories WHERE name = '交通' AND is_default = true LIMIT 1;
    SELECT id INTO entertainment_category_id FROM categories WHERE name = '娱乐' AND is_default = true LIMIT 1;
    SELECT id INTO shopping_category_id FROM categories WHERE name = '购物' AND is_default = true LIMIT 1;
    
    -- 如果没有找到默认分类，使用第一个支出分类
    IF food_category_id IS NULL THEN
        SELECT id INTO food_category_id FROM categories WHERE type = 'EXPENSE' LIMIT 1;
    END IF;
    IF transport_category_id IS NULL THEN
        SELECT id INTO transport_category_id FROM categories WHERE type = 'EXPENSE' LIMIT 1;
    END IF;
    IF entertainment_category_id IS NULL THEN
        SELECT id INTO entertainment_category_id FROM categories WHERE type = 'EXPENSE' LIMIT 1;
    END IF;
    IF shopping_category_id IS NULL THEN
        SELECT id INTO shopping_category_id FROM categories WHERE type = 'EXPENSE' LIMIT 1;
    END IF;
    
    RAISE NOTICE '分类ID - 餐饮: %, 交通: %, 娱乐: %, 购物: %', 
        food_category_id, transport_category_id, entertainment_category_id, shopping_category_id;
    
    -- 计算月份范围
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    current_month_end := current_month_start + INTERVAL '1 month' - INTERVAL '1 day';
    
    last_month_start := current_month_start - INTERVAL '1 month';
    last_month_end := last_month_start + INTERVAL '1 month' - INTERVAL '1 day';
    
    two_months_ago_start := last_month_start - INTERVAL '1 month';
    two_months_ago_end := two_months_ago_start + INTERVAL '1 month' - INTERVAL '1 day';
    
    RAISE NOTICE '时间范围 - 当前月: % 到 %, 上月: % 到 %, 前月: % 到 %', 
        current_month_start, current_month_end, 
        last_month_start, last_month_end,
        two_months_ago_start, two_months_ago_end;
    
    -- 删除已存在的测试数据（避免重复）
    DELETE FROM transactions 
    WHERE user_id = test_user_id 
    AND date >= two_months_ago_start 
    AND date <= current_month_end;
    
    DELETE FROM budgets 
    WHERE user_id = test_user_id 
    AND start_date >= two_months_ago_start 
    AND end_date <= current_month_end;
    
    -- 创建3个月的个人预算
    -- 当前月预算
    INSERT INTO budgets (
        id, name, amount, period, start_date, end_date, 
        user_id, account_book_id, budget_type, 
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        'test13个人预算',
        3000.00,
        'MONTHLY',
        current_month_start,
        current_month_end,
        test_user_id,
        test_account_book_id,
        'PERSONAL',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
    
    -- 上月预算
    INSERT INTO budgets (
        id, name, amount, period, start_date, end_date, 
        user_id, account_book_id, budget_type, 
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        'test13个人预算',
        3000.00,
        'MONTHLY',
        last_month_start,
        last_month_end,
        test_user_id,
        test_account_book_id,
        'PERSONAL',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
    
    -- 前月预算
    INSERT INTO budgets (
        id, name, amount, period, start_date, end_date, 
        user_id, account_book_id, budget_type, 
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        'test13个人预算',
        3000.00,
        'MONTHLY',
        two_months_ago_start,
        two_months_ago_end,
        test_user_id,
        test_account_book_id,
        'PERSONAL',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
    );
    
    RAISE NOTICE '已创建3个月的预算数据';
    
    -- 生成当前月的交易数据（已花费 ¥176）
    INSERT INTO transactions (
        id, amount, type, category_id, description, date, 
        user_id, account_book_id, created_at, updated_at
    ) VALUES 
    (gen_random_uuid(), 45.50, 'EXPENSE', food_category_id, '午餐', current_month_start + INTERVAL '2 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 12.00, 'EXPENSE', transport_category_id, '地铁', current_month_start + INTERVAL '3 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 68.80, 'EXPENSE', food_category_id, '晚餐', current_month_start + INTERVAL '5 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 25.00, 'EXPENSE', entertainment_category_id, '电影票', current_month_start + INTERVAL '7 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 24.70, 'EXPENSE', transport_category_id, '打车', current_month_start + INTERVAL '8 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    
    -- 生成上月的交易数据（已花费 ¥2,450）
    INSERT INTO transactions (
        id, amount, type, category_id, description, date, 
        user_id, account_book_id, created_at, updated_at
    ) VALUES 
    (gen_random_uuid(), 580.00, 'EXPENSE', shopping_category_id, '购买衣服', last_month_start + INTERVAL '3 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 320.50, 'EXPENSE', food_category_id, '聚餐', last_month_start + INTERVAL '5 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 150.00, 'EXPENSE', entertainment_category_id, '健身房', last_month_start + INTERVAL '8 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 89.90, 'EXPENSE', transport_category_id, '加油', last_month_start + INTERVAL '10 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 245.60, 'EXPENSE', food_category_id, '超市购物', last_month_start + INTERVAL '12 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 180.00, 'EXPENSE', entertainment_category_id, 'KTV', last_month_start + INTERVAL '15 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 420.00, 'EXPENSE', shopping_category_id, '电子产品', last_month_start + INTERVAL '18 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 95.50, 'EXPENSE', food_category_id, '外卖', last_month_start + INTERVAL '20 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 68.50, 'EXPENSE', transport_category_id, '公交月票', last_month_start + INTERVAL '22 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 300.00, 'EXPENSE', entertainment_category_id, '旅游', last_month_start + INTERVAL '25 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    
    -- 生成前月的交易数据（已花费 ¥2,780）
    INSERT INTO transactions (
        id, amount, type, category_id, description, date, 
        user_id, account_book_id, created_at, updated_at
    ) VALUES 
    (gen_random_uuid(), 650.00, 'EXPENSE', shopping_category_id, '家具', two_months_ago_start + INTERVAL '2 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 280.30, 'EXPENSE', food_category_id, '生日聚餐', two_months_ago_start + INTERVAL '4 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 120.00, 'EXPENSE', transport_category_id, '火车票', two_months_ago_start + INTERVAL '6 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 380.50, 'EXPENSE', entertainment_category_id, '演唱会', two_months_ago_start + INTERVAL '8 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 195.80, 'EXPENSE', food_category_id, '日常餐饮', two_months_ago_start + INTERVAL '10 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 450.00, 'EXPENSE', shopping_category_id, '护肤品', two_months_ago_start + INTERVAL '12 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 85.40, 'EXPENSE', transport_category_id, '滴滴出行', two_months_ago_start + INTERVAL '14 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 220.00, 'EXPENSE', entertainment_category_id, '游戏充值', two_months_ago_start + INTERVAL '16 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 168.90, 'EXPENSE', food_category_id, '咖啡店', two_months_ago_start + INTERVAL '18 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 320.00, 'EXPENSE', shopping_category_id, '书籍', two_months_ago_start + INTERVAL '20 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    (gen_random_uuid(), 99.10, 'EXPENSE', transport_category_id, '停车费', two_months_ago_start + INTERVAL '22 days', test_user_id, test_account_book_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
    
    RAISE NOTICE '已生成3个月的交易数据';
    RAISE NOTICE '当前月支出: ¥176.00 (预算剩余: ¥2,824.00)';
    RAISE NOTICE '上月支出: ¥2,450.00 (预算剩余: ¥550.00)';
    RAISE NOTICE '前月支出: ¥2,780.00 (预算超支: ¥220.00)';
    RAISE NOTICE '3个月总预算: ¥9,000.00, 总支出: ¥5,406.00, 总剩余: ¥3,594.00';
    
END $$;
