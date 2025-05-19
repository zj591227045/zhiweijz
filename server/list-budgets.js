const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 获取所有预算
    const budgets = await prisma.budget.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`找到 ${budgets.length} 个预算:`);
    
    budgets.forEach(budget => {
      console.log(`ID: ${budget.id}, 名称: ${budget.name}, 金额: ${budget.amount}, 类型: ${budget.budgetType}`);
    });
  } catch (error) {
    console.error('查询预算时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
