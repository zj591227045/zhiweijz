-- =====================================================
-- 9月份个人预算创建和结转修复脚本
-- =====================================================
-- 
-- 功能：
-- 1. 为所有用户创建缺失的2025年9月个人预算
-- 2. 为所有托管用户创建缺失的2025年9月个人预算  
-- 3. 正确处理预算结转逻辑
-- 4. 创建相应的预算结转历史记录
--
-- 使用方法：
-- psql -h 数据库地址 -U 用户名 -d 数据库名 < fix_september_budget_creation.sql
-- 
-- 注意：此脚本基于docker-compose.yml中的数据库配置
-- =====================================================

-- 开始事务
BEGIN;

-- 设置时区为北京时间
SET timezone = 'Asia/Shanghai';

-- 创建临时函数来生成UUID
CREATE OR REPLACE FUNCTION temp_generate_uuid() RETURNS TEXT AS $$
BEGIN
    RETURN gen_random_uuid()::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 创建临时函数来计算已支出金额
CREATE OR REPLACE FUNCTION temp_calculate_spent_amount(budget_id_param TEXT) RETURNS DECIMAL AS $$
DECLARE
    spent_amount DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO spent_amount
    FROM transactions 
    WHERE budget_id = budget_id_param AND type = 'EXPENSE';
    
    RETURN spent_amount;
END;
$$ LANGUAGE plpgsql;

-- 创建临时函数来检查是否存在结转历史记录
CREATE OR REPLACE FUNCTION temp_has_rollover_history(budget_id_param TEXT, period_param TEXT) RETURNS BOOLEAN AS $$
DECLARE
    history_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM budget_histories 
        WHERE budget_id = budget_id_param 
          AND period = period_param 
          AND type IN ('SURPLUS', 'DEFICIT')
    ) INTO history_exists;
    
    RETURN history_exists;
END;
$$ LANGUAGE plpgsql;

-- 定义9月份的时间范围
DO $$
DECLARE
    september_start DATE := '2025-09-01';
    september_end DATE := '2025-09-30';
    august_start DATE := '2025-08-01';
    august_end DATE := '2025-08-31';
    
    user_record RECORD;
    latest_budget RECORD;
    new_budget_id TEXT;
    rollover_amount DECIMAL(10,2);
    spent_amount DECIMAL(10,2);
    total_available DECIMAL(10,2);
    
    processed_users INTEGER := 0;
    created_budgets INTEGER := 0;
    skipped_budgets INTEGER := 0;
    created_histories INTEGER := 0;
    
