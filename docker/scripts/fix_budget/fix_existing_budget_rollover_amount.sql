-- =====================================================
-- 已创建预算结转金额修复脚本
-- =====================================================
-- 
-- 功能：
-- 1. 根据预算结转历史记录，更新最新预算的结转金额
-- 2. 对比所有已创建预算的结转金额是否正确
-- 3. 修复所有结转金额错误的个人预算
-- 4. 确保预算结转链条的完整性和正确性
--
-- 逻辑：
-- 1. 查找每个用户的最新预算
-- 2. 查找该预算的上一期预算
-- 3. 从上一期预算的结转历史记录中获取结转金额
-- 4. 更新最新预算的rollover_amount字段
--
-- 使用方法：
-- psql -h 数据库地址 -U 用户名 -d 数据库名 < fix_existing_budget_rollover_amount.sql
-- =====================================================

-- 开始事务
BEGIN;

-- 设置时区为北京时间
SET timezone = 'Asia/Shanghai';

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

-- 主修复逻辑
DO $$
DECLARE
    latest_budget_record RECORD;
    previous_budget_record RECORD;
    history_record RECORD;
    spent_amount DECIMAL(10,2);
    expected_rollover DECIMAL(10,2);
    current_rollover DECIMAL(10,2);
    total_latest_budgets INTEGER := 0;
    total_checked INTEGER := 0;
    total_incorrect INTEGER := 0;
    total_updated INTEGER := 0;
    total_errors INTEGER := 0;
    total_no_previous INTEGER := 0;
    total_no_history INTEGER := 0;
BEGIN
    RAISE NOTICE '=== 已创建预算结转金额修复脚本 ===';
    RAISE NOTICE '';
    RAISE NOTICE '策略: 根据预算结转历史记录更新最新预算的结转金额';
    RAISE NOTICE '';
    
    -- 查找每个用户/成员的最新预算（启用结转的个人预算）
    FOR latest_budget_record IN 
        WITH latest_budgets AS (
            SELECT 
                b.*,
                COALESCE(u.name, fm.name, '未知用户') as user_name,
                ab.name as account_book_name,
                ROW_NUMBER() OVER (
                    PARTITION BY COALESCE(b.user_id, b.family_member_id), b.account_book_id 
                    ORDER BY b.end_date DESC
                ) as rn
            FROM budgets b
            LEFT JOIN users u ON b.user_id = u.id
            LEFT JOIN family_members fm ON b.family_member_id = fm.id
            LEFT JOIN account_books ab ON b.account_book_id = ab.id
            WHERE b.rollover = true
              AND b.budget_type = 'PERSONAL'
              AND b.period = 'MONTHLY'
        )
        SELECT * FROM latest_budgets WHERE rn = 1
        ORDER BY user_name, account_book_name
    LOOP
        total_latest_budgets := total_latest_budgets + 1;
        
        RAISE NOTICE '检查最新预算: % - % (账本: %)', 
            latest_budget_record.user_name, 
            latest_budget_record.name,
            latest_budget_record.account_book_name;
        RAISE NOTICE '  预算期间: % 到 %', 
            latest_budget_record.start_date::DATE, 
            latest_budget_record.end_date::DATE;
        
        -- 查找上一期预算
        SELECT * INTO previous_budget_record
        FROM budgets 
        WHERE COALESCE(user_id, family_member_id) = COALESCE(latest_budget_record.user_id, latest_budget_record.family_member_id)
          AND account_book_id = latest_budget_record.account_book_id
          AND budget_type = 'PERSONAL'
          AND period = 'MONTHLY'
          AND rollover = true
          AND end_date < latest_budget_record.start_date
        ORDER BY end_date DESC
        LIMIT 1;
        
        IF previous_budget_record IS NULL THEN
            total_no_previous := total_no_previous + 1;
            RAISE NOTICE '  ⚠️  没有找到上一期预算，跳过';
            RAISE NOTICE '';
            CONTINUE;
        END IF;
        
        RAISE NOTICE '  上期预算: % 到 %', 
            previous_budget_record.start_date::DATE, 
            previous_budget_record.end_date::DATE;
        
        -- 从预算结转历史记录中获取结转金额
        SELECT * INTO history_record
        FROM budget_histories
        WHERE budget_id = previous_budget_record.id
          AND type IN ('SURPLUS', 'DEFICIT')
        ORDER BY created_at DESC
        LIMIT 1;
        
        IF history_record IS NULL THEN
            total_no_history := total_no_history + 1;
            RAISE NOTICE '  ⚠️  上期预算没有结转历史记录，尝试计算';
            
            -- 如果没有历史记录，手动计算
            spent_amount := temp_calculate_spent_amount(previous_budget_record.id);
            expected_rollover := previous_budget_record.amount + COALESCE(previous_budget_record.rollover_amount, 0) - spent_amount;
            
            RAISE NOTICE '  计算结转: 预算% + 上期结转% - 支出% = %', 
                previous_budget_record.amount,
                COALESCE(previous_budget_record.rollover_amount, 0),
                spent_amount,
                expected_rollover;
        ELSE
            -- 从历史记录中获取结转金额
            IF history_record.type = 'SURPLUS' THEN
                expected_rollover := history_record.amount;
            ELSE
                expected_rollover := -history_record.amount;
            END IF;
            
            RAISE NOTICE '  历史记录结转: % (类型: %)', expected_rollover, history_record.type;
        END IF;
        
        total_checked := total_checked + 1;
        current_rollover := COALESCE(latest_budget_record.rollover_amount, 0);
        
        -- 检查结转金额是否正确（允许0.01的小数点误差）
        IF ABS(expected_rollover - current_rollover) > 0.01 THEN
            total_incorrect := total_incorrect + 1;
            
            RAISE NOTICE '  ❌ 结转金额不正确!';
            RAISE NOTICE '     当前值: %', current_rollover;
            RAISE NOTICE '     应为值: %', expected_rollover;
            RAISE NOTICE '     差异: %', ABS(expected_rollover - current_rollover);
            
            -- 更新最新预算的结转金额
            BEGIN
                UPDATE budgets 
                SET rollover_amount = expected_rollover,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = latest_budget_record.id;
                
                total_updated := total_updated + 1;
                RAISE NOTICE '  ✅ 已修复结转金额: % -> %', current_rollover, expected_rollover;
                
            EXCEPTION WHEN OTHERS THEN
                total_errors := total_errors + 1;
                RAISE NOTICE '  ❌ 更新失败: %', SQLERRM;
            END;
        ELSE
            RAISE NOTICE '  ✅ 结转金额正确: %', current_rollover;
        END IF;
        
        RAISE NOTICE '';
        
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 修复完成 ===';
    RAISE NOTICE '最新预算总数: %', total_latest_budgets;
    RAISE NOTICE '有上期预算的数量: %', total_checked;
    RAISE NOTICE '无上期预算的数量: %', total_no_previous;
    RAISE NOTICE '无历史记录的数量: %', total_no_history;
    RAISE NOTICE '发现错误的数量: %', total_incorrect;
    RAISE NOTICE '成功修复的数量: %', total_updated;
    RAISE NOTICE '修复失败的数量: %', total_errors;
    RAISE NOTICE '';
    
    IF total_latest_budgets = 0 THEN
        RAISE NOTICE '⚠️  没有找到任何启用结转的个人预算！';
    ELSIF total_checked = 0 THEN
        RAISE NOTICE '⚠️  所有最新预算都没有上期预算，无法检查结转金额！';
        RAISE NOTICE '提示: 这可能是因为这些预算是第一期预算。';
    ELSIF total_incorrect = 0 THEN
        RAISE NOTICE '🎉 所有最新预算的结转金额都正确！';
    ELSIF total_updated = total_incorrect THEN
        RAISE NOTICE '🎉 所有错误的结转金额都已修复！';
    ELSE
        RAISE NOTICE '⚠️  部分结转金额修复失败，请检查错误日志';
    END IF;
    
END $$;

-- 清理临时函数
DROP FUNCTION IF EXISTS temp_calculate_spent_amount(TEXT);

-- 提交事务
COMMIT;

