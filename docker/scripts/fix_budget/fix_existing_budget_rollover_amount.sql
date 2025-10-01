-- =====================================================
-- 已创建预算结转金额修复脚本
-- =====================================================
-- 
-- 功能：
-- 1. 对比所有已创建预算的结转金额是否正确
-- 2. 修复所有结转金额错误的个人预算
-- 3. 确保预算结转链条的完整性和正确性
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
    budget_record RECORD;
    next_budget_record RECORD;
    spent_amount DECIMAL(10,2);
    expected_rollover DECIMAL(10,2);
    current_rollover DECIMAL(10,2);
    total_checked INTEGER := 0;
    total_incorrect INTEGER := 0;
    total_updated INTEGER := 0;
    total_errors INTEGER := 0;
BEGIN
    RAISE NOTICE '=== 已创建预算结转金额修复脚本 ===';
    RAISE NOTICE '';
    RAISE NOTICE '开始检查所有启用结转的个人预算...';
    RAISE NOTICE '';
    
    -- 遍历所有启用了结转的个人预算，按用户、账本和时间排序
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
        ORDER BY COALESCE(b.user_id, b.family_member_id), b.account_book_id, b.end_date
    LOOP
        -- 计算当前预算的实际支出
        spent_amount := temp_calculate_spent_amount(budget_record.id);
        
        -- 计算当前预算应该结转到下期的金额
        -- 公式: 结转金额 = 预算金额 + 上期结转金额 - 实际支出
        expected_rollover := budget_record.amount + COALESCE(budget_record.rollover_amount, 0) - spent_amount;
        
        -- 查找下一个预算
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
        
        -- 如果存在下一个预算，检查其结转金额是否正确
        IF next_budget_record IS NOT NULL THEN
            total_checked := total_checked + 1;
            current_rollover := COALESCE(next_budget_record.rollover_amount, 0);
            
            -- 检查结转金额是否正确（允许0.01的小数点误差）
            IF ABS(expected_rollover - current_rollover) > 0.01 THEN
                total_incorrect := total_incorrect + 1;
                
                RAISE NOTICE '发现错误: % - %', budget_record.user_name, budget_record.name;
                RAISE NOTICE '  当前预算: % (% 到 %)', 
                    budget_record.name, 
                    budget_record.start_date::DATE, 
                    budget_record.end_date::DATE;
                RAISE NOTICE '  预算金额: %, 上期结转: %, 实际支出: %', 
                    budget_record.amount, 
                    COALESCE(budget_record.rollover_amount, 0), 
                    spent_amount;
                RAISE NOTICE '  计算结转: %', expected_rollover;
                RAISE NOTICE '  下期预算: % (% 到 %)', 
                    next_budget_record.name, 
                    next_budget_record.start_date::DATE, 
                    next_budget_record.end_date::DATE;
                RAISE NOTICE '  当前结转金额: % (错误)', current_rollover;
                RAISE NOTICE '  应为结转金额: % (正确)', expected_rollover;
                RAISE NOTICE '  差异: %', ABS(expected_rollover - current_rollover);
                
                -- 更新下一个预算的结转金额
                BEGIN
                    UPDATE budgets 
                    SET rollover_amount = expected_rollover,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = next_budget_record.id;
                    
                    total_updated := total_updated + 1;
                    RAISE NOTICE '  ✅ 已修复结转金额: % -> %', current_rollover, expected_rollover;
                    
                EXCEPTION WHEN OTHERS THEN
                    total_errors := total_errors + 1;
                    RAISE NOTICE '  ❌ 更新失败: %', SQLERRM;
                END;
                
                RAISE NOTICE '';
            END IF;
        END IF;
        
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 修复完成 ===';
    RAISE NOTICE '检查的预算链条数: %', total_checked;
    RAISE NOTICE '发现错误的数量: %', total_incorrect;
    RAISE NOTICE '成功修复的数量: %', total_updated;
    RAISE NOTICE '修复失败的数量: %', total_errors;
    RAISE NOTICE '';
    
    IF total_incorrect = 0 THEN
        RAISE NOTICE '🎉 所有预算的结转金额都正确！';
    ELSIF total_updated = total_incorrect THEN
        RAISE NOTICE '🎉 所有错误的结转金额都已修复！';
    ELSE
        RAISE NOTICE '⚠️  部分结转金额修复失败，请检查错误日志';
    END IF;
    
