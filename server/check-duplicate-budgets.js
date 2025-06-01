const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDuplicateBudgets() {
  try {
    console.log('=== 检查重复预算记录 ===');
    
    // 查找张杰的所有预算
    const allBudgets = await prisma.budget.findMany({
      where: {
        userId: 'bc5b8f6e-332f-4bca-8044-59fc475d3096'
      },
      orderBy: { startDate: 'asc' }
    });
    
    console.log(`找到 ${allBudgets.length} 个预算记录`);
    
    for (const budget of allBudgets) {
      const startDate = new Date(budget.startDate);
      const endDate = new Date(budget.endDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      
      console.log(`\n预算ID: ${budget.id}`);
      console.log(`名称: ${budget.name}`);
      console.log(`时间: ${year}年${month}月`);
      console.log(`金额: ${budget.amount}`);
      console.log(`结转: ${budget.rollover ? '是' : '否'}`);
      console.log(`结转金额: ${budget.rolloverAmount || 0}`);
      console.log(`账本ID: ${budget.accountBookId}`);
      console.log(`预算类型: ${budget.budgetType || '未知'}`);
      console.log(`分类ID: ${budget.categoryId || '无'}`);
    }
    
    // 检查是否有重复的月份预算
    console.log('\n=== 按月份分组检查 ===');
    
    const monthlyGroups = {};
    
    for (const budget of allBudgets) {
      const startDate = new Date(budget.startDate);
      const year = startDate.getFullYear();
      const month = startDate.getMonth() + 1;
      const key = `${year}-${month}`;
      
      if (!monthlyGroups[key]) {
        monthlyGroups[key] = [];
      }
      
      monthlyGroups[key].push(budget);
    }
    
    for (const [monthKey, budgets] of Object.entries(monthlyGroups)) {
      console.log(`\n${monthKey}月份预算 (${budgets.length}个):`);
      
      budgets.forEach((budget, index) => {
        console.log(`  ${index + 1}. ${budget.name} - ${budget.amount}元 (结转: ${budget.rollover ? '是' : '否'}, ID: ${budget.id.substring(0, 8)}...)`);
      });
      
      if (budgets.length > 1) {
        console.log(`  ⚠️ 发现重复预算！`);
        
        // 检查哪些是启用结转的
        const rolloverBudgets = budgets.filter(b => b.rollover);
        if (rolloverBudgets.length > 1) {
          console.log(`  ⚠️ 有 ${rolloverBudgets.length} 个预算启用了结转，这可能导致结转计算错误！`);
        }
      }
    }
    
    // 建议清理方案
    console.log('\n=== 建议清理方案 ===');
    
    for (const [monthKey, budgets] of Object.entries(monthlyGroups)) {
      if (budgets.length > 1) {
        console.log(`\n${monthKey}月份有 ${budgets.length} 个重复预算，建议保留：`);
        
        // 优先保留启用结转的预算
        const rolloverBudgets = budgets.filter(b => b.rollover);
        const nonRolloverBudgets = budgets.filter(b => !b.rollover);
        
        if (rolloverBudgets.length > 0) {
          const keepBudget = rolloverBudgets[0]; // 保留第一个启用结转的
          console.log(`  保留: ${keepBudget.name} (ID: ${keepBudget.id}) - 启用结转`);
          
          // 其他的建议删除
          const toDelete = [...rolloverBudgets.slice(1), ...nonRolloverBudgets];
          toDelete.forEach(budget => {
            console.log(`  删除: ${budget.name} (ID: ${budget.id}) - ${budget.rollover ? '启用结转' : '未启用结转'}`);
          });
        } else {
          // 如果都没有启用结转，保留第一个
          const keepBudget = budgets[0];
          console.log(`  保留: ${keepBudget.name} (ID: ${keepBudget.id}) - 未启用结转`);
          
          budgets.slice(1).forEach(budget => {
            console.log(`  删除: ${budget.name} (ID: ${budget.id}) - 未启用结转`);
          });
        }
      }
    }
    
  } catch (error) {
    console.error('检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicateBudgets();
