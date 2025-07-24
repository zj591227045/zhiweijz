/*META
VERSION: 1.8.0
DESCRIPTION: 扩展会员系统以支持RevenueCat集成和细分会员类型
AUTHOR: System
DATE: 2025-07-23
*/

-- 1. 添加新的会员类型枚举值
ALTER TYPE "MemberType" ADD VALUE IF NOT EXISTS 'DONATION_ONE';
ALTER TYPE "MemberType" ADD VALUE IF NOT EXISTS 'DONATION_TWO';
ALTER TYPE "MemberType" ADD VALUE IF NOT EXISTS 'DONATION_THREE';

-- 2. 添加RevenueCat集成字段到user_memberships表
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS revenuecat_user_id VARCHAR(255);
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS external_product_id VARCHAR(255);
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS external_transaction_id VARCHAR(255);
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS billing_period VARCHAR(50);
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS has_charity_attribution BOOLEAN DEFAULT FALSE;
ALTER TABLE user_memberships ADD COLUMN IF NOT EXISTS has_priority_support BOOLEAN DEFAULT FALSE;

-- 3. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_membership_revenuecat_user ON user_memberships (revenuecat_user_id);
CREATE INDEX IF NOT EXISTS idx_user_membership_platform ON user_memberships (platform);
CREATE INDEX IF NOT EXISTS idx_user_membership_external_product ON user_memberships (external_product_id);

-- 4. 迁移现有数据
UPDATE user_memberships
SET
    member_type = 'DONATION_ONE',
    monthly_points = CASE WHEN monthly_points = 0 THEN 1000 ELSE monthly_points END,
    has_charity_attribution = FALSE,
    has_priority_support = FALSE,
    platform = 'manual'
WHERE member_type = 'DONOR';

-- 5. 更新现有会员的默认权益设置
UPDATE user_memberships
SET
    has_charity_attribution = CASE WHEN member_type IN ('DONATION_TWO', 'DONATION_THREE') THEN TRUE ELSE FALSE END,
    has_priority_support = CASE WHEN member_type = 'DONATION_THREE' THEN TRUE ELSE FALSE END
WHERE member_type IN ('DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE');

-- 6. 添加字段注释
COMMENT ON COLUMN user_memberships.revenuecat_user_id IS 'RevenueCat用户ID，用于关联RevenueCat订阅';
COMMENT ON COLUMN user_memberships.platform IS '订阅平台：ios, android, web';
COMMENT ON COLUMN user_memberships.external_product_id IS '外部产品ID，如App Store产品ID';
COMMENT ON COLUMN user_memberships.external_transaction_id IS '外部交易ID，如App Store交易ID';
COMMENT ON COLUMN user_memberships.billing_period IS '计费周期：monthly, yearly';
COMMENT ON COLUMN user_memberships.has_charity_attribution IS '是否拥有公益署名权益';
COMMENT ON COLUMN user_memberships.has_priority_support IS '是否拥有优先客服权益';

-- 7. 创建会员权益配置表
CREATE TABLE IF NOT EXISTS membership_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    member_type "MemberType" NOT NULL,
    entitlement_key VARCHAR(100) NOT NULL,
    entitlement_value TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(member_type, entitlement_key)
);

CREATE INDEX IF NOT EXISTS idx_membership_entitlements_member_type ON membership_entitlements (member_type);
CREATE INDEX IF NOT EXISTS idx_membership_entitlements_key ON membership_entitlements (entitlement_key);

-- 8. 更新续费历史表
ALTER TABLE membership_renewals ADD COLUMN IF NOT EXISTS external_transaction_id VARCHAR(255);
ALTER TABLE membership_renewals ADD COLUMN IF NOT EXISTS platform VARCHAR(50);

COMMENT ON COLUMN membership_renewals.external_transaction_id IS '外部交易ID，如RevenueCat交易ID';
COMMENT ON COLUMN membership_renewals.platform IS '续费平台：ios, android, web';
