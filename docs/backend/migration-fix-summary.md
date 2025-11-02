# 迁移文件ON CONFLICT错误修复总结

## 问题描述

在执行v1.8.10迁移`fix-internal-tasks-display.sql`时遇到错误：
```
ERROR: there is no unique or exclusion constraint matching the ON CONFLICT specification
```

## 🔍 根因分析

### 问题原因：
1. **错误的ON CONFLICT语法**：原文件使用了`ON CONFLICT (script_type, script_path) DO UPDATE SET`
2. **缺少唯一约束**：`scheduled_tasks`表中没有`(script_type, script_path)`的唯一约束
3. **显式UUID问题**：仍然包含显式的`id`字段和`gen_random_uuid()`调用

### 原错误代码：
```sql
INSERT INTO scheduled_tasks (
    id, name, description, script_type, script_path, cron_expression, is_enabled, created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '用户注销请求处理',
    '检查并处理过期的用户注销请求，自动删除到期用户数据',
    'internal',
    'user-deletion-check',
    '0 0 * * *',
    true,
    NOW(),
    NOW()
) ON CONFLICT (script_type, script_path) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    -- ...
```

## 🔧 修复方案

### 解决策略：
使用存储过程实现UPSERT逻辑，避免依赖ON CONFLICT约束：

```sql
CREATE OR REPLACE FUNCTION ensure_internal_task(
    p_name TEXT,
    p_description TEXT,
    p_script_path TEXT,
    p_cron_expression TEXT,
    p_should_be_enabled BOOLEAN
) RETURNS VOID AS $$
DECLARE
    existing_task RECORD;
BEGIN
    -- 检查任务是否已存在
    SELECT * INTO existing_task
    FROM scheduled_tasks
    WHERE script_type = 'internal' AND script_path = p_script_path;

    IF existing_task IS NULL THEN
        -- 任务不存在，插入新任务（不包含id字段）
        INSERT INTO scheduled_tasks (
            name, description, script_type, script_path, cron_expression, is_enabled
        ) VALUES (
            p_name, p_description, 'internal', p_script_path, p_cron_expression, p_should_be_enabled
        );
    ELSE
        -- 任务存在，更新状态
        UPDATE scheduled_tasks
        SET name = p_name, description = p_description, cron_expression = p_cron_expression,
            is_enabled = p_should_be_enabled, updated_at = NOW()
        WHERE id = existing_task.id;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

## 📋 修复内容

### 修复的文件：
- `migrations/incremental/fix-internal-tasks-display.sql`

### 关键改进：
1. ✅ 移除所有显式的`id`字段
2. ✅ 移除`gen_random_uuid()`调用
3. ✅ 使用存储过程实现安全的UPSERT
4. ✅ 不依赖表的唯一约束
5. ✅ 确保前6个任务启用，后2个任务禁用

### 保留的备份文件：
- `fix-internal-tasks-display-broken.sql` - 原错误文件备份
- `add-internal-scheduled-tasks-original.sql` - v1.8.7原文件备份

## 🎯 修复效果

### 测试结果：
- ✅ 语法验证通过
- ✅ 包含8个任务调用
- ✅ 6个任务启用，2个任务禁用
- ✅ 不包含显式UUID字段
- ✅ 使用安全的UPSERT逻辑

### 预期行为：
1. **诊断现有任务**：检查数据库中已存在的内部任务
2. **创建缺失任务**：为不存在的任务创建记录
3. **更新现有任务**：确保任务名称、描述和状态正确
4. **清理备份文件**：自动删除临时存储过程

## 🚀 部署说明

修复完成后，可以重新运行迁移：

```bash
# 重新启动后端服务，自动执行迁移
npm run dev

# 或手动运行迁移
npm run migrate:upgrade
```

## 📊 最终状态

修复完成后应该看到：

### ✅ 已启用的6个任务：
1. 用户注销请求处理 (user-deletion-check)
2. 会员到期检查 (membership-expiry-check)
3. 微信媒体文件清理 (wechat-media-cleanup)
4. 数据聚合（手动执行） (data-aggregation-manual)
5. 对象存储临时文件清理 (storage-temp-files-cleanup)
6. 预算结转和创建 (budget-rollover-and-creation)

### ⚠️ 保持禁用的2个任务：
1. 数据库备份 (database-backup) - 需要WebDAV配置
2. S3对象存储备份 (s3-backup) - 需要WebDAV配置

## 🔍 技术细节

### 为什么使用存储过程：
1. **避免约束依赖**：不依赖表的唯一约束
2. **原子操作**：检查和插入/更新在一个事务中完成
3. **灵活性**：可以处理更复杂的业务逻辑
4. **可读性**：代码更清晰，易于理解和维护

### 与其他迁移的兼容性：
- v1.8.7：添加内部任务的基础迁移
- v1.8.8：添加config字段支持
- v1.8.9：启用默认任务的迁移
- v1.8.10：修复显示问题的诊断和修复迁移

每个迁移都是独立的，可以安全地按顺序执行。

---

**修复完成时间**: 2025-11-02
**问题类型**: PostgreSQL ON CONFLICT语法错误
**解决方案**: 使用存储过程实现安全的UPSERT逻辑
**影响范围**: v1.8.10迁移文件