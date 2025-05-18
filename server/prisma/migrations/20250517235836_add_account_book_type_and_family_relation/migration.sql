-- CreateEnum
CREATE TYPE "AccountBookType" AS ENUM ('PERSONAL', 'FAMILY');

-- AlterTable
ALTER TABLE "account_books" ADD COLUMN     "family_id" TEXT,
ADD COLUMN     "type" "AccountBookType" NOT NULL DEFAULT 'PERSONAL';

-- AddForeignKey
ALTER TABLE "account_books" ADD CONSTRAINT "account_books_family_id_fkey" FOREIGN KEY ("family_id") REFERENCES "families"("id") ON DELETE SET NULL ON UPDATE CASCADE;
