-- Migration: Fix missing member points for existing donor members
-- This script grants member points to existing donor members who don't have them

BEGIN;

-- First, let's check how many donor members exist without proper member points
SELECT 
    u.id,
    u.name,
    u.email,
    um.member_type,
    um.monthly_points,
    COALESCE(uap.member_balance, 0) as current_member_balance,
    COALESCE(uap.gift_balance, 0) as current_gift_balance
FROM users u
LEFT JOIN user_membership um ON u.id = um.user_id
LEFT JOIN user_accounting_points uap ON u.id = uap.user_id
WHERE um.member_type = 'DONOR' 
  AND um.is_active = true
  AND (uap.member_balance IS NULL OR uap.member_balance = 0);

-- Create accounting points records for donor members who don't have them
INSERT INTO user_accounting_points (user_id, gift_balance, member_balance, created_at, updated_at)
SELECT 
    um.user_id,
    10 as gift_balance,  -- Default daily gift
    um.monthly_points as member_balance,  -- Grant full monthly points
    NOW() as created_at,
    NOW() as updated_at
FROM user_membership um
LEFT JOIN user_accounting_points uap ON um.user_id = uap.user_id
WHERE um.member_type = 'DONOR' 
  AND um.is_active = true
  AND uap.user_id IS NULL;

-- Update existing accounting points records for donor members who have 0 member balance
UPDATE user_accounting_points uap
SET 
    member_balance = um.monthly_points,
    updated_at = NOW()
FROM user_membership um
WHERE uap.user_id = um.user_id
  AND um.member_type = 'DONOR'
  AND um.is_active = true
  AND uap.member_balance = 0
  AND um.monthly_points > 0;

-- Create transaction records for the granted member points
INSERT INTO accounting_points_transactions (
    user_id, 
    type, 
    operation, 
    points, 
    balance_type, 
    balance_after, 
    description, 
    created_at
)
SELECT 
    um.user_id,
    'member' as type,
    'add' as operation,
    um.monthly_points as points,
    'member' as balance_type,
    um.monthly_points as balance_after,
    '修复捐赠会员记账点' as description,
    NOW() as created_at
FROM user_membership um
LEFT JOIN user_accounting_points uap ON um.user_id = uap.user_id
WHERE um.member_type = 'DONOR' 
  AND um.is_active = true
  AND um.monthly_points > 0
  AND NOT EXISTS (
    SELECT 1 FROM accounting_points_transactions apt 
    WHERE apt.user_id = um.user_id 
    AND apt.description = '修复捐赠会员记账点'
  );

-- Verify the results
SELECT 
    u.id,
    u.name,
    u.email,
    um.member_type,
    um.monthly_points,
    uap.member_balance,
    uap.gift_balance,
    (uap.member_balance + uap.gift_balance) as total_balance
FROM users u
LEFT JOIN user_membership um ON u.id = um.user_id
LEFT JOIN user_accounting_points uap ON u.id = uap.user_id
WHERE um.member_type = 'DONOR' 
  AND um.is_active = true
ORDER BY u.name;

COMMIT;