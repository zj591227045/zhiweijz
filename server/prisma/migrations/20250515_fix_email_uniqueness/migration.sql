-- AlterTable
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
    ) THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");
    END IF;
END $$;
