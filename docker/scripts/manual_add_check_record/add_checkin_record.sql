-- =====================================================
-- 手动添加用户签到记录SQL脚本
-- =====================================================
-- 
-- 功能：为指定用户添加指定日期的签到记录
-- 
-- 参数：
--   :user_id - 用户ID (UUID)
--   :checkin_date - 签到日期 (YYYY-MM-DD)
-- =====================================================

\set ON_ERROR_STOP on

-- 开始事务
BEGIN;

\echo '=========================================='
\echo '手动添加用户签到记录'
\echo '=========================================='
\echo ''

-- 1. 验证用户是否存在并获取用户ID
\echo '1. 验证用户是否存在...'
DO $$
DECLARE
    v_user_exists BOOLEAN;
    v_user_name TEXT;
    v_user_email TEXT;
    v_actual_user_id UUID;
    v_input_user_id TEXT := :user_id;
BEGIN
    -- 尝试作为UUID查询
    BEGIN
        SELECT id, name, email INTO v_actual_user_id, v_user_name, v_user_email
        FROM users 
        WHERE id = v_input_user_id::uuid;
        
        IF FOUND THEN
            RAISE NOTICE '✓ 用户存在: % (%) [ID: %]', v_user_name, v_user_email, v_actual_user_id;
            -- 将实际的UUID存储到临时表中供后续使用
            CREATE TEMP TABLE IF NOT EXISTS temp_user_info (user_id UUID);
            DELETE FROM temp_user_info;
            INSERT INTO temp_user_info VALUES (v_actual_user_id);
            RETURN;
        END IF;
    EXCEPTION
        WHEN invalid_text_representation THEN
            -- 不是有效的UUID，尝试作为邮箱查询
            NULL;
    END;
    
    -- 尝试作为邮箱查询
    SELECT id, name, email INTO v_actual_user_id, v_user_name, v_user_email
    FROM users 
    WHERE email = v_input_user_id;
    
    IF FOUND THEN
        RAISE NOTICE '✓ 用户存在: % (%) [ID: %]', v_user_name, v_user_email, v_actual_user_id;
        -- 将实际的UUID存储到临时表中供后续使用
        CREATE TEMP TABLE IF NOT EXISTS temp_user_info (user_id UUID);
        DELETE FROM temp_user_info;
        INSERT INTO temp_user_info VALUES (v_actual_user_id);
        RETURN;
    END IF;
    
    -- 用户不存在
    RAISE EXCEPTION '用户不存在: %', v_input_user_id;
END $$;

\echo ''

-- 2. 检查该日期是否已有签到记录
\echo '2. 检查签到记录是否已存在...'
DO $$
DECLARE
    v_checkin_exists BOOLEAN;
    v_existing_id UUID;
    v_existing_points INT;
    v_actual_user_id UUID;
BEGIN
    -- 从临时表获取实际的用户ID
    SELECT user_id INTO v_actual_user_id FROM temp_user_info;
    
    SELECT 
        EXISTS(SELECT 1 FROM user_checkins WHERE user_id = v_actual_user_id AND checkin_date = :checkin_date::date),
        id,
        points_awarded
    INTO v_checkin_exists, v_existing_id, v_existing_points
    FROM user_checkins 
    WHERE user_id = v_actual_user_id AND checkin_date = :checkin_date::date;
    
    IF v_checkin_exists THEN
        RAISE NOTICE '⚠ 该日期已有签到记录:';
        RAISE NOTICE '  - 记录ID: %', v_existing_id;
        RAISE NOTICE '  - 奖励点数: %', v_existing_points;
        RAISE NOTICE '  - 日期: %', :checkin_date;
        RAISE EXCEPTION '签到记录已存在，无法重复添加';
    ELSE
        RAISE NOTICE '✓ 该日期无签到记录，可以添加';
    END IF;
END $$;

\echo ''

-- 3. 获取用户当前记账点余额
\echo '3. 获取用户当前记账点余额...'
DO $$
DECLARE
    v_current_balance INT;
    v_gift_balance INT;
    v_member_balance INT;
    v_actual_user_id UUID;
BEGIN
    -- 从临时表获取实际的用户ID
    SELECT user_id INTO v_actual_user_id FROM temp_user_info;
    
    SELECT 
        COALESCE(total_balance, 0),
        COALESCE(gift_balance, 0),
        COALESCE(member_balance, 0)
    INTO v_current_balance, v_gift_balance, v_member_balance
    FROM user_accounting_points
    WHERE user_id = v_actual_user_id;
    
    IF NOT FOUND THEN
        RAISE NOTICE '⚠ 用户尚无记账点账户，将自动创建';
        v_current_balance := 0;
        v_gift_balance := 0;
        v_member_balance := 0;
    ELSE
        RAISE NOTICE '✓ 当前余额: % (赠送: %, 会员: %)', 
            v_current_balance, v_gift_balance, v_member_balance;
    END IF;
END $$;

\echo ''

-- 4. 添加签到记录
\echo '4. 添加签到记录...'
DO $$
DECLARE
    v_checkin_id UUID;
    v_points_awarded INT := 5; -- 签到奖励点数
    v_actual_user_id UUID;