END $$;

-- 验证修复结果
DO $$
DECLARE
    total_budgets INTEGER;
    total_with_rollover INTEGER;
    total_chains INTEGER;
    verification_errors INTEGER := 0;
    budget_record RECORD;
    next_budget_record RECORD;
    spent_amount DECIMAL(10,2);
    expected_rollover DECIMAL(10,2);
    current_rollover DECIMAL(10,2);
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== 验证修复结果 ===';
    
    -- 统计总预算数
    SELECT COUNT(*) INTO total_budgets
    FROM budgets
    WHERE budget_type = 'PERSONAL'
      AND period = 'MONTHLY';
    
    -- 统计启用结转的预算数
    SELECT COUNT(*) INTO total_with_rollover
    FROM budgets
    WHERE budget_type = 'PERSONAL'
      AND period = 'MONTHLY'
      AND rollover = true;
    
    RAISE NOTICE '个人月度预算总数: %', total_budgets;
    RAISE NOTICE '启用结转的预算数: %', total_with_rollover;
    RAISE NOTICE '';
    
    -- 再次检查是否还有错误
    FOR budget_record IN 
        SELECT 
            b.*,
            COALESCE(u.name, fm.name, '未知用户') as user_name
        FROM budgets b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN family_members fm ON b.family_member_id = fm.id
        WHERE b.rollover = true
          AND b.budget_type = 'PERSONAL'
          AND b.period = 'MONTHLY'
        ORDER BY COALESCE(b.user_id, b.family_member_id), b.account_book_id, b.end_date
    LOOP
        spent_amount := temp_calculate_spent_amount(budget_record.id);
        expected_rollover := budget_record.amount + COALESCE(budget_record.rollover_amount, 0) - spent_amount;
        
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
            current_rollover := COALESCE(next_budget_record.rollover_amount, 0);
            
            IF ABS(expected_rollover - current_rollover) > 0.01 THEN
                verification_errors := verification_errors + 1;
                RAISE NOTICE '⚠️  仍存在错误: % - % (期望: %, 实际: %)', 
                    budget_record.user_name, 
                    budget_record.name,
                    expected_rollover,
                    current_rollover;
            END IF;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    IF verification_errors = 0 THEN
        RAISE NOTICE '✅ 验证通过: 所有预算结转金额正确！';
    ELSE
        RAISE NOTICE '❌ 验证失败: 仍有 % 个预算的结转金额不正确', verification_errors;
    END IF;
    
END $$;

-- 清理临时函数
DROP FUNCTION IF EXISTS temp_calculate_spent_amount(TEXT);

-- 提交事务
COMMIT;

-- 显示验证查询
\echo ''
\echo '=== 手动验证查询 ==='
\echo '1. 查看所有预算的结转金额:'
\echo ''
\echo 'SELECT '
\echo '  COALESCE(u.name, fm.name) as 用户名,'
\echo '  b.name as 预算名称,'
\echo '  b.start_date::DATE as 开始日期,'
\echo '  b.end_date::DATE as 结束日期,'
\echo '  b.amount as 预算金额,'
\echo '  b.rollover_amount as 结转金额,'
\echo '  COALESCE(spent.total, 0) as 实际支出'
\echo 'FROM budgets b'
\echo 'LEFT JOIN users u ON b.user_id = u.id'
\echo 'LEFT JOIN family_members fm ON b.family_member_id = fm.id'
\echo 'LEFT JOIN ('
\echo '  SELECT budget_id, SUM(amount) as total'
\echo '  FROM transactions'
\echo '  WHERE type = ''EXPENSE'''
\echo '  GROUP BY budget_id'
\echo ') spent ON b.id = spent.budget_id'
\echo 'WHERE b.rollover = true'
\echo '  AND b.budget_type = ''PERSONAL'''
\echo '  AND b.period = ''MONTHLY'''
\echo 'ORDER BY COALESCE(u.name, fm.name), b.start_date;'

