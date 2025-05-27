-- Add foreign key constraints for account_books
ALTER TABLE "account_books" ADD CONSTRAINT "account_books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_books" ADD CONSTRAINT "account_books_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_books" ADD CONSTRAINT "account_books_user_llm_setting_id_fkey" FOREIGN KEY ("user_llm_setting_id") REFERENCES "user_llm_settings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add foreign key constraints for user_llm_settings
ALTER TABLE "user_llm_settings" ADD CONSTRAINT "user_llm_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for account_llm_settings
ALTER TABLE "account_llm_settings" ADD CONSTRAINT "account_llm_settings_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for category_budgets
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_budgets" ADD CONSTRAINT "category_budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for user_category_configs
ALTER TABLE "user_category_configs" ADD CONSTRAINT "user_category_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_category_configs" ADD CONSTRAINT "user_category_configs_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for budget_histories
ALTER TABLE "budget_histories" ADD CONSTRAINT "budget_histories_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for sessions
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for verification_codes
ALTER TABLE "verification_codes" ADD CONSTRAINT "verification_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for security_logs
ALTER TABLE "security_logs" ADD CONSTRAINT "security_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add foreign key constraints for existing tables with new fields
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_family_member_id_fkey" FOREIGN KEY ("family_member_id") REFERENCES "family_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "categories" ADD CONSTRAINT "categories_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;
