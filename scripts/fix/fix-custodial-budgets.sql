-- 托管成员预算修复SQL脚本
-- 
-- 功能：为缺失当前月份预算的托管成员创建预算
-- 
-- 使用方法：
-- 1. 连接到数据库：psql -h 数据库地址 -U 用户名 -d 数据库名
-- 2. 执行脚本：\i fix-custodial-budgets.sql
-- 或者：psql -h 数据库地址 -U 用户名 -d 数据库名 < fix-custodial-budgets.sql

-- 开始事务
BEGIN;

-- 创建临时函数来生成UUID
CREATE OR REPLACE FUNCTION generate_uuid() RETURNS TEXT AS $$
BEGIN
    RETURN gen_random_uuid()::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 创建临时函数来计算已支出金额
CREATE OR REPLACE FUNCTION calculate_spent_amount(budget_id_param TEXT) RETURNS DECIMAL AS $$
DECLARE
    spent_amount DECIMAL(10,2);
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO spent_amount
    FROM transactions 
    WHERE budget_id = budget_id_param AND type = 'EXPENSE';
    
    RETURN spent_amount;
END;
$$ LANGUAGE plpgsql;

-- 主修复逻辑
DO $$
DECLARE
    current_month_start DATE;
    current_month_end DATE;
    custodial_member RECORD;
    latest_budget RECORD;
    new_budget_id TEXT;
    rollover_amount DECIMAL(10,2);
    spent_amount DECIMAL(10,2);
    total_available DECIMAL(10,2);
    processed_count INTEGER := 0;
    created_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    -- 计算当前月份的起始和结束日期
    current_month_start := DATE_TRUNC('month', CURRENT_DATE);
    current_month_end := (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month - 1 day')::DATE;
    
    RAISE NOTICE '=== 托管成员预算修复脚本 ===';
    RAISE NOTICE '当前月份: % 到 %', current_month_start, current_month_end;
    RAISE NOTICE '';
    
    -- 遍历所有托管成员及其关联的家庭账本
    FOR custodial_member IN 
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
        RAISE NOTICE '检查托管成员: % (账本: %)', custodial_member.member_name, custodial_member.account_book_name;
        processed_count := processed_count + 1;
        
        -- 检查是否已存在当前月份的预算
        IF EXISTS (
            SELECT 1 FROM budgets 
            WHERE family_member_id = custodial_member.member_id
              AND account_book_id = custodial_member.account_book_id
              AND budget_type = 'PERSONAL'
              AND period = 'MONTHLY'
              AND start_date >= current_month_start
              AND start_date <= current_month_end
        ) THEN
            RAISE NOTICE '  ✅ 已存在当前月份预算，跳过';
            skipped_count := skipped_count + 1;
            CONTINUE;
        END IF;
        
        -- 查找最新的预算作为模板
        SELECT * INTO latest_budget
        FROM budgets 
        WHERE family_member_id = custodial_member.member_id
          AND account_book_id = custodial_member.account_book_id
          AND budget_type = 'PERSONAL'
          AND period = 'MONTHLY'
        ORDER BY end_date DESC
        LIMIT 1;
        
        IF latest_budget IS NULL THEN
            RAISE NOTICE '  ⚠️  没有找到历史预算，无法创建';
            skipped_count := skipped_count + 1;
            CONTINUE;
        END IF;
        
        RAISE NOTICE '  📋 基于预算: % (结束日期: %)', latest_budget.name, latest_budget.end_date;
        
        -- 计算结转金额（如果启用了结转）
        rollover_amount := 0;
        IF latest_budget.rollover THEN
            -- 计算上个预算的已支出金额
            spent_amount := calculate_spent_amount(latest_budget.id);
            
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
        new_budget_id := generate_uuid();
        
        -- 创建新的预算记录
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
            current_month_start,
            current_month_end,
            'PERSONAL',
            latest_budget.rollover,
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE NULL END,
            COALESCE(latest_budget.refresh_day, 1),
            custodial_member.main_user_id,
            custodial_member.account_book_id,
            custodial_member.member_id,
            custodial_member.family_id,
            COALESCE(latest_budget.is_auto_calculated, false),
            COALESCE(latest_budget.enable_category_budget, false),
            COALESCE(latest_budget.amount_modified, false),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        );
        
        RAISE NOTICE '  ✅ 成功创建预算: % (ID: %)', latest_budget.name, new_budget_id;
        RAISE NOTICE '      金额: %, 结转: %', latest_budget.amount, 
            CASE WHEN latest_budget.rollover THEN rollover_amount ELSE 0 END;
        RAISE NOTICE '';
        
        created_count := created_count + 1;
        
    END LOOP;
    
    RAISE NOTICE '=== 修复完成 ===';
    RAISE NOTICE '处理的托管成员-账本组合数: %', processed_count;
    RAISE NOTICE '成功创建的预算数: %', created_count;
    RAISE NOTICE '跳过的数量: %', skipped_count;
    
