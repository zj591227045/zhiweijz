/**
 * 检查预算记录脚本
 * 
 * 这个脚本用于直接查询数据库，检查是否存在与特定账本ID匹配的预算记录。
 * 
 * 使用方法：
 * 1. 确保已安装所需依赖: npm install @prisma/client
 * 2. 在终端中执行: node src/test/check-budget-records.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 要检查的账本ID
const accountBookId = 'b06549b1-2118-45e5-96e1-cce1ce8b484c';

// 检查数据库中是否存在与特定账本ID匹配的预算记录
async function checkBudgetRecords() {
  try {
    console.log(`检查账本ID为 ${accountBookId} 的预算记录...`);
    
    // 查询所有预算记录
    const allBudgets = await prisma.budget.findMany({
      take: 10,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`数据库中最近的 ${allBudgets.length} 条预算记录:`);
    allBudgets.forEach(budget => {
      console.log(`ID: ${budget.id}, 名称: ${budget.name}, 账本ID: ${budget.accountBookId}, 类型: ${budget.budgetType}`);
    });
    
    // 查询与特定账本ID匹配的预算记录
    const matchingBudgets = await prisma.budget.findMany({
      where: {
        accountBookId: accountBookId
      }
    });
    
    console.log(`\n找到 ${matchingBudgets.length} 条与账本ID ${accountBookId} 匹配的预算记录`);
    
    if (matchingBudgets.length > 0) {
      matchingBudgets.forEach(budget => {
        console.log(`ID: ${budget.id}, 名称: ${budget.name}, 类型: ${budget.budgetType}, 用户ID: ${budget.userId}`);
      });
    } else {
      console.log('没有找到匹配的预算记录');
      
      // 检查账本是否存在
      const accountBook = await prisma.accountBook.findUnique({
        where: {
          id: accountBookId
        }
      });
      
      if (accountBook) {
        console.log(`\n账本存在，详情如下:`);
        console.log(`ID: ${accountBook.id}, 名称: ${accountBook.name}, 用户ID: ${accountBook.userId}, 类型: ${accountBook.type}`);
      } else {
        console.log(`\n账本ID ${accountBookId} 不存在`);
      }
    }
    
    // 查询所有账本
    const allAccountBooks = await prisma.accountBook.findMany({
      take: 5,
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`\n数据库中最近的 ${allAccountBooks.length} 条账本记录:`);
    allAccountBooks.forEach(book => {
      console.log(`ID: ${book.id}, 名称: ${book.name}, 用户ID: ${book.userId}, 类型: ${book.type}`);
    });
    
  } catch (error) {
    console.error('查询数据库时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行检查
checkBudgetRecords().catch(error => {
  console.error('执行脚本时发生错误:', error);
  prisma.$disconnect();
});
