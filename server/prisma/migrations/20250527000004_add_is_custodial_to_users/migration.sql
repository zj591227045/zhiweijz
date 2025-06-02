-- Add is_custodial field to users table for custodial member architecture
-- This field allows users to be marked as custodial (managed) users that cannot login

-- Check if the column already exists before adding it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_custodial'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "is_custodial" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;
