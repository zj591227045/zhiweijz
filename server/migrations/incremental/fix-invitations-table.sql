/*META
VERSION: 1.7.13
DESCRIPTION: Fix invitations table - add missing is_used, used_at, used_by_user_id, used_by_user_name fields
AUTHOR: Claude Code Assistant
*/

-- 修复邀请表结构，添加缺失的字段以匹配Prisma模型

-- ========================================
-- 修复邀请表结构
-- ========================================

-- 1. 添加 is_used 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE invitations ADD COLUMN is_used BOOLEAN DEFAULT false;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column is_used already exists';
END $$;

-- 2. 添加 used_at 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE invitations ADD COLUMN used_at TIMESTAMP WITHOUT TIME ZONE;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column used_at already exists';
END $$;

-- 3. 添加 used_by_user_id 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE invitations ADD COLUMN used_by_user_id TEXT;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column used_by_user_id already exists';
END $$;

-- 4. 添加 used_by_user_name 字段（如果不存在）
DO $$ BEGIN
    ALTER TABLE invitations ADD COLUMN used_by_user_name TEXT;
EXCEPTION
    WHEN duplicate_column THEN
        RAISE NOTICE 'Column used_by_user_name already exists';
END $$;

-- 5. 确保 is_used 字段有正确的默认值
DO $$ BEGIN
    ALTER TABLE invitations ALTER COLUMN is_used SET DEFAULT false;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set default value for is_used column';
END $$;

-- 6. 更新现有记录的 is_used 字段为 false（如果为 NULL）
UPDATE invitations SET is_used = false WHERE is_used IS NULL;

-- 7. 设置 is_used 字段为 NOT NULL
DO $$ BEGIN
    ALTER TABLE invitations ALTER COLUMN is_used SET NOT NULL;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Could not set is_used column to NOT NULL';
END $$;
