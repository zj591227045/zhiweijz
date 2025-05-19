const { PrismaClient } = require('@prisma/client');

// 设置数据库连接字符串
process.env.DATABASE_URL = 'postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz?schema=public';

// 初始化Prisma客户端
const prisma = new PrismaClient();

async function main() {
  try {
    // 获取Budget模型的字段信息
    console.log('Budget模型的字段:');
    console.log(Object.keys(prisma.budget.fields));
    
    // 查询数据库中budgets表的结构
    const budgetTableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'budgets'
      ORDER BY ordinal_position;
    `;
    
    console.log('\nbudgets表的结构:');
    console.log(budgetTableInfo);
    
    // 查询一条预算记录作为示例
    const sampleBudget = await prisma.budget.findFirst();
    
    if (sampleBudget) {
      console.log('\n预算记录示例:');
      console.log(sampleBudget);
    } else {
      console.log('\n没有找到预算记录');
    }
    
  } catch (error) {
    console.error('查询数据库时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
