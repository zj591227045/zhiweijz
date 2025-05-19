const { PrismaClient } = require('@prisma/client');

// 设置数据库连接字符串
process.env.DATABASE_URL = 'postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz?schema=public';

// 初始化Prisma客户端
const prisma = new PrismaClient();

/**
 * 修复重复的家庭账本问题
 * 1. 查找同一家庭下的多个账本
 * 2. 保留默认账本或最早创建的账本
 * 3. 将其他账本的预算转移到保留的账本
 * 4. 删除多余的账本
 */
async function fixDuplicateFamilyAccounts() {
  try {
    console.log('开始修复重复的家庭账本...');

    // 获取所有家庭
    const families = await prisma.family.findMany();
    console.log(`找到 ${families.length} 个家庭`);

    for (const family of families) {
      // 获取该家庭的所有账本
      const familyAccounts = await prisma.accountBook.findMany({
        where: {
          familyId: family.id,
          type: 'FAMILY',
        },
        orderBy: [
          { isDefault: 'desc' }, // 默认账本优先
          { createdAt: 'asc' },  // 然后是最早创建的
        ],
      });

      if (familyAccounts.length <= 1) {
        console.log(`家庭 "${family.name}" (ID: ${family.id}) 没有重复账本，跳过`);
        continue;
      }

      console.log(`家庭 "${family.name}" (ID: ${family.id}) 有 ${familyAccounts.length} 个账本，需要修复`);

      // 保留第一个账本（默认账本或最早创建的）
      const accountToKeep = familyAccounts[0];
      const accountsToRemove = familyAccounts.slice(1);

      console.log(`将保留账本: "${accountToKeep.name}" (ID: ${accountToKeep.id})`);
      console.log(`将删除 ${accountsToRemove.length} 个重复账本`);

      // 处理每个需要删除的账本
      for (const accountToRemove of accountsToRemove) {
        // 查找关联到这个账本的预算
        const budgets = await prisma.budget.findMany({
          where: {
            accountBookId: accountToRemove.id,
          },
        });

        console.log(`账本 "${accountToRemove.name}" (ID: ${accountToRemove.id}) 有 ${budgets.length} 个预算需要转移`);

        // 转移预算到保留的账本
        for (const budget of budgets) {
          // 检查保留账本中是否已有相同用户的相同类型预算
          const existingBudget = await prisma.budget.findFirst({
            where: {
              accountBookId: accountToKeep.id,
              userId: budget.userId,
              budgetType: budget.budgetType,
            },
          });

          if (existingBudget) {
            console.log(`保留账本中已有用户 ${budget.userId} 的 ${budget.budgetType} 类型预算，跳过转移预算 ${budget.id}`);
            continue;
          }

          // 更新预算的账本ID
          await prisma.budget.update({
            where: {
              id: budget.id,
            },
            data: {
              accountBookId: accountToKeep.id,
            },
          });

          console.log(`已将预算 "${budget.name}" (ID: ${budget.id}) 从账本 ${accountToRemove.id} 转移到账本 ${accountToKeep.id}`);
        }

        // 查找关联到这个账本的交易
        const transactions = await prisma.transaction.findMany({
          where: {
            accountBookId: accountToRemove.id,
          },
        });

        console.log(`账本 "${accountToRemove.name}" (ID: ${accountToRemove.id}) 有 ${transactions.length} 个交易需要转移`);

        // 转移交易到保留的账本
        for (const transaction of transactions) {
          await prisma.transaction.update({
            where: {
              id: transaction.id,
            },
            data: {
              accountBookId: accountToKeep.id,
            },
          });
        }

        // 删除账本
        try {
          await prisma.accountBook.delete({
            where: {
              id: accountToRemove.id,
            },
          });
          console.log(`已删除重复账本 "${accountToRemove.name}" (ID: ${accountToRemove.id})`);
        } catch (error) {
          console.error(`删除账本 ${accountToRemove.id} 失败:`, error);
        }
      }
    }

    console.log('修复重复家庭账本完成');
  } catch (error) {
    console.error('修复重复家庭账本时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行修复函数
fixDuplicateFamilyAccounts();
