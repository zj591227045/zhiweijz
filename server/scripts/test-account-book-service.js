// 测试脚本：测试账本数据库查询
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('开始测试账本服务和仓库...');

    // 创建仓库和服务实例
    const accountBookRepository = new AccountBookRepository();
    const accountBookService = new AccountBookService();

    // 1. 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    if (users.length === 0) {
      console.log('没有找到用户，无法继续测试');
      return;
    }

    console.log(`系统中共有 ${users.length} 个用户`);

    // 2. 测试仓库方法
    for (const user of users) {
      console.log(`\n测试用户 ${user.email} 的账本仓库方法:`);

      // 测试findAllByUserId方法
      try {
        console.log('调用 accountBookRepository.findAllByUserId 方法');
        const params = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };
        const result = await accountBookRepository.findAllByUserId(user.id, params);

        console.log(`仓库返回 ${result.accountBooks.length} 个账本, 总数: ${result.total}`);

        if (result.accountBooks.length === 0 && result.total === 0) {
          // 直接使用Prisma查询验证
          const dbAccountBooks = await prisma.accountBook.findMany({
            where: { userId: user.id },
          });

          if (dbAccountBooks.length > 0) {
            console.log(`警告: 数据库中有 ${dbAccountBooks.length} 个账本，但仓库方法返回0个!`);
            console.log('数据库中的账本:');
            dbAccountBooks.forEach(book => {
              console.log(`- 账本ID: ${book.id}, 名称: ${book.name}, 默认: ${book.isDefault}`);
            });

            // 检查SQL查询
            console.log('\n尝试手动执行相同的查询:');
            const manualAccountBooks = await prisma.accountBook.findMany({
              where: { userId: user.id },
              skip: (params.page - 1) * params.limit,
              take: params.limit,
              orderBy: { [params.sortBy]: params.sortOrder },
            });

            console.log(`手动查询返回 ${manualAccountBooks.length} 个账本`);
            manualAccountBooks.forEach(book => {
              console.log(`- 账本ID: ${book.id}, 名称: ${book.name}, 默认: ${book.isDefault}`);
            });
          } else {
            console.log('数据库中确实没有该用户的账本');
          }
        }
      } catch (error) {
        console.error('调用 findAllByUserId 方法失败:', error);
      }

      // 测试服务方法
      try {
        console.log('\n调用 accountBookService.getAccountBooks 方法');
        const params = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' };
        const result = await accountBookService.getAccountBooks(user.id, params);

        console.log(`服务返回 ${result.data.length} 个账本, 总数: ${result.total}`);

        if (result.data.length === 0 && result.total === 0) {
          // 直接使用Prisma查询验证
          const dbAccountBooks = await prisma.accountBook.findMany({
            where: { userId: user.id },
          });

          if (dbAccountBooks.length > 0) {
            console.log(`警告: 数据库中有 ${dbAccountBooks.length} 个账本，但服务方法返回0个!`);
          } else {
            console.log('数据库中确实没有该用户的账本');
          }
        }
      } catch (error) {
        console.error('调用 getAccountBooks 方法失败:', error);
      }

      // 测试创建默认账本
      try {
        console.log('\n测试创建默认账本');
        const dbAccountBooks = await prisma.accountBook.findMany({
          where: { userId: user.id },
        });

        if (dbAccountBooks.length === 0) {
          console.log(`用户 ${user.email} 没有账本，尝试创建默认账本`);
          const result = await accountBookService.createDefaultAccountBook(user.id);
          console.log('创建默认账本结果:', result);
        } else {
          console.log(`用户已有 ${dbAccountBooks.length} 个账本，跳过创建`);
        }
      } catch (error) {
        console.error('创建默认账本失败:', error);
      }
    }

    console.log('\n测试完成');
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
