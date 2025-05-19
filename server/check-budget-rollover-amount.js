const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const budgetId = '0b1060ab-4d3a-46fe-8d95-ddd3d7f9deca';
    
    // 查询预算信息
    const budget = await prisma.budget.findUnique({
      where: { id: budgetId }
    });
    
    if (!budget) {
      console.log(`预算 ${budgetId} 不存在`);
      return;
    }
    
    console.log('预算信息:');
    console.log(`ID: ${budget.id}`);
    console.log(`名称: ${budget.name}`);
    console.log(`金额: ${budget.amount}`);
    console.log(`结转金额: ${budget.rolloverAmount || 0}`);
    console.log(`启用结转: ${budget.rollover ? '是' : '否'}`);
    
    // 查询最近的结转历史记录
    const latestHistory = await prisma.budgetHistory.findFirst({
      where: { budgetId },
      orderBy: { createdAt: 'desc' }
    });
    
    if (latestHistory) {
      console.log('\n最近的结转历史记录:');
      console.log(`期间: ${latestHistory.period}`);
      console.log(`金额: ${latestHistory.amount}`);
      console.log(`类型: ${latestHistory.type}`);
      console.log(`创建时间: ${latestHistory.createdAt}`);
    } else {
      console.log('\n没有找到结转历史记录');
    }
    
    // 更新预算的结转金额
    console.log('\n是否要更新预算的结转金额? (y/n)');
    process.stdin.once('data', async (data) => {
      const answer = data.toString().trim().toLowerCase();
      
      if (answer === 'y') {
        // 计算最新的结转金额
        const histories = await prisma.budgetHistory.findMany({
          where: { budgetId },
          orderBy: { createdAt: 'desc' }
        });
        
        let rolloverAmount = 0;
        
        if (histories.length > 0) {
          // 使用最新的结转记录
          const latest = histories[0];
          rolloverAmount = latest.type === 'SURPLUS' ? Number(latest.amount) : -Number(latest.amount);
        }
        
        // 更新预算
        await prisma.budget.update({
          where: { id: budgetId },
          data: { 
            rolloverAmount,
            rollover: true // 确保启用结转
          }
        });
        
        console.log(`已更新预算结转金额为: ${rolloverAmount}`);
      } else {
        console.log('未进行更新');
      }
      
      await prisma.$disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('查询预算时出错:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
