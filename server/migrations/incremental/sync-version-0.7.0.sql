/*META
VERSION: 1.8.1
DESCRIPTION: 同步应用版本到0.7.0 - 更新数据库中的版本记录
AUTHOR: zhiweijz-team
*/

-- =======================================
-- 增量迁移：数据库版本1.8.1 - 同步应用版本到0.7.0
-- 更新数据库中的app_versions表，确保版本记录与代码版本一致
-- 数据库增量版本：1.8.1
-- 应用程序版本：0.7.0
-- =======================================

-- 1. 为WEB平台创建或更新0.7.0版本记录
INSERT INTO app_versions (
    platform, 
    version, 
    build_number, 
    version_code, 
    release_notes, 
    is_enabled, 
    published_at, 
    created_at, 
    updated_at
) VALUES (
    'WEB', 
    '0.7.0', 
    700, 
    700, 
    '版本 0.7.0 - 功能优化和问题修复', 
    true, 
    NOW(), 
    NOW(), 
    NOW()
) ON CONFLICT (platform, version) DO UPDATE SET 
    build_number = EXCLUDED.build_number,
    version_code = EXCLUDED.version_code,
    release_notes = EXCLUDED.release_notes,
    is_enabled = EXCLUDED.is_enabled,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- 2. 为iOS平台创建或更新0.7.0版本记录
INSERT INTO app_versions (
    platform, 
    version, 
    build_number, 
    version_code, 
    release_notes, 
    is_enabled, 
    published_at, 
    created_at, 
    updated_at
) VALUES (
    'IOS', 
    '0.7.0', 
    700, 
    700, 
    '版本 0.7.0 - 功能优化和问题修复', 
    true, 
    NOW(), 
    NOW(), 
    NOW()
) ON CONFLICT (platform, version) DO UPDATE SET 
    build_number = EXCLUDED.build_number,
    version_code = EXCLUDED.version_code,
    release_notes = EXCLUDED.release_notes,
    is_enabled = EXCLUDED.is_enabled,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- 3. 为Android平台创建或更新0.7.0版本记录
INSERT INTO app_versions (
    platform, 
    version, 
    build_number, 
    version_code, 
    release_notes, 
    is_enabled, 
    published_at, 
    created_at, 
    updated_at
) VALUES (
    'ANDROID', 
    '0.7.0', 
    700, 
    700, 
    '版本 0.7.0 - 功能优化和问题修复', 
    true, 
    NOW(), 
    NOW(), 
    NOW()
) ON CONFLICT (platform, version) DO UPDATE SET 
    build_number = EXCLUDED.build_number,
    version_code = EXCLUDED.version_code,
    release_notes = EXCLUDED.release_notes,
    is_enabled = EXCLUDED.is_enabled,
    published_at = EXCLUDED.published_at,
    updated_at = NOW();

-- 4. 禁用旧版本（可选，保持旧版本记录但标记为不启用）
-- 这里我们保持旧版本启用状态，以便用户可以查看历史版本
-- 如果需要禁用旧版本，可以取消注释以下语句：
-- UPDATE app_versions SET is_enabled = false WHERE version != '0.7.0' AND is_enabled = true;
