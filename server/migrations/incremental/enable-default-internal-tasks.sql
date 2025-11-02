-- =====================================================
-- 启用指定的内部计划任务
-- =====================================================
-- 版本: 1.8.8
-- 功能：启用指定的内部计划任务（用户请求的6个任务）
--
-- 创建时间: 2025-11-02
-- =====================================================

-- 开始事务
BEGIN;

-- 设置时区为北京时间
SET timezone = 'Asia/Shanghai';

-- 启用用户注销请求处理任务
UPDATE scheduled_tasks
SET is_enabled = true, updated_at = NOW()
WHERE script_path = 'user-deletion-check' AND script_type = 'internal';

-- 启用会员到期检查任务
UPDATE scheduled_tasks
SET is_enabled = true, updated_at = NOW()
WHERE script_path = 'membership-expiry-check' AND script_type = 'internal';

-- 启用微信媒体文件清理任务
UPDATE scheduled_tasks
SET is_enabled = true, updated_at = NOW()
WHERE script_path = 'wechat-media-cleanup' AND script_type = 'internal';

-- 启用数据聚合任务（手动执行）
UPDATE scheduled_tasks
SET is_enabled = true, updated_at = NOW()
WHERE script_path = 'data-aggregation-manual' AND script_type = 'internal';

-- 启用对象存储临时文件清理任务
UPDATE scheduled_tasks
SET is_enabled = true, updated_at = NOW()
WHERE script_path = 'storage-temp-files-cleanup' AND script_type = 'internal';

-- 启用预算结转和创建任务
UPDATE scheduled_tasks
SET is_enabled = true, updated_at = NOW()
WHERE script_path = 'budget-rollover-and-creation' AND script_type = 'internal';

-- 提交事务
COMMIT;

-- 显示更新结果
DO $$
DECLARE
    enabled_count INTEGER;
    total_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO enabled_count
    FROM scheduled_tasks
    WHERE script_type = 'internal' AND is_enabled = true;

    SELECT COUNT(*) INTO total_count
    FROM scheduled_tasks
    WHERE script_type = 'internal';

    RAISE NOTICE '';
    RAISE NOTICE '=== 内部任务启用状态更新完成 ===';
    RAISE NOTICE '已启用的内部任务数: %', enabled_count;
    RAISE NOTICE '内部任务总数: %', total_count;
    RAISE NOTICE '';
    RAISE NOTICE '✅ 已成功启用以下6个任务:';
    RAISE NOTICE '1. 用户注销请求处理 (user-deletion-check)';
    RAISE NOTICE '2. 会员到期检查 (membership-expiry-check)';
    RAISE NOTICE '3. 微信媒体文件清理 (wechat-media-cleanup)';
    RAISE NOTICE '4. 数据聚合（手动执行） (data-aggregation-manual)';
    RAISE NOTICE '5. 对象存储临时文件清理 (storage-temp-files-cleanup)';
    RAISE NOTICE '6. 预算结转和创建 (budget-rollover-and-creation)';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  以下2个任务保持禁用状态:';
    RAISE NOTICE '7. 数据库备份 (database-backup) - 需要WebDAV配置';
    RAISE NOTICE '8. S3对象存储备份 (s3-backup) - 需要WebDAV配置';
    RAISE NOTICE '';
    RAISE NOTICE '💡 提示：请确保已正确配置相关服务（如WebDAV）后再启用备份任务';
END $$;