/*META
VERSION: 1.6.0
DESCRIPTION: 系统性能监控 - 添加系统性能历史数据表和相关功能
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：系统性能监控
-- 支持磁盘、CPU、内存使用率历史数据收集和存储
-- =======================================

-- 1. 创建系统性能历史数据表
CREATE TABLE IF NOT EXISTS system_performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(20) NOT NULL, -- 'disk', 'cpu', 'memory'
    metric_value DECIMAL(5,2) NOT NULL, -- 使用率百分比 (0.00-100.00)
    additional_data JSONB, -- 额外数据，如磁盘详细信息、CPU负载等
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. 添加约束
DO $$ BEGIN
    ALTER TABLE system_performance_history ADD CONSTRAINT check_metric_type 
    CHECK (metric_type IN ('disk', 'cpu', 'memory'));
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE system_performance_history ADD CONSTRAINT check_metric_value_range 
    CHECK (metric_value >= 0 AND metric_value <= 100);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_system_performance_metric_type ON system_performance_history(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_performance_recorded_at ON system_performance_history(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_performance_type_time ON system_performance_history(metric_type, recorded_at DESC);

-- 4. 创建复合索引用于时间范围查询
CREATE INDEX IF NOT EXISTS idx_system_performance_type_time_value ON system_performance_history(metric_type, recorded_at DESC, metric_value);

-- 5. 创建部分索引（最近数据，不使用NOW()函数）
-- 注意：部分索引使用固定时间点，避免IMMUTABLE函数限制
CREATE INDEX IF NOT EXISTS idx_system_performance_recent ON system_performance_history(metric_type, recorded_at DESC);

-- 6. 创建数据清理函数
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cleanup_old_performance_data') THEN
        EXECUTE '
        CREATE FUNCTION cleanup_old_performance_data()
        RETURNS INTEGER AS $func$
        DECLARE
            deleted_count INTEGER;
        BEGIN
            -- 删除超过30天的性能数据
            DELETE FROM system_performance_history 
            WHERE recorded_at < NOW() - INTERVAL ''30 days'';
            
            GET DIAGNOSTICS deleted_count = ROW_COUNT;
            
            -- 记录清理日志
            INSERT INTO system_configs (key, value, description, category, updated_at)
            VALUES (
                ''last_performance_cleanup'', 
                NOW()::TEXT, 
                ''最后一次性能数据清理时间'', 
                ''system'',
                NOW()
            ) ON CONFLICT (key) DO UPDATE SET 
                value = EXCLUDED.value, 
                updated_at = NOW();
                
            RETURN deleted_count;
        END;
        $func$ LANGUAGE plpgsql;
        ';
    END IF;
END $$;

-- 7. 创建性能数据聚合视图（用于不同时间范围的查询优化）
CREATE OR REPLACE VIEW system_performance_hourly AS
SELECT
    metric_type,
    DATE_TRUNC('hour', recorded_at) as hour_time,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as sample_count
FROM system_performance_history
WHERE recorded_at >= NOW() - INTERVAL '7 days'
GROUP BY metric_type, DATE_TRUNC('hour', recorded_at)
ORDER BY hour_time ASC;

CREATE OR REPLACE VIEW system_performance_daily AS
SELECT
    metric_type,
    DATE_TRUNC('day', recorded_at) as day_time,
    AVG(metric_value) as avg_value,
    MIN(metric_value) as min_value,
    MAX(metric_value) as max_value,
    COUNT(*) as sample_count
FROM system_performance_history
WHERE recorded_at >= NOW() - INTERVAL '30 days'
GROUP BY metric_type, DATE_TRUNC('day', recorded_at)
ORDER BY day_time ASC;

-- 8. 插入系统配置
INSERT INTO system_configs (key, value, description, category) 
VALUES ('performance_monitoring_enabled', 'true', '系统性能监控开关', 'features') 
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    description = EXCLUDED.description, 
    updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) 
VALUES ('performance_data_retention_days', '30', '性能数据保留天数', 'limits') 
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    description = EXCLUDED.description, 
    updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) 
VALUES ('disk_monitoring_interval_minutes', '1', '磁盘监控间隔（分钟）', 'monitoring') 
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    description = EXCLUDED.description, 
    updated_at = NOW();

INSERT INTO system_configs (key, value, description, category) 
VALUES ('cpu_memory_monitoring_interval_seconds', '10', 'CPU和内存监控间隔（秒）', 'monitoring') 
ON CONFLICT (key) DO UPDATE SET 
    value = EXCLUDED.value, 
    description = EXCLUDED.description, 
    updated_at = NOW();

-- 9. 创建性能数据统计函数
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_performance_stats') THEN
        EXECUTE '
        CREATE FUNCTION get_performance_stats(
            p_metric_type VARCHAR(20),
            p_start_time TIMESTAMP WITH TIME ZONE,
            p_end_time TIMESTAMP WITH TIME ZONE
        )
        RETURNS TABLE(
            avg_value DECIMAL(5,2),
            min_value DECIMAL(5,2),
            max_value DECIMAL(5,2),
            sample_count BIGINT
        ) AS $func$
        BEGIN
            RETURN QUERY
            SELECT
                AVG(sph.metric_value)::DECIMAL(5,2) as avg_value,
                MIN(sph.metric_value)::DECIMAL(5,2) as min_value,
                MAX(sph.metric_value)::DECIMAL(5,2) as max_value,
                COUNT(*)::BIGINT as sample_count
            FROM system_performance_history sph
            WHERE sph.metric_type = p_metric_type
              AND sph.recorded_at >= p_start_time
              AND sph.recorded_at <= p_end_time;
        END;
        $func$ LANGUAGE plpgsql;
        ';
    END IF;
END $$;

-- 10. 插入初始性能数据（可选，用于测试）
-- 注意：这些是示例数据，实际部署时可以移除
DO $$
DECLARE
    i INTEGER;
    base_time TIMESTAMP WITH TIME ZONE;
BEGIN
    -- 只在开发环境插入测试数据
    IF EXISTS (SELECT 1 FROM system_configs WHERE key = 'environment' AND value = 'development') THEN
        base_time := NOW() - INTERVAL '1 hour';
        
        -- 插入最近1小时的测试数据
        FOR i IN 0..60 LOOP
            INSERT INTO system_performance_history (metric_type, metric_value, recorded_at)
            VALUES 
                ('disk', 45.5 + (RANDOM() * 10), base_time + (i || ' minutes')::INTERVAL),
                ('cpu', 25.0 + (RANDOM() * 30), base_time + (i || ' minutes')::INTERVAL),
                ('memory', 60.0 + (RANDOM() * 20), base_time + (i || ' minutes')::INTERVAL);
        END LOOP;
    END IF;
END $$;
