/*META
VERSION: 1.7.7
DESCRIPTION: Add comprehensive payment system with orders, subscriptions, and history
AUTHOR: Claude Code Assistant
DATE: 2024-12-19
*/

-- 支付系统迁移文件
-- 添加支付相关枚举类型（如果不存在）
DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('manual', 'admin', 'alipay', 'wechat', 'apple_iap');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'paid', 'failed', 'cancelled', 'refunded', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired', 'paused', 'past_due');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentTransactionType" AS ENUM ('payment', 'refund', 'chargeback', 'subscription', 'upgrade');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 支付订单表
CREATE TABLE "payment_orders" (
    "id" SERIAL PRIMARY KEY,
    "order_no" VARCHAR(64) NOT NULL UNIQUE,
    "user_id" TEXT NOT NULL,
    "membership_level" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "platform" VARCHAR(50) NOT NULL DEFAULT 'web',
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "external_order_id" VARCHAR(255),
    "external_transaction_id" VARCHAR(255),
    "paid_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB DEFAULT '{}',
    "payment_params" JSONB DEFAULT '{}'
);

-- 订阅管理表
CREATE TABLE "subscriptions" (
    "id" SERIAL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "external_subscription_id" VARCHAR(255) NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "payment_provider" VARCHAR(50) NOT NULL,
    "membership_level" VARCHAR(50) NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'active',
    "billing_period" VARCHAR(20) NOT NULL, -- 'monthly', 'quarterly', 'yearly'
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "next_billing_date" TIMESTAMP(3),
    "cancel_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_reason" TEXT,
    "trial_start" TIMESTAMP(3),
    "trial_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB DEFAULT '{}'
);

-- 支付历史表
CREATE TABLE "payment_history" (
    "id" SERIAL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "order_id" INTEGER,
    "subscription_id" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_provider" VARCHAR(50),
    "transaction_type" "PaymentTransactionType" NOT NULL DEFAULT 'payment',
    "status" VARCHAR(50) NOT NULL,
    "external_transaction_id" VARCHAR(255),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT,
    "failure_reason" TEXT,
    "metadata" JSONB DEFAULT '{}'
);