BEGIN
    RAISE NOTICE '=== 9月份个人预算创建和结转修复脚本 ===';
    RAISE NOTICE '目标月份: % 到 %', september_start, september_end;
    RAISE NOTICE '';
    
    -- =====================================================
    -- 第一部分：处理注册用户的个人预算
    -- =====================================================
    RAISE NOTICE '开始处理注册用户的个人预算...';
    
    FOR user_record IN 
        SELECT DISTINCT
            u.id as user_id,
            u.name as user_name,
            u.email as user_email,
            ab.id as account_book_id,
            ab.name as account_book_name
        FROM users u
        JOIN account_books ab ON u.id = ab.user_id
        WHERE u.is_custodial = false  -- 只处理非托管用户
        ORDER BY u.name
    LOOP
        RAISE NOTICE '检查用户: % (%) - 账本: %', user_record.user_name, user_record.user_id, user_record.account_book_name;
        processed_users := processed_users + 1;
        
        -- 检查是否已存在9月份的个人预算
        IF EXISTS (
            SELECT 1 FROM budgets 
            WHERE user_id = user_record.user_id
              AND account_book_id = user_record.account_book_id
              AND budget_type = 'PERSONAL'
              AND period = 'MONTHLY'
              AND start_date >= september_start
              AND start_date <= september_start
        ) THEN
            RAISE NOTICE '  ✅ 已存在9月份预算，跳过';
            skipped_budgets := skipped_budgets + 1;
            CONTINUE;
        END IF;
        
        -- 查找最新的个人预算作为模板
        SELECT * INTO latest_budget
        FROM budgets 
        WHERE user_id = user_record.user_id
          AND account_book_id = user_record.account_book_id
          AND budget_type = 'PERSONAL'
          AND period = 'MONTHLY'
        ORDER BY end_date DESC
        LIMIT 1;
        
        IF latest_budget IS NULL THEN
            RAISE NOTICE '  ⚠️  没有找到历史预算，无法创建';
            skipped_budgets := skipped_budgets + 1;
            CONTINUE;
        END IF;
        
        RAISE NOTICE '  📋 基于预算: % (结束日期: %)', latest_budget.name, latest_budget.end_date;
        
        -- 计算结转金额（如果启用了结转）
        rollover_amount := 0;
        IF latest_budget.rollover THEN
            -- 计算上个预算的已支出金额
            spent_amount := temp_calculate_spent_amount(latest_budget.id);
            
            -- 计算结转金额：预算金额 + 上次结转金额 - 已支出金额
            total_available := latest_budget.amount + COALESCE(latest_budget.rollover_amount, 0);
            rollover_amount := total_available - spent_amount;
            
            RAISE NOTICE '    💰 结转计算: 预算% + 上次结转% - 已支出% = 结转%', 
                latest_budget.amount, 
                COALESCE(latest_budget.rollover_amount, 0), 
                spent_amount, 
                rollover_amount;
                
            -- 为8月份预算创建结转历史记录（如果需要）
            IF latest_budget.end_date >= august_start AND latest_budget.end_date <= august_end THEN
                IF NOT temp_has_rollover_history(latest_budget.id, '2025-8') THEN
                    INSERT INTO budget_histories (
                        id,
                        budget_id,
                        user_id,
                        period,
                        amount,
                        type,
                        description,
                        budget_amount,
                        spent_amount,
                        previous_rollover,
                        created_at,
                        updated_at
                    ) VALUES (
                        temp_generate_uuid(),
                        latest_budget.id,
                        user_record.user_id,
                        '2025-8',
                        ABS(rollover_amount),
                        CASE WHEN rollover_amount >= 0 THEN 'SURPLUS'::"RolloverType" ELSE 'DEFICIT'::"RolloverType" END,
                        CASE WHEN rollover_amount >= 0 THEN '余额结转: ' ELSE '债务结转: ' END || 
                        '基础预算' || latest_budget.amount || 
                        ', 上期结转' || COALESCE(latest_budget.rollover_amount, 0) || 
                        ', 实际支出' || spent_amount || 
                        ', 结转金额' || rollover_amount,
                        latest_budget.amount,
                        spent_amount,
                        COALESCE(latest_budget.rollover_amount, 0),
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    );
                    created_histories := created_histories + 1;
                    RAISE NOTICE '    📝 创建8月结转历史记录';
                END IF;
            END IF;
        END IF;
        
        -- 生成新预算ID
        new_budget_id := temp_generate_uuid();
        
        -- 创建9月份预算
        INSERT INTO budgets (
            id,
            name,
            amount,
            period,
            start_date,
            end_date,
            budget_type,
            rollover,
            rollover_amount,
            refresh_day,
            user_id,
            account_book_id,
            family_id,
            is_auto_calculated,
            enable_category_budget,
            amount_modified,
            created_at,
            updated_at
        ) VALUES (
            new_budget_id,
            latest_budget.name,
            latest_budget.amount,
            'MONTHLY',
            september_start,
            september_end,
            'PERSONAL',
            latest_budget.rollover,
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE NULL END,
            COALESCE(latest_budget.refresh_day, 1),
            user_record.user_id,
            user_record.account_book_id,
            latest_budget.family_id,
            COALESCE(latest_budget.is_auto_calculated, false),
            COALESCE(latest_budget.enable_category_budget, false),
            COALESCE(latest_budget.amount_modified, false),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE '  ✅ 成功创建9月预算: % (ID: %)', latest_budget.name, new_budget_id;
        RAISE NOTICE '      金额: %, 结转: %', latest_budget.amount, 
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE 0 END;
        RAISE NOTICE '';
        
        created_budgets := created_budgets + 1;
        
    END LOOP;
    
    RAISE NOTICE '注册用户预算处理完成: 处理%个用户，创建%个预算，跳过%个', processed_users, created_budgets, skipped_budgets;
    RAISE NOTICE '';
    
    -- 重置计数器，准备处理托管用户
    processed_users := 0;
    created_budgets := 0;
    skipped_budgets := 0;
    
    -- =====================================================
    -- 第二部分：处理托管用户的个人预算
    -- =====================================================
    RAISE NOTICE '开始处理托管用户的个人预算...';
    
    FOR user_record IN 
        SELECT DISTINCT
            u.id as user_id,
            u.name as user_name,
            u.email as user_email,
            ab.id as account_book_id,
            ab.name as account_book_name
        FROM users u
        JOIN account_books ab ON u.id = ab.user_id
        WHERE u.is_custodial = true  -- 只处理托管用户
        ORDER BY u.name
    LOOP
        RAISE NOTICE '检查托管用户: % (%) - 账本: %', user_record.user_name, user_record.user_id, user_record.account_book_name;
        processed_users := processed_users + 1;
        
        -- 检查是否已存在9月份的个人预算
        IF EXISTS (
            SELECT 1 FROM budgets 
            WHERE user_id = user_record.user_id
              AND account_book_id = user_record.account_book_id
              AND budget_type = 'PERSONAL'
              AND period = 'MONTHLY'
              AND start_date >= september_start
              AND start_date <= september_start
        ) THEN
            RAISE NOTICE '  ✅ 已存在9月份预算，跳过';
            skipped_budgets := skipped_budgets + 1;
            CONTINUE;
        END IF;
        
        -- 查找最新的个人预算作为模板
        SELECT * INTO latest_budget
        FROM budgets 
        WHERE user_id = user_record.user_id
          AND account_book_id = user_record.account_book_id
          AND budget_type = 'PERSONAL'
          AND period = 'MONTHLY'
        ORDER BY end_date DESC
        LIMIT 1;
        
        IF latest_budget IS NULL THEN
            RAISE NOTICE '  ⚠️  没有找到历史预算，无法创建';
            skipped_budgets := skipped_budgets + 1;
            CONTINUE;
        END IF;
        
        RAISE NOTICE '  📋 基于预算: % (结束日期: %)', latest_budget.name, latest_budget.end_date;
        
        -- 计算结转金额（如果启用了结转）
        rollover_amount := 0;
        IF latest_budget.rollover THEN
            -- 计算上个预算的已支出金额
            spent_amount := temp_calculate_spent_amount(latest_budget.id);
            
            -- 计算结转金额：预算金额 + 上次结转金额 - 已支出金额
            total_available := latest_budget.amount + COALESCE(latest_budget.rollover_amount, 0);
            rollover_amount := total_available - spent_amount;
            
            RAISE NOTICE '    💰 结转计算: 预算% + 上次结转% - 已支出% = 结转%', 
                latest_budget.amount, 
                COALESCE(latest_budget.rollover_amount, 0), 
                spent_amount, 
                rollover_amount;
        END IF;
        
        -- 生成新预算ID
        new_budget_id := temp_generate_uuid();
        
        -- 创建9月份预算
        INSERT INTO budgets (
            id,
            name,
            amount,
            period,
            start_date,
            end_date,
            budget_type,
            rollover,
            rollover_amount,
            refresh_day,
            user_id,
            account_book_id,
            family_id,
            is_auto_calculated,
            enable_category_budget,
            amount_modified,
            created_at,
            updated_at
        ) VALUES (
            new_budget_id,
            latest_budget.name,
            latest_budget.amount,
            'MONTHLY',
            september_start,
            september_end,
            'PERSONAL',
            latest_budget.rollover,
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE NULL END,
            COALESCE(latest_budget.refresh_day, 1),
            user_record.user_id,
            user_record.account_book_id,
            latest_budget.family_id,
            COALESCE(latest_budget.is_auto_calculated, false),
            COALESCE(latest_budget.enable_category_budget, false),
            COALESCE(latest_budget.amount_modified, false),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE '  ✅ 成功创建9月预算: % (ID: %)', latest_budget.name, new_budget_id;
        RAISE NOTICE '      金额: %, 结转: %', latest_budget.amount, 
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE 0 END;
        RAISE NOTICE '';
        
        created_budgets := created_budgets + 1;
        
    END LOOP;
    
    RAISE NOTICE '托管用户预算处理完成: 处理%个用户，创建%个预算，跳过%个', processed_users, created_budgets, skipped_budgets;
    RAISE NOTICE '';
    
END $$;

-- 清理临时函数
DROP FUNCTION IF EXISTS temp_generate_uuid();
DROP FUNCTION IF EXISTS temp_calculate_spent_amount(TEXT);
DROP FUNCTION IF EXISTS temp_has_rollover_history(TEXT, TEXT);

-- 显示最终统计
DO $$
DECLARE
    total_september_budgets INTEGER;
    total_users INTEGER;
    total_custodial_users INTEGER;
BEGIN
    -- 统计9月份预算总数
    SELECT COUNT(*) INTO total_september_budgets
    FROM budgets
    WHERE start_date >= '2025-09-01'
      AND start_date <= '2025-09-01'
      AND budget_type = 'PERSONAL'
      AND period = 'MONTHLY';
    
    -- 统计用户总数
    SELECT COUNT(*) INTO total_users
    FROM users
    WHERE is_custodial = false;
    
    -- 统计托管用户总数
    SELECT COUNT(*) INTO total_custodial_users
    FROM users
    WHERE is_custodial = true;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 最终统计结果 ===';
    RAISE NOTICE '注册用户总数: %', total_users;
    RAISE NOTICE '托管用户总数: %', total_custodial_users;
    RAISE NOTICE '9月份个人预算总数: %', total_september_budgets;
    RAISE NOTICE '';
    
    IF total_september_budgets > 0 THEN
        RAISE NOTICE '🎉 9月份预算创建修复完成！';
    ELSE
        RAISE NOTICE '⚠️  没有创建任何9月份预算，请检查数据';
    END IF;
    
END $$;

-- 提交事务
COMMIT;

    -- 重置计数器，准备处理托管成员
    processed_users := 0;
    created_budgets := 0;
    skipped_budgets := 0;

    -- =====================================================
    -- 第三部分：处理托管成员（family_members）的个人预算
    -- =====================================================
    RAISE NOTICE '开始处理托管成员的个人预算...';

    FOR user_record IN
        SELECT DISTINCT
            fm.id as member_id,
            fm.name as member_name,
            fm.family_id,
            ab.id as account_book_id,
            ab.name as account_book_name,
            ab.user_id as main_user_id
        FROM family_members fm
        JOIN families f ON fm.family_id = f.id
        JOIN account_books ab ON f.id = ab.family_id
        WHERE fm.is_custodial = true
          AND ab.type = 'FAMILY'
        ORDER BY fm.name, ab.name
    LOOP
        RAISE NOTICE '检查托管成员: % (%) - 账本: %', user_record.member_name, user_record.member_id, user_record.account_book_name;
        processed_users := processed_users + 1;

        -- 检查是否已存在9月份的个人预算
        IF EXISTS (
            SELECT 1 FROM budgets
            WHERE family_member_id = user_record.member_id
              AND account_book_id = user_record.account_book_id
              AND budget_type = 'PERSONAL'
              AND period = 'MONTHLY'
              AND start_date >= september_start
              AND start_date <= september_start
        ) THEN
            RAISE NOTICE '  ✅ 已存在9月份预算，跳过';
            skipped_budgets := skipped_budgets + 1;
            CONTINUE;
        END IF;

        -- 查找最新的个人预算作为模板
        SELECT * INTO latest_budget
        FROM budgets
        WHERE family_member_id = user_record.member_id
          AND account_book_id = user_record.account_book_id
          AND budget_type = 'PERSONAL'
          AND period = 'MONTHLY'
        ORDER BY end_date DESC
        LIMIT 1;

        IF latest_budget IS NULL THEN
            RAISE NOTICE '  ⚠️  没有找到历史预算，无法创建';
            skipped_budgets := skipped_budgets + 1;
            CONTINUE;
        END IF;

        RAISE NOTICE '  📋 基于预算: % (结束日期: %)', latest_budget.name, latest_budget.end_date;

        -- 计算结转金额（如果启用了结转）
        rollover_amount := 0;
        IF latest_budget.rollover THEN
            -- 计算上个预算的已支出金额
            spent_amount := temp_calculate_spent_amount(latest_budget.id);

            -- 计算结转金额：预算金额 + 上次结转金额 - 已支出金额
            total_available := latest_budget.amount + COALESCE(latest_budget.rollover_amount, 0);
            rollover_amount := total_available - spent_amount;

            RAISE NOTICE '    💰 结转计算: 预算% + 上次结转% - 已支出% = 结转%',
                latest_budget.amount,
                COALESCE(latest_budget.rollover_amount, 0),
                spent_amount,
                rollover_amount;

            -- 为8月份预算创建结转历史记录（如果需要）
            IF latest_budget.end_date >= august_start AND latest_budget.end_date <= august_end THEN
                IF NOT temp_has_rollover_history(latest_budget.id, '2025-8') THEN
                    INSERT INTO budget_histories (
                        id,
                        budget_id,
                        user_id,
                        period,
                        amount,
                        type,
                        description,
                        budget_amount,
                        spent_amount,
                        previous_rollover,
                        created_at,
                        updated_at
                    ) VALUES (
                        temp_generate_uuid(),
                        latest_budget.id,
                        user_record.member_id,  -- 对于托管成员使用member_id
                        '2025-8',
                        ABS(rollover_amount),
                        CASE WHEN rollover_amount >= 0 THEN 'SURPLUS'::"RolloverType" ELSE 'DEFICIT'::"RolloverType" END,
                        CASE WHEN rollover_amount >= 0 THEN '余额结转: ' ELSE '债务结转: ' END ||
                        '基础预算' || latest_budget.amount ||
                        ', 上期结转' || COALESCE(latest_budget.rollover_amount, 0) ||
                        ', 实际支出' || spent_amount ||
                        ', 结转金额' || rollover_amount,
                        latest_budget.amount,
                        spent_amount,
                        COALESCE(latest_budget.rollover_amount, 0),
                        CURRENT_TIMESTAMP,
                        CURRENT_TIMESTAMP
                    );
                    created_histories := created_histories + 1;
                    RAISE NOTICE '    📝 创建8月结转历史记录';
                END IF;
            END IF;
        END IF;

        -- 生成新预算ID
        new_budget_id := temp_generate_uuid();

        -- 创建9月份预算
        INSERT INTO budgets (
            id,
            name,
            amount,
            period,
            start_date,
            end_date,
            budget_type,
            rollover,
            rollover_amount,
            refresh_day,
            user_id,
            account_book_id,
            family_member_id,
            family_id,
            is_auto_calculated,
            enable_category_budget,
            amount_modified,
            created_at,
            updated_at
        ) VALUES (
            new_budget_id,
            latest_budget.name,
            latest_budget.amount,
            'MONTHLY',
            september_start,
            september_end,
            'PERSONAL',
            latest_budget.rollover,
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE NULL END,
            COALESCE(latest_budget.refresh_day, 1),
            user_record.main_user_id,
            user_record.account_book_id,
            user_record.member_id,
            user_record.family_id,
            COALESCE(latest_budget.is_auto_calculated, false),
            COALESCE(latest_budget.enable_category_budget, false),
            COALESCE(latest_budget.amount_modified, false),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );

        RAISE NOTICE '  ✅ 成功创建9月预算: % (ID: %)', latest_budget.name, new_budget_id;
        RAISE NOTICE '      金额: %, 结转: %', latest_budget.amount,
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE 0 END;
        RAISE NOTICE '';

        created_budgets := created_budgets + 1;

    END LOOP;

    RAISE NOTICE '托管成员预算处理完成: 处理%个成员，创建%个预算，跳过%个', processed_users, created_budgets, skipped_budgets;
    RAISE NOTICE '';

END $$;

-- 清理临时函数
DROP FUNCTION IF EXISTS temp_generate_uuid();
DROP FUNCTION IF EXISTS temp_calculate_spent_amount(TEXT);
DROP FUNCTION IF EXISTS temp_has_rollover_history(TEXT, TEXT);

-- 显示最终统计
DO $$
DECLARE
    total_september_budgets INTEGER;
    total_users INTEGER;
    total_custodial_users INTEGER;
    total_custodial_members INTEGER;
BEGIN
    -- 统计9月份预算总数
    SELECT COUNT(*) INTO total_september_budgets
    FROM budgets
    WHERE start_date >= '2025-09-01'
      AND start_date <= '2025-09-01'
      AND budget_type = 'PERSONAL'
      AND period = 'MONTHLY';

    -- 统计用户总数
    SELECT COUNT(*) INTO total_users
    FROM users
    WHERE is_custodial = false;

    -- 统计托管用户总数
    SELECT COUNT(*) INTO total_custodial_users
    FROM users
    WHERE is_custodial = true;

    -- 统计托管成员总数
    SELECT COUNT(*) INTO total_custodial_members
    FROM family_members
    WHERE is_custodial = true;

    RAISE NOTICE '';
    RAISE NOTICE '=== 最终统计结果 ===';
    RAISE NOTICE '注册用户总数: %', total_users;
    RAISE NOTICE '托管用户总数: %', total_custodial_users;
    RAISE NOTICE '托管成员总数: %', total_custodial_members;
    RAISE NOTICE '9月份个人预算总数: %', total_september_budgets;
    RAISE NOTICE '';

    IF total_september_budgets > 0 THEN
        RAISE NOTICE '🎉 9月份预算创建修复完成！';
    ELSE
        RAISE NOTICE '⚠️  没有创建任何9月份预算，请检查数据';
    END IF;

END $$;

-- 提交事务
COMMIT;

-- 显示验证查询建议
\echo ''
\echo '=== 验证查询建议 ==='
\echo '1. 检查9月份用户预算创建情况：'
\echo ''
\echo 'SELECT '
\echo '  u.name as 用户名,'
\echo '  u.is_custodial as 是否托管,'
\echo '  ab.name as 账本名称,'
\echo '  b.name as 预算名称,'
\echo '  b.amount as 预算金额,'
\echo '  b.rollover_amount as 结转金额,'
\echo '  b.start_date as 开始日期,'
\echo '  b.end_date as 结束日期'
\echo 'FROM budgets b'
\echo 'JOIN users u ON b.user_id = u.id'
\echo 'JOIN account_books ab ON b.account_book_id = ab.id'
\echo 'WHERE b.start_date >= ''2025-09-01'''
\echo '  AND b.start_date <= ''2025-09-01'''
\echo '  AND b.budget_type = ''PERSONAL'''
\echo '  AND b.period = ''MONTHLY'''
\echo 'ORDER BY u.is_custodial, u.name;'
\echo ''
\echo '2. 检查9月份托管成员预算创建情况：'
\echo ''
\echo 'SELECT '
\echo '  fm.name as 托管成员名,'
\echo '  ab.name as 账本名称,'
\echo '  b.name as 预算名称,'
\echo '  b.amount as 预算金额,'
\echo '  b.rollover_amount as 结转金额,'
\echo '  b.start_date as 开始日期,'
\echo '  b.end_date as 结束日期'
\echo 'FROM budgets b'
\echo 'JOIN family_members fm ON b.family_member_id = fm.id'
\echo 'JOIN account_books ab ON b.account_book_id = ab.id'
\echo 'WHERE b.start_date >= ''2025-09-01'''
\echo '  AND b.start_date <= ''2025-09-01'''
\echo '  AND b.budget_type = ''PERSONAL'''
\echo '  AND b.period = ''MONTHLY'''
\echo '  AND fm.is_custodial = true'
\echo 'ORDER BY fm.name;'
\echo ''
\echo '3. 检查结转历史记录：'
\echo ''
\echo 'SELECT '
\echo '  bh.period as 期间,'
\echo '  bh.type as 类型,'
\echo '  bh.amount as 结转金额,'
\echo '  bh.description as 描述,'
\echo '  bh.created_at as 创建时间'
\echo 'FROM budget_histories bh'
\echo 'WHERE bh.period = ''2025-8'''
\echo '  AND bh.type IN (''SURPLUS'', ''DEFICIT'')'
\echo 'ORDER BY bh.created_at DESC;'
