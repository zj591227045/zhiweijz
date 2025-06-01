const { PrismaClient } = require('@prisma/client');

// 设置数据库连接字符串
process.env.DATABASE_URL = 'postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz?schema=public';

// 初始化Prisma客户端
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('检查预算与账本的绑定关系...');

    // 1. 获取所有预算记录
    // 直接使用原始SQL查询获取预算记录，包括account_book_id字段
    const budgets = await prisma.$queryRaw`
      SELECT id, amount, period, account_book_id, user_id, family_id, budget_type, name
      FROM budgets
    `;

    console.log(`总共找到 ${budgets.length} 条预算记录`);

    // 2. 获取所有账本记录
    // 直接使用原始SQL查询获取账本记录
    const accountBooks = await prisma.$queryRaw`
      SELECT id, name, type, user_id, family_id
      FROM account_books
    `;

    console.log(`总共找到 ${accountBooks.length} 条账本记录`);

    // 3. 检查每个预算的账本ID是否存在于账本表中
    const validBudgets = [];
    const invalidBudgets = [];

    for (const budget of budgets) {
      if (!budget.account_book_id) {
        invalidBudgets.push({
          ...budget,
          reason: '预算没有关联账本ID'
        });
        continue;
      }

      const matchingAccountBook = accountBooks.find(book => book.id === budget.account_book_id);

      if (!matchingAccountBook) {
        invalidBudgets.push({
          ...budget,
          reason: '预算关联的账本ID不存在'
        });
      } else {
        validBudgets.push({
          budget,
          accountBook: matchingAccountBook
        });
      }
    }

    console.log(`\n有效预算记录: ${validBudgets.length}`);
    console.log(`无效预算记录: ${invalidBudgets.length}`);

    if (invalidBudgets.length > 0) {
      console.log('\n无效预算详情:');
      console.log(JSON.stringify(invalidBudgets, null, 2));
    }

    // 4. 检查家庭账本的预算
    const familyAccountBooks = accountBooks.filter(book => book.type === 'FAMILY');
    console.log(`\n家庭账本数量: ${familyAccountBooks.length}`);

    if (familyAccountBooks.length > 0) {
      console.log('\n家庭账本详情:');
      console.log(JSON.stringify(familyAccountBooks, null, 2));

      // 检查每个家庭账本的预算
      for (const familyBook of familyAccountBooks) {
        const familyBudgets = validBudgets.filter(item => item.accountBook.id === familyBook.id);

        console.log(`\n家庭账本 "${familyBook.name}" (ID: ${familyBook.id}) 的预算数量: ${familyBudgets.length}`);

        if (familyBudgets.length > 0) {
          console.log('预算详情:');
          console.log(JSON.stringify(familyBudgets.map(item => item.budget), null, 2));
        }

        // 检查这个家庭账本的预算是否与正确的家庭ID关联
        const mismatchedFamilyBudgets = familyBudgets.filter(
          item => item.budget.familyId !== familyBook.familyId
        );

        if (mismatchedFamilyBudgets.length > 0) {
          console.log(`\n警告: 发现 ${mismatchedFamilyBudgets.length} 条预算的家庭ID与账本的家庭ID不匹配!`);
          console.log('不匹配的预算:');
          console.log(JSON.stringify(mismatchedFamilyBudgets.map(item => ({
            budgetId: item.budget.id,
            budgetName: item.budget.name,
            budgetFamilyId: item.budget.familyId,
            accountBookFamilyId: item.accountBook.familyId
          })), null, 2));
        }
      }
    }

  } catch (error) {
    console.error('查询数据库时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