-- 支付配置表
CREATE TABLE "payment_configs" (
    "id" SERIAL PRIMARY KEY,
    "provider" VARCHAR(50) NOT NULL UNIQUE,
    "platform" VARCHAR(50) NOT NULL DEFAULT 'all',
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_sandbox" BOOLEAN NOT NULL DEFAULT true,
    "config_data" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Webhook日志表
CREATE TABLE "webhook_logs" (
    "id" SERIAL PRIMARY KEY,
    "provider" VARCHAR(50) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "event_id" VARCHAR(255),
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 退款记录表
CREATE TABLE "refunds" (
    "id" SERIAL PRIMARY KEY,
    "order_id" INTEGER NOT NULL,
    "refund_no" VARCHAR(64) NOT NULL UNIQUE,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'CNY',
    "reason" TEXT,
    "status" VARCHAR(50) NOT NULL DEFAULT 'pending',
    "external_refund_id" VARCHAR(255),
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB DEFAULT '{}'
);

-- 创建索引

-- 支付订单表索引
CREATE INDEX IF NOT EXISTS "idx_payment_orders_user_id" ON "payment_orders"("user_id");
CREATE INDEX IF NOT EXISTS "idx_payment_orders_status" ON "payment_orders"("status");
CREATE INDEX IF NOT EXISTS "idx_payment_orders_payment_method" ON "payment_orders"("payment_method");
CREATE INDEX IF NOT EXISTS "idx_payment_orders_created_at" ON "payment_orders"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_payment_orders_external_order_id" ON "payment_orders"("external_order_id");
CREATE INDEX IF NOT EXISTS "idx_payment_orders_expires_at" ON "payment_orders"("expires_at");

-- 订阅管理表索引
CREATE INDEX IF NOT EXISTS "idx_subscriptions_user_id" ON "subscriptions"("user_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_status" ON "subscriptions"("status");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_external_id" ON "subscriptions"("external_subscription_id");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_platform" ON "subscriptions"("platform");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_next_billing" ON "subscriptions"("next_billing_date");
CREATE INDEX IF NOT EXISTS "idx_subscriptions_current_period" ON "subscriptions"("current_period_start", "current_period_end");

-- 支付历史表索引
CREATE INDEX IF NOT EXISTS "idx_payment_history_user_id" ON "payment_history"("user_id");
CREATE INDEX IF NOT EXISTS "idx_payment_history_order_id" ON "payment_history"("order_id");
CREATE INDEX IF NOT EXISTS "idx_payment_history_subscription_id" ON "payment_history"("subscription_id");
CREATE INDEX IF NOT EXISTS "idx_payment_history_created_at" ON "payment_history"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_payment_history_transaction_type" ON "payment_history"("transaction_type");
CREATE INDEX IF NOT EXISTS "idx_payment_history_status" ON "payment_history"("status");

-- 支付配置表索引
CREATE INDEX IF NOT EXISTS "idx_payment_configs_provider" ON "payment_configs"("provider");
CREATE INDEX IF NOT EXISTS "idx_payment_configs_enabled" ON "payment_configs"("is_enabled");

-- Webhook日志表索引
CREATE INDEX IF NOT EXISTS "idx_webhook_logs_provider" ON "webhook_logs"("provider");
CREATE INDEX IF NOT EXISTS "idx_webhook_logs_event_type" ON "webhook_logs"("event_type");
CREATE INDEX IF NOT EXISTS "idx_webhook_logs_processed" ON "webhook_logs"("processed");
CREATE INDEX IF NOT EXISTS "idx_webhook_logs_created_at" ON "webhook_logs"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_webhook_logs_event_id" ON "webhook_logs"("event_id");

-- 退款记录表索引
CREATE INDEX IF NOT EXISTS "idx_refunds_order_id" ON "refunds"("order_id");
CREATE INDEX IF NOT EXISTS "idx_refunds_status" ON "refunds"("status");
CREATE INDEX IF NOT EXISTS "idx_refunds_created_at" ON "refunds"("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_refunds_external_refund_id" ON "refunds"("external_refund_id");

-- 添加外键约束
ALTER TABLE "payment_orders" ADD CONSTRAINT "payment_orders_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_user_id_fkey" 
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_order_id_fkey" 
    FOREIGN KEY ("order_id") REFERENCES "payment_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "payment_history" ADD CONSTRAINT "payment_history_subscription_id_fkey" 
    FOREIGN KEY ("subscription_id") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_fkey" 
    FOREIGN KEY ("order_id") REFERENCES "payment_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 初始化支付配置数据
INSERT INTO "payment_configs" ("provider", "platform", "is_enabled", "is_sandbox", "config_data", "created_at", "updated_at") VALUES
('mock', 'all', true, true, '{"name": "Mock Payment Provider", "description": "Development and testing payment provider"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('alipay', 'web', false, true, '{"name": "Alipay", "description": "Alipay payment integration"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('alipay', 'mobile', false, true, '{"name": "Alipay Mobile", "description": "Alipay mobile payment integration"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('wechat', 'web', false, true, '{"name": "WeChat Pay", "description": "WeChat Pay web integration"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('wechat', 'mobile', false, true, '{"name": "WeChat Pay Mobile", "description": "WeChat Pay mobile integration"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('revenuecat', 'ios', false, true, '{"name": "RevenueCat iOS", "description": "Apple In-App Purchase via RevenueCat"}', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (provider) DO NOTHING;

-- 创建触发器函数，用于自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为相关表添加 updated_at 触发器
CREATE TRIGGER update_payment_orders_updated_at BEFORE UPDATE ON "payment_orders"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON "subscriptions"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_configs_updated_at BEFORE UPDATE ON "payment_configs"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_refunds_updated_at BEFORE UPDATE ON "refunds"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();