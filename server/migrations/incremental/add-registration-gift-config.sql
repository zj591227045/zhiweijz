/*META
VERSION: 1.8.2
DESCRIPTION: Add registration gift points configuration to system_config table
AUTHOR: Claude Code Assistant
*/

-- 添加注册赠送记账点数量配置
INSERT INTO system_configs (key, value, description, category, created_at, updated_at)
VALUES (
  'registration_gift_points',
  '30',
  '新用户注册时赠送的记账点数量',
  'accounting_points',
  NOW(),
  NOW()
) ON CONFLICT (key) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  updated_at = NOW();

-- 验证配置是否正确插入
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM system_configs WHERE key = 'registration_gift_points') THEN
    RAISE NOTICE '✅ 注册赠送记账点配置已添加成功';
  ELSE
    RAISE WARNING '⚠️ 注册赠送记账点配置添加失败';
  END IF;
END
$$;
