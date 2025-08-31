-- =====================================================
-- 当月个人预算创建和结转修复脚本
-- =====================================================
-- 
-- 功能：
-- 1. 为所有注册用户创建缺失的当月个人预算
-- 2. 为所有家庭成员（非托管）创建缺失的当月个人预算
-- 3. 为所有托管成员创建缺失的当月个人预算
-- 4. 正确处理预算结转逻辑
-- 5. 创建相应的预算结转历史记录
--
-- 使用方法：
-- 1. 设置目标年月：\set target_year 2025 \set target_month 9
-- 2. 执行脚本：psql -h 数据库地址 -U 用户名 -d 数据库名 < fix_current_month_budget_creation.sql
-- 
-- 注意：此脚本基于docker/.env中的数据库配置
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

-- 定义目标月份的时间范围（可通过变量设置）
DO $$
DECLARE
    -- 目标年月（从环境变量或默认为当前月份）
    target_year_text TEXT := current_setting('app.target_year', true);
    target_month_text TEXT := current_setting('app.target_month', true);
    target_year INTEGER;
    target_month INTEGER;
    
    -- 计算目标月份和上个月的时间范围
    target_start DATE;
    target_end DATE;
    previous_start DATE;
    previous_end DATE;
    
    user_record RECORD;
    latest_budget RECORD;
    new_budget_id TEXT;
    rollover_amount DECIMAL(10,2);
    spent_amount DECIMAL(10,2);
    total_available DECIMAL(10,2);
    previous_period_str TEXT;
    
    processed_users INTEGER := 0;
    created_budgets INTEGER := 0;
    skipped_budgets INTEGER := 0;
    created_histories INTEGER := 0;
    
