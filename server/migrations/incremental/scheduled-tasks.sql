-- =====================================================
-- 计划任务系统数据库迁移
-- =====================================================
-- 版本: 1.8.6
-- 功能：
-- 1. 创建计划任务表（scheduled_tasks）
-- 2. 创建任务执行日志表（task_execution_logs）
-- 3. 添加必要的索引
-- 4. 插入预算更新任务（使用容器内路径）
--
-- 创建时间: 2025-11-01
-- =====================================================

-- 开始事务
BEGIN;

-- 设置时区为北京时间
SET timezone = 'Asia/Shanghai';

-- 创建计划任务表
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    script_type VARCHAR(50) NOT NULL, -- shell, sql, node
    script_path VARCHAR(500) NOT NULL,
    cron_expression VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID
);

-- 创建任务执行日志表
CREATE TABLE IF NOT EXISTS task_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL, -- pending, running, success, failed
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- 执行时长（毫秒）
    output TEXT, -- 标准输出
    error TEXT, -- 错误输出
    exit_code INTEGER, -- 退出码
    triggered_by VARCHAR(50) NOT NULL, -- cron, manual
    triggered_by_user UUID, -- 手动触发的用户ID
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_execution_logs_task FOREIGN KEY (task_id) 
        REFERENCES scheduled_tasks(id) ON DELETE CASCADE
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_execution_logs_task_id ON task_execution_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_execution_logs_status ON task_execution_logs(status);
CREATE INDEX IF NOT EXISTS idx_task_execution_logs_start_time ON task_execution_logs(start_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_tasks_is_enabled ON scheduled_tasks(is_enabled);

-- 插入预算更新任务（默认禁用，需要管理员手动启用）
-- 注意：脚本路径使用容器内路径 /app/scripts/scheduled/
INSERT INTO scheduled_tasks (
    name,
    description,
    script_type,
    script_path,
    cron_expression,
    is_enabled
) VALUES (
    '每月1日凌晨更新预算信息',
    '每月1日凌晨2点自动执行预算更新，包括：创建新月份预算、修复结转历史记录、更新结转金额',
    'shell',
    '/app/scripts/scheduled/fix_budget/run_budget_fix.sh',
    '0 2 1 * *',
    false
) ON CONFLICT DO NOTHING;

-- 提交事务
COMMIT;

-- 显示创建结果
DO $$
DECLARE
    task_count INTEGER;
    log_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO task_count FROM scheduled_tasks;
    SELECT COUNT(*) INTO log_count FROM task_execution_logs;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== 计划任务系统迁移完成 ===';
    RAISE NOTICE '计划任务表记录数: %', task_count;
    RAISE NOTICE '执行日志表记录数: %', log_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 数据库迁移成功完成';
END $$;