END $$;

-- 显示修复结果统计
DO $$
DECLARE
    total_custodial_members INTEGER;
    members_with_current_budget INTEGER;
    members_without_current_budget INTEGER;
BEGIN
    -- 统计托管成员-账本组合总数
    SELECT COUNT(*) INTO total_custodial_members
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    JOIN account_books ab ON f.id = ab.family_id
    WHERE fm.is_custodial = true
      AND ab.type = 'FAMILY';
    
    -- 统计有当前月份预算的托管成员-账本组合数
    SELECT COUNT(DISTINCT CONCAT(fm.id, '-', ab.id)) INTO members_with_current_budget
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    JOIN account_books ab ON f.id = ab.family_id
    JOIN budgets b ON fm.id = b.family_member_id AND ab.id = b.account_book_id
    WHERE fm.is_custodial = true
      AND ab.type = 'FAMILY'
      AND b.budget_type = 'PERSONAL'
      AND b.period = 'MONTHLY'
      AND b.start_date >= DATE_TRUNC('month', CURRENT_DATE)
      AND b.start_date <= DATE_TRUNC('month', CURRENT_DATE);
    
    members_without_current_budget := total_custodial_members - members_with_current_budget;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 验证结果 ===';
    RAISE NOTICE '托管成员-账本组合总数: %', total_custodial_members;
    RAISE NOTICE '有当前月份预算的组合数: %', members_with_current_budget;
    RAISE NOTICE '缺失当前月份预算的组合数: %', members_without_current_budget;
    
    IF members_without_current_budget = 0 THEN
        RAISE NOTICE '🎉 所有托管成员都有当前月份的预算！';
    END IF;
    
END $$;

-- 清理临时函数
DROP FUNCTION IF EXISTS generate_uuid();
DROP FUNCTION IF EXISTS calculate_spent_amount(TEXT);

-- 提交事务
COMMIT;

-- 显示验证查询
\echo ''
\echo '=== 验证查询 ==='
\echo '可以运行以下查询来验证结果：'
\echo ''
\echo 'SELECT '
\echo '  fm.name as 托管成员,'
\echo '  ab.name as 账本,'
\echo '  b.name as 预算名称,'
\echo '  b.start_date as 开始日期,'
\echo '  b.end_date as 结束日期,'
\echo '  b.amount as 预算金额,'
\echo '  b.rollover_amount as 结转金额'
\echo 'FROM family_members fm'
\echo 'JOIN account_books ab ON fm.family_id = ab.family_id'
\echo 'JOIN budgets b ON fm.id = b.family_member_id AND ab.id = b.account_book_id'
\echo 'WHERE fm.is_custodial = true'
\echo '  AND b.start_date >= DATE_TRUNC(''month'', CURRENT_DATE)'
\echo 'ORDER BY fm.name, b.start_date;'