BEGIN
    -- 设置默认值（如果没有传入参数）
    IF target_year_text IS NULL OR target_year_text = '' THEN
        target_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    ELSE
        target_year := target_year_text::INTEGER;
    END IF;

    IF target_month_text IS NULL OR target_month_text = '' THEN
        target_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
    ELSE
        target_month := target_month_text::INTEGER;
    END IF;

    -- 计算目标月份的开始和结束日期
    target_start := DATE(target_year || '-' || LPAD(target_month::TEXT, 2, '0') || '-01');
    target_end := (target_start + INTERVAL '1 month - 1 day')::DATE;
    
    -- 计算上个月的开始和结束日期
    IF target_month = 1 THEN
        previous_start := DATE((target_year - 1) || '-12-01');
        previous_end := DATE((target_year - 1) || '-12-31');
        previous_period_str := (target_year - 1) || '-12';
    ELSE
        previous_start := DATE(target_year || '-' || LPAD((target_month - 1)::TEXT, 2, '0') || '-01');
        previous_end := (previous_start + INTERVAL '1 month - 1 day')::DATE;
        previous_period_str := target_year || '-' || (target_month - 1);
    END IF;
    
    RAISE NOTICE '=== 当月个人预算创建和结转修复脚本 ===';
    RAISE NOTICE '目标月份: %年%月 (% 到 %)', target_year, target_month, target_start, target_end;
    RAISE NOTICE '上个月份: % (% 到 %)', previous_period_str, previous_start, previous_end;
    RAISE NOTICE '';
    
    -- =====================================================
    -- 第一部分：处理注册用户的个人预算（包括家庭创建者）
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
        
        -- 检查是否已存在目标月份的个人预算
        IF EXISTS (
            SELECT 1 FROM budgets 
            WHERE user_id = user_record.user_id
              AND account_book_id = user_record.account_book_id
              AND budget_type = 'PERSONAL'
              AND period = 'MONTHLY'
              AND start_date >= target_start
              AND start_date <= target_start
        ) THEN
            RAISE NOTICE '  ✅ 已存在%年%月预算，跳过', target_year, target_month;
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
                
            -- 为上个月预算创建结转历史记录（如果需要）
            IF latest_budget.end_date >= previous_start AND latest_budget.end_date <= previous_end THEN
                IF NOT temp_has_rollover_history(latest_budget.id, previous_period_str) THEN
                    INSERT INTO budget_histories (
                        id,
                        budget_id,
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
                        previous_period_str,
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
                    RAISE NOTICE '    📝 创建%结转历史记录', previous_period_str;
                END IF;
            END IF;
        END IF;
        
        -- 生成新预算ID
        new_budget_id := temp_generate_uuid();
        
        -- 创建目标月份预算
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
            target_start,
            target_end,
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
        
        RAISE NOTICE '  ✅ 成功创建%年%月预算: % (ID: %)', target_year, target_month, latest_budget.name, new_budget_id;
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
    -- 第二部分：处理家庭成员的个人预算（非托管成员）
    -- =====================================================
    RAISE NOTICE '开始处理家庭成员的个人预算...';

    FOR user_record IN
        SELECT DISTINCT
            fm.id as member_id,
            fm.name as member_name,
            fm.user_id,
            fm.family_id,
            ab.id as account_book_id,
            ab.name as account_book_name,
            ab.user_id as main_user_id
        FROM family_members fm
        JOIN families f ON fm.family_id = f.id
        JOIN account_books ab ON f.id = ab.family_id
        WHERE fm.is_custodial = false  -- 只处理非托管家庭成员
          AND fm.user_id IS NOT NULL   -- 必须有关联的用户ID
          AND ab.type = 'FAMILY'       -- 只处理家庭账本
        ORDER BY fm.name, ab.name
    LOOP
        RAISE NOTICE '检查家庭成员: % (%) - 账本: %', user_record.member_name, user_record.member_id, user_record.account_book_name;
        processed_users := processed_users + 1;

        -- 检查是否已存在目标月份的个人预算
        IF EXISTS (
            SELECT 1 FROM budgets
            WHERE user_id = user_record.user_id
              AND account_book_id = user_record.account_book_id
              AND budget_type = 'PERSONAL'
              AND period = 'MONTHLY'
              AND start_date >= target_start
              AND start_date <= target_start
        ) THEN
            RAISE NOTICE '  ✅ 已存在%年%月预算，跳过', target_year, target_month;
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

        -- 创建目标月份预算
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
            target_start,
            target_end,
            'PERSONAL',
            latest_budget.rollover,
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE NULL END,
            COALESCE(latest_budget.refresh_day, 1),
            user_record.user_id,
            user_record.account_book_id,
            user_record.family_id,
            COALESCE(latest_budget.is_auto_calculated, false),
            COALESCE(latest_budget.enable_category_budget, false),
            COALESCE(latest_budget.amount_modified, false),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );

        RAISE NOTICE '  ✅ 成功创建%年%月预算: % (ID: %)', target_year, target_month, latest_budget.name, new_budget_id;
        RAISE NOTICE '      金额: %, 结转: %', latest_budget.amount,
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE 0 END;
        RAISE NOTICE '';

        created_budgets := created_budgets + 1;

    END LOOP;

    RAISE NOTICE '家庭成员预算处理完成: 处理%个成员，创建%个预算，跳过%个', processed_users, created_budgets, skipped_budgets;
    RAISE NOTICE '';

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

        -- 检查是否已存在目标月份的个人预算
        IF EXISTS (
            SELECT 1 FROM budgets
            WHERE family_member_id = user_record.member_id
              AND account_book_id = user_record.account_book_id
              AND budget_type = 'PERSONAL'
              AND period = 'MONTHLY'
              AND start_date >= target_start
              AND start_date <= target_start
        ) THEN
            RAISE NOTICE '  ✅ 已存在%年%月预算，跳过', target_year, target_month;
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

            -- 为上个月预算创建结转历史记录（如果需要）
            IF latest_budget.end_date >= previous_start AND latest_budget.end_date <= previous_end THEN
                IF NOT temp_has_rollover_history(latest_budget.id, previous_period_str) THEN
                    INSERT INTO budget_histories (
                        id,
                        budget_id,
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
                        previous_period_str,
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
                    RAISE NOTICE '    📝 创建%结转历史记录', previous_period_str;
                END IF;
            END IF;
        END IF;

        -- 生成新预算ID
        new_budget_id := temp_generate_uuid();

        -- 创建目标月份预算
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
            target_start,
            target_end,
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

        RAISE NOTICE '  ✅ 成功创建%年%月预算: % (ID: %)', target_year, target_month, latest_budget.name, new_budget_id;
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
    target_year_text TEXT := current_setting('app.target_year', true);
    target_month_text TEXT := current_setting('app.target_month', true);
    target_year INTEGER;
    target_month INTEGER;
    target_start DATE;

    total_target_budgets INTEGER;
    total_users INTEGER;
    total_custodial_users INTEGER;
    total_custodial_members INTEGER;
BEGIN
    -- 设置默认值（如果没有传入参数）
    IF target_year_text IS NULL OR target_year_text = '' THEN
        target_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    ELSE
        target_year := target_year_text::INTEGER;
    END IF;

    IF target_month_text IS NULL OR target_month_text = '' THEN
        target_month := EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER;
    ELSE
        target_month := target_month_text::INTEGER;
    END IF;

    target_start := DATE(target_year || '-' || LPAD(target_month::TEXT, 2, '0') || '-01');
    -- 统计目标月份预算总数
    SELECT COUNT(*) INTO total_target_budgets
    FROM budgets
    WHERE start_date >= target_start
      AND start_date <= target_start
      AND budget_type = 'PERSONAL'
      AND period = 'MONTHLY';

    -- 统计用户总数
    SELECT COUNT(*) INTO total_users
    FROM users
    WHERE is_custodial = false;

    -- 统计家庭成员总数（非托管）
    SELECT COUNT(*) INTO total_custodial_users
    FROM family_members
    WHERE is_custodial = false AND user_id IS NOT NULL;

    -- 统计托管成员总数
    SELECT COUNT(*) INTO total_custodial_members
    FROM family_members
    WHERE is_custodial = true;

    RAISE NOTICE '';
    RAISE NOTICE '=== 最终统计结果 ===';
    RAISE NOTICE '注册用户总数: %', total_users;
    RAISE NOTICE '家庭成员总数（非托管）: %', total_custodial_users;
    RAISE NOTICE '托管成员总数: %', total_custodial_members;
    RAISE NOTICE '%年%月个人预算总数: %', target_year, target_month, total_target_budgets;
    RAISE NOTICE '';

    IF total_target_budgets > 0 THEN
        RAISE NOTICE '🎉 %年%月预算创建修复完成！', target_year, target_month;
    ELSE
        RAISE NOTICE '⚠️  没有创建任何%年%月预算，请检查数据', target_year, target_month;
    END IF;

END $$;

-- 提交事务
COMMIT;
