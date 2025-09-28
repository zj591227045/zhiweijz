-- 为budget_histories表添加family_member_id字段
-- 用于支持托管成员的预算结转历史记录

-- 添加family_member_id字段
ALTER TABLE budget_histories
ADD COLUMN family_member_id VARCHAR(255) NULL;

-- 添加外键约束
ALTER TABLE budget_histories
ADD CONSTRAINT fk_budget_histories_family_member
FOREIGN KEY (family_member_id) REFERENCES family_members(id) ON DELETE CASCADE;

-- 添加索引以提高查询性能
CREATE INDEX idx_budget_histories_family_member_id ON budget_histories(family_member_id);
