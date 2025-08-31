-- 测试修复后的语法
DO $$
DECLARE
    target_year_text TEXT := current_setting('app.target_year', true);
    target_month_text TEXT := current_setting('app.target_month', true);
    target_year INTEGER;
    target_month INTEGER;
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
    
    RAISE NOTICE '目标年份: %', target_year;
    RAISE NOTICE '目标月份: %', target_month;
    RAISE NOTICE '语法测试成功！';
END $$;
