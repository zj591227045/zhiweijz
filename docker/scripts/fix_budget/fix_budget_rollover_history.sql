-- =====================================================
-- 预算结转历史记录修复脚本
-- =====================================================
-- 
-- 功能：
-- 1. 为所有已过期且启用结转的预算创建缺失的结转历史记录
-- 2. 修正不正确的预算结转金额
-- 3. 确保预算结转链条的正确性
--
-- 使用方法：
-- psql -h 数据库地址 -U 用户名 -d 数据库名 < fix_budget_rollover_history.sql
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

-- 主修复逻辑
DO $$
DECLARE
    budget_record RECORD;
    next_budget_record RECORD;
    spent_amount DECIMAL(10,2);
    rollover_amount DECIMAL(10,2);
    period_str TEXT;
    rollover_type TEXT;
    rollover_description TEXT;
    expected_rollover DECIMAL(10,2);
    current_rollover DECIMAL(10,2);
    processed_count INTEGER := 0;
    history_created_count INTEGER := 0;
    rollover_updated_count INTEGER := 0;
    skipped_count INTEGER := 0;
BEGIN
    RAISE NOTICE '=== 预算结转历史修复脚本 ===';
    RAISE NOTICE '';
    
    -- 查找所有启用了结转的已过期预算，按用户和时间排序
    FOR budget_record IN 
        SELECT 
            b.*,
            COALESCE(u.name, fm.name, '未知用户') as user_name,
            ROW_NUMBER() OVER (
                PARTITION BY COALESCE(b.user_id, b.family_member_id), b.account_book_id 
                ORDER BY b.end_date
            ) as seq_num
        FROM budgets b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN family_members fm ON b.family_member_id = fm.id
        WHERE b.rollover = true
          AND b.budget_type = 'PERSONAL'
          AND b.period = 'MONTHLY'
          AND b.end_date < CURRENT_DATE
        ORDER BY COALESCE(b.user_id, b.family_member_id), b.account_book_id, b.end_date
    LOOP
        RAISE NOTICE '处理预算: % - % (结束日期: %)', budget_record.user_name, budget_record.name, budget_record.end_date;
        processed_count := processed_count + 1;
        
        -- 计算当前预算的支出
        spent_amount := temp_calculate_spent_amount(budget_record.id);
        
        -- 计算结转金额
        rollover_amount := budget_record.amount + COALESCE(budget_record.rollover_amount, 0) - spent_amount;
        
        RAISE NOTICE '  支出: %, 计算结转: %', spent_amount, rollover_amount;
        
        -- 生成期间字符串
        period_str := EXTRACT(YEAR FROM budget_record.end_date) || '-' || EXTRACT(MONTH FROM budget_record.end_date);
        
        -- 检查是否需要创建结转历史记录
        IF NOT temp_has_rollover_history(budget_record.id, period_str) THEN
            -- 创建结转历史记录
            rollover_type := CASE WHEN rollover_amount >= 0 THEN 'SURPLUS' ELSE 'DEFICIT' END;
            rollover_description := CASE WHEN rollover_amount >= 0 THEN '余额结转' ELSE '债务结转' END;
            
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
                budget_record.id,
                period_str,
                ABS(rollover_amount),
                rollover_type::"RolloverType",
                rollover_description || ': 基础预算' || budget_record.amount ||
                ', 上期结转' || COALESCE(budget_record.rollover_amount, 0) ||
                ', 实际支出' || spent_amount || ', 结转金额' || rollover_amount,
                budget_record.amount,
                spent_amount,
                COALESCE(budget_record.rollover_amount, 0),
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            );
            
            RAISE NOTICE '  ✅ 创建结转历史: % - % %', period_str, rollover_description, ABS(rollover_amount);
            history_created_count := history_created_count + 1;
        ELSE
            RAISE NOTICE '  ✅ 已存在结转历史记录';
        END IF;
        
        -- 查找下一个预算，检查其结转金额是否正确
        SELECT * INTO next_budget_record
        FROM budgets 
        WHERE COALESCE(user_id, family_member_id) = COALESCE(budget_record.user_id, budget_record.family_member_id)
          AND account_book_id = budget_record.account_book_id
          AND budget_type = 'PERSONAL'
          AND period = 'MONTHLY'
          AND rollover = true
          AND start_date > budget_record.end_date
        ORDER BY start_date
        LIMIT 1;
        
        IF next_budget_record IS NOT NULL THEN
            expected_rollover := rollover_amount;
            current_rollover := COALESCE(next_budget_record.rollover_amount, 0);
            
            -- 检查结转金额是否正确（允许小数点误差）
            IF ABS(expected_rollover - current_rollover) > 0.01 THEN
                RAISE NOTICE '  ⚠️  下个预算结转金额不正确: 期望%, 实际%', expected_rollover, current_rollover;
                
                -- 更新下个预算的结转金额
                UPDATE budgets 
                SET rollover_amount = expected_rollover,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = next_budget_record.id;
                
                RAISE NOTICE '  ✅ 更新下个预算结转金额: %', expected_rollover;
                rollover_updated_count := rollover_updated_count + 1;
            ELSE
                RAISE NOTICE '  ✅ 下个预算结转金额正确';
            END IF;
        END IF;
        
        RAISE NOTICE '';
        
    END LOOP;
    
    RAISE NOTICE '=== 修复完成 ===';
    RAISE NOTICE '处理的预算数: %', processed_count;
    RAISE NOTICE '成功创建的历史记录数: %', history_created_count;
    RAISE NOTICE '成功更新的结转金额数: %', rollover_updated_count;
    
