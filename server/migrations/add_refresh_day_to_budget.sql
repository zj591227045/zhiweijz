-- Migration: Add refresh_day field to budgets table
-- This migration adds support for custom budget refresh dates

-- Add refresh_day column to budgets table
ALTER TABLE "budgets" ADD COLUMN "refresh_day" INTEGER DEFAULT 1;

-- Add comment to explain the field
COMMENT ON COLUMN "budgets"."refresh_day" IS 'Day of month when budget refreshes (1, 5, 10, 15, 20, 25)';

-- Add check constraint to ensure valid refresh day values
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_refresh_day_check" 
CHECK ("refresh_day" IN (1, 5, 10, 15, 20, 25));

-- Update existing budgets to have refresh_day = 1 (default behavior)
UPDATE "budgets" SET "refresh_day" = 1 WHERE "refresh_day" IS NULL;

-- Make refresh_day NOT NULL after setting default values
ALTER TABLE "budgets" ALTER COLUMN "refresh_day" SET NOT NULL;
