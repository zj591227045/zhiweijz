/*META
VERSION: 1.7.6
DESCRIPTION: Add membership system with badges, notifications and renewal tracking
AUTHOR: Claude Code Assistant
DATE: 2024-12-15
*/

-- 会员系统迁移文件
-- 添加会员类型枚举
DO $$ BEGIN
    CREATE TYPE "MemberType" AS ENUM ('REGULAR', 'DONOR', 'LIFETIME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RenewalType" AS ENUM ('MANUAL', 'AUTO', 'ADMIN', 'UPGRADE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RenewalStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "NotificationType" AS ENUM ('EXPIRY_REMINDER_7D', 'EXPIRY_REMINDER_3D', 'EXPIRY_REMINDER_1D', 'RENEWAL_FAILED', 'MEMBERSHIP_EXPIRED', 'MEMBERSHIP_RENEWED', 'BADGE_AWARDED', 'POINTS_RESET');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 用户会员信息表
CREATE TABLE "user_memberships" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "member_type" "MemberType" NOT NULL DEFAULT 'REGULAR',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "auto_renewal" BOOLEAN NOT NULL DEFAULT false,
    "activation_method" TEXT NOT NULL DEFAULT 'registration',
    "monthly_points" INTEGER NOT NULL DEFAULT 0,
    "used_points" INTEGER NOT NULL DEFAULT 0,
    "last_points_reset" DATE,
    "selected_badge" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_memberships_pkey" PRIMARY KEY ("id")
);

-- 会员续费历史表
CREATE TABLE "membership_renewals" (
    "id" TEXT NOT NULL,
    "membership_id" TEXT NOT NULL,
    "renewal_type" "RenewalType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(10,2),
    "payment_method" TEXT,
    "status" "RenewalStatus" NOT NULL DEFAULT 'COMPLETED',
    "failure_reason" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_renewals_pkey" PRIMARY KEY ("id")
);

-- 徽章表
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "icon" VARCHAR(255) NOT NULL,
    "color" VARCHAR(7) NOT NULL DEFAULT '#FFD700',
    "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "category" VARCHAR(50) NOT NULL DEFAULT 'general',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- 用户徽章表
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "award_reason" TEXT,
    "is_displayed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- 会员通知表
CREATE TABLE "membership_notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "notification_type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "scheduled_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_notifications_pkey" PRIMARY KEY ("id")
);

-- 创建唯一约束和索引
CREATE UNIQUE INDEX "user_memberships_user_id_key" ON "user_memberships"("user_id");
CREATE UNIQUE INDEX "badges_name_unique" ON "badges"("name");
CREATE UNIQUE INDEX "user_badges_user_badge_unique" ON "user_badges"("user_id", "badge_id");

-- 用户会员信息表索引
CREATE INDEX "idx_user_membership_user_id" ON "user_memberships"("user_id");
CREATE INDEX "idx_user_membership_type" ON "user_memberships"("member_type");
CREATE INDEX "idx_user_membership_end_date" ON "user_memberships"("end_date");
CREATE INDEX "idx_user_membership_active" ON "user_memberships"("is_active");
CREATE INDEX "idx_user_membership_auto_renewal" ON "user_memberships"("auto_renewal", "end_date");

-- 会员续费历史表索引
CREATE INDEX "idx_membership_renewal_membership_id" ON "membership_renewals"("membership_id");
CREATE INDEX "idx_membership_renewal_status" ON "membership_renewals"("status");
CREATE INDEX "idx_membership_renewal_type" ON "membership_renewals"("renewal_type");
CREATE INDEX "idx_membership_renewal_created_at" ON "membership_renewals"("created_at" DESC);

-- 徽章表索引
CREATE INDEX "idx_badges_category" ON "badges"("category");
CREATE INDEX "idx_badges_rarity" ON "badges"("rarity");
CREATE INDEX "idx_badges_active" ON "badges"("is_active");
CREATE INDEX "idx_badges_sort_order" ON "badges"("sort_order");

-- 用户徽章表索引
CREATE INDEX "idx_user_badges_user_id" ON "user_badges"("user_id");
CREATE INDEX "idx_user_badges_badge_id" ON "user_badges"("badge_id");
CREATE INDEX "idx_user_badges_awarded_at" ON "user_badges"("awarded_at" DESC);
CREATE INDEX "idx_user_badges_displayed" ON "user_badges"("is_displayed");

-- 会员通知表索引
CREATE INDEX "idx_membership_notifications_user_id" ON "membership_notifications"("user_id");
CREATE INDEX "idx_membership_notifications_type" ON "membership_notifications"("notification_type");
CREATE INDEX "idx_membership_notifications_read" ON "membership_notifications"("is_read");
CREATE INDEX "idx_membership_notifications_scheduled" ON "membership_notifications"("scheduled_at");
CREATE INDEX "idx_membership_notifications_created_at" ON "membership_notifications"("created_at" DESC);

-- 添加外键约束
ALTER TABLE "user_memberships" ADD CONSTRAINT "user_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership_renewals" ADD CONSTRAINT "membership_renewals_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "user_memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 初始化默认徽章数据
INSERT INTO "badges" ("id", "name", "description", "icon", "color", "rarity", "category", "sort_order", "created_at", "updated_at") VALUES 
('donor-badge-001', '捐赠会员徽章', '感谢您对我们的支持，这是专属的捐赠会员徽章', '👑', '#FF6B6B', 'UNCOMMON', 'membership', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('early-adopter', '早期用户', '项目早期的珍贵用户', '⭐', '#4ECDC4', 'RARE', 'special', 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('active-user', '活跃用户', '连续使用30天的活跃用户', '🔥', '#45B7D1', 'COMMON', 'activity', 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('power-user', '超级用户', '月交易记录超过100笔', '💪', '#96CEB4', 'UNCOMMON', 'activity', 4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('beta-tester', '测试先锋', '参与Beta测试的用户', '🚀', '#FFEAA7', 'EPIC', 'special', 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- 为所有现有用户创建基础会员信息（普通会员）
INSERT INTO "user_memberships" ("id", "user_id", "member_type", "start_date", "activation_method", "created_at", "updated_at")
SELECT 
    gen_random_uuid()::text,
    "id",
    'REGULAR',
    CURRENT_TIMESTAMP,
    'registration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "users"
WHERE NOT EXISTS (
    SELECT 1 FROM "user_memberships" WHERE "user_id" = "users"."id"
);