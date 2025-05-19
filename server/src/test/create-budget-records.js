/**
 * 创建预算记录脚本
 * 
 * 这个脚本用于为指定的账本创建预算记录，包括个人预算和通用预算。
 * 
 * 使用方法：
 * 1. 确保已安装所需依赖: npm install @prisma/client
 * 2. 在终端中执行: node src/test/create-budget-records.js
 */

const { PrismaClient, BudgetType, BudgetPeriod } = require('@prisma/client');
const prisma = new PrismaClient();

// 要创建预算的账本ID和用户ID
const accountBookId = 'b06549b1-2118-45e5-96e1-cce1ce8b484c';
const userId = 'bd8cedbe-4c23-4d79-9ddd-2b8df8a68ef8';

// 创建预算记录
async function createBudgetRecords() {
  try {
    console.log(`为账本ID ${accountBookId} 创建预算记录...`);
    
    // 检查账本是否存在
    const accountBook = await prisma.accountBook.findUnique({
      where: {
        id: accountBookId
      }
    });
    
    if (!accountBook) {
      console.log(`账本ID ${accountBookId} 不存在，无法创建预算`);
      return;
    }
    
    console.log(`找到账本: ${accountBook.name}`);
    
    // 创建个人预算
    const personalBudget = await prisma.budget.create({
      data: {
        name: '月度个人预算',
        amount: 5000,
        period: BudgetPeriod.MONTHLY,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        rollover: false,
        userId: userId,
        accountBookId: accountBookId,
        enableCategoryBudget: false,
        isAutoCalculated: false,
        budgetType: BudgetType.PERSONAL
      }
    });
    
    console.log(`创建个人预算成功，ID: ${personalBudget.id}`);
    
    // 创建通用预算
    const generalBudget = await prisma.budget.create({
      data: {
        name: '长期通用预算',
        amount: 10000,
        period: BudgetPeriod.MONTHLY,
        startDate: new Date(),
        endDate: new Date(new Date().setMonth(new Date().getMonth() + 6)),
        rollover: false,
        userId: userId,
        accountBookId: accountBookId,
        enableCategoryBudget: false,
        isAutoCalculated: false,
        budgetType: BudgetType.GENERAL
      }
    });
    
    console.log(`创建通用预算成功，ID: ${generalBudget.id}`);
    
    console.log('\n预算创建完成，现在可以测试API了');
    
  } catch (error) {
    console.error('创建预算记录时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行创建
createBudgetRecords().catch(error => {
  console.error('执行脚本时发生错误:', error);
  prisma.$disconnect();
});