END $$;

-- 显示修复结果统计
DO $$
DECLARE
    total_rollover_budgets INTEGER;
    budgets_with_history INTEGER;
    budgets_without_history INTEGER;
BEGIN
    -- 统计启用结转的已过期预算总数
    SELECT COUNT(*) INTO total_rollover_budgets
    FROM budgets
    WHERE rollover = true
      AND budget_type = 'PERSONAL'
      AND period = 'MONTHLY'
      AND end_date < CURRENT_DATE;
    
    -- 统计有结转历史记录的预算数
    SELECT COUNT(DISTINCT bh.budget_id) INTO budgets_with_history
    FROM budget_histories bh
    JOIN budgets b ON bh.budget_id = b.id
    WHERE b.rollover = true
      AND b.budget_type = 'PERSONAL'
      AND b.period = 'MONTHLY'
      AND b.end_date < CURRENT_DATE
      AND bh.type IN ('SURPLUS', 'DEFICIT');
    
    budgets_without_history := total_rollover_budgets - budgets_with_history;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 验证结果 ===';
    RAISE NOTICE '已过期的结转预算总数: %', total_rollover_budgets;
    RAISE NOTICE '有结转历史记录的预算数: %', budgets_with_history;
    RAISE NOTICE '缺失历史记录的预算数: %', budgets_without_history;
    
    IF budgets_without_history = 0 THEN
        RAISE NOTICE '🎉 所有已过期的结转预算都有历史记录！';
    END IF;
    
END $$;

-- 清理临时函数
DROP FUNCTION IF EXISTS temp_generate_uuid();
DROP FUNCTION IF EXISTS temp_calculate_spent_amount(TEXT);
DROP FUNCTION IF EXISTS temp_has_rollover_history(TEXT, TEXT);

-- 提交事务
COMMIT;

-- 显示验证查询
\echo ''
\echo '=== 验证查询 ==='
\echo '1. 检查结转历史记录：'
\echo ''
\echo 'SELECT '
\echo '  b.name as 预算名称,'
\echo '  bh.period as 期间,'
\echo '  bh.type as 类型,'
\echo '  bh.amount as 结转金额,'
\echo '  bh.description as 描述,'
\echo '  bh.created_at as 创建时间'
\echo 'FROM budget_histories bh'
\echo 'JOIN budgets b ON bh.budget_id = b.id'
\echo 'WHERE bh.type IN (''SURPLUS'', ''DEFICIT'')'
\echo 'ORDER BY bh.period DESC, b.name;'
\echo ''
\echo '2. 检查预算结转金额：'
\echo ''
\echo 'SELECT '
\echo '  COALESCE(u.name, fm.name) as 用户名,'
\echo '  b.name as 预算名称,'
\echo '  b.start_date as 开始日期,'
\echo '  b.end_date as 结束日期,'
\echo '  b.amount as 预算金额,'
\echo '  b.rollover_amount as 结转金额'
\echo 'FROM budgets b'
\echo 'LEFT JOIN users u ON b.user_id = u.id'
\echo 'LEFT JOIN family_members fm ON b.family_member_id = fm.id'
\echo 'WHERE b.rollover = true'
\echo '  AND b.budget_type = ''PERSONAL'''
\echo '  AND b.period = ''MONTHLY'''
\echo 'ORDER BY COALESCE(u.name, fm.name), b.start_date;'
