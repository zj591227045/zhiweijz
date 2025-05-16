-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "account_book_id" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "account_book_id" TEXT;

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "account_book_id" TEXT;

-- CreateTable
CREATE TABLE "account_books" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "user_id" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_llm_settings" (
    "id" TEXT NOT NULL,
    "account_book_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'openai',
    "model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "api_key" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "max_tokens" INTEGER NOT NULL DEFAULT 1000,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_llm_settings_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_books" ADD CONSTRAINT "account_books_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_llm_settings" ADD CONSTRAINT "account_llm_settings_account_book_id_fkey" FOREIGN KEY ("account_book_id") REFERENCES "account_books"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