BEGIN
    -- 从临时表获取实际的用户ID
    SELECT user_id INTO v_actual_user_id FROM temp_user_info;
    
    INSERT INTO user_checkins (
        user_id,
        checkin_date,
        points_awarded,
        created_at
    ) VALUES (
        v_actual_user_id,
        :checkin_date::date,
        v_points_awarded,
        NOW()
    )
    RETURNING id INTO v_checkin_id;
    
    RAISE NOTICE '✓ 签到记录已创建:';
    RAISE NOTICE '  - 记录ID: %', v_checkin_id;
    RAISE NOTICE '  - 签到日期: %', :checkin_date;
    RAISE NOTICE '  - 奖励点数: %', v_points_awarded;
END $$;

\echo ''

-- 5. 确保用户有记账点账户
\echo '5. 确保用户有记账点账户...'
DO $$
DECLARE
    v_actual_user_id UUID;
BEGIN
    -- 从临时表获取实际的用户ID
    SELECT user_id INTO v_actual_user_id FROM temp_user_info;
    
    INSERT INTO user_accounting_points (
        user_id,
        total_balance,
        gift_balance,
        member_balance,
        created_at,
        updated_at
    )
    VALUES (
        v_actual_user_id,
        0,
        0,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;
END $$;

\echo ''

-- 6. 添加记账点交易记录
\echo '6. 添加记账点交易记录...'
DO $$
DECLARE
    v_transaction_id UUID;
    v_points_awarded INT := 5;
    v_actual_user_id UUID;
BEGIN
    -- 从临时表获取实际的用户ID
    SELECT user_id INTO v_actual_user_id FROM temp_user_info;
    
    INSERT INTO accounting_points_transactions (
        user_id,
        amount,
        type,
        source,
        description,
        balance_after,
        created_at
    )
    SELECT
        v_actual_user_id,
        v_points_awarded,
        'checkin',
        'gift',
        '每日签到奖励',
        COALESCE(uap.total_balance, 0) + v_points_awarded,
        NOW()
    FROM user_accounting_points uap
    WHERE uap.user_id = v_actual_user_id
    RETURNING id INTO v_transaction_id;
    
    RAISE NOTICE '✓ 交易记录已创建:';
    RAISE NOTICE '  - 交易ID: %', v_transaction_id;
    RAISE NOTICE '  - 金额: +%', v_points_awarded;
    RAISE NOTICE '  - 类型: 签到';
    RAISE NOTICE '  - 来源: 赠送';
END $$;

\echo ''

-- 7. 更新用户记账点余额
\echo '7. 更新用户记账点余额...'
DO $$
DECLARE
    v_points_awarded INT := 5;
    v_new_total_balance INT;
    v_new_gift_balance INT;
    v_actual_user_id UUID;
BEGIN
    -- 从临时表获取实际的用户ID
    SELECT user_id INTO v_actual_user_id FROM temp_user_info;
    
    UPDATE user_accounting_points
    SET 
        total_balance = total_balance + v_points_awarded,
        gift_balance = gift_balance + v_points_awarded,
        updated_at = NOW()
    WHERE user_id = v_actual_user_id
    RETURNING total_balance, gift_balance INTO v_new_total_balance, v_new_gift_balance;
    
    RAISE NOTICE '✓ 余额已更新:';
    RAISE NOTICE '  - 新总余额: %', v_new_total_balance;
    RAISE NOTICE '  - 新赠送余额: %', v_new_gift_balance;
END $$;

\echo ''

-- 8. 显示最终结果
\echo '8. 最终结果汇总...'
DO $$
DECLARE
    v_user_name TEXT;
    v_user_email TEXT;
    v_total_balance INT;
    v_gift_balance INT;
    v_member_balance INT;
    v_total_checkins BIGINT;
    v_actual_user_id UUID;
BEGIN
    -- 从临时表获取实际的用户ID
    SELECT user_id INTO v_actual_user_id FROM temp_user_info;
    
    SELECT 
        u.name,
        u.email,
        uap.total_balance,
        uap.gift_balance,
        uap.member_balance,
        COUNT(uc.id)
    INTO v_user_name, v_user_email, v_total_balance, v_gift_balance, v_member_balance, v_total_checkins
    FROM users u
    LEFT JOIN user_accounting_points uap ON u.id = uap.user_id
    LEFT JOIN user_checkins uc ON u.id = uc.user_id
    WHERE u.id = v_actual_user_id
    GROUP BY u.name, u.email, uap.total_balance, uap.gift_balance, uap.member_balance;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '签到记录添加成功！';
    RAISE NOTICE '========================================';
    RAISE NOTICE '用户信息:';
    RAISE NOTICE '  - 用户名: %', v_user_name;
    RAISE NOTICE '  - 邮箱: %', v_user_email;
    RAISE NOTICE '  - 用户ID: %', v_actual_user_id;
    RAISE NOTICE '';
    RAISE NOTICE '签到信息:';
    RAISE NOTICE '  - 签到日期: %', :checkin_date;
    RAISE NOTICE '  - 奖励点数: 5';
    RAISE NOTICE '  - 累计签到: % 次', v_total_checkins;
    RAISE NOTICE '';
    RAISE NOTICE '记账点余额:';
    RAISE NOTICE '  - 总余额: %', v_total_balance;
    RAISE NOTICE '  - 赠送余额: %', v_gift_balance;
    RAISE NOTICE '  - 会员余额: %', v_member_balance;
    RAISE NOTICE '========================================';
END $$;

-- 9. 清理临时表
DROP TABLE IF EXISTS temp_user_info;

-- 提交事务
COMMIT;

\echo ''
\echo '✓ 所有操作已成功完成！'
