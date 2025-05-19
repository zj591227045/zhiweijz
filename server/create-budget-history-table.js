const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 检查表是否存在
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public'
        AND table_name = 'budget_histories'
      );
    `;
    
    if (!tableExists[0].exists) {
      console.log('Creating budget_histories table...');
      
      // 创建表
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS "budget_histories" (
          "id" TEXT NOT NULL,
          "budget_id" TEXT NOT NULL,
          "period" TEXT NOT NULL,
          "amount" DECIMAL(10,2) NOT NULL,
          "type" "RolloverType" NOT NULL,
          "description" TEXT,
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "budget_histories_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "budget_histories_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `;
      
      console.log('budget_histories table created successfully!');
    } else {
      console.log('budget_histories table already exists.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
