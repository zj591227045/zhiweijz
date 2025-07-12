/*META
VERSION: 1.7.5
DESCRIPTION: 为用户记账点表添加最后一次每日赠送日期字段，支持基于首次访问的日活跃赠送
AUTHOR: system
DATE: 2025-07-12
*/

-- 为用户记账点表添加最后一次每日赠送日期字段
ALTER TABLE user_accounting_points 
ADD COLUMN IF NOT EXISTS last_daily_gift_date DATE;

-- 为新字段创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_accounting_points_last_daily_gift_date 
ON user_accounting_points(last_daily_gift_date);

-- 为用户记账点表添加复合索引，用于快速检查用户今天是否已获得赠送
CREATE INDEX IF NOT EXISTS idx_user_accounting_points_user_gift_date 
ON user_accounting_points(user_id, last_daily_gift_date);