// 测试脚本：检查账本数据
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log('开始测试账本数据...');
    
    // 1. 获取所有用户
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
      }
    });
    
    console.log(`系统中共有 ${users.length} 个用户:`);
    users.forEach(user => {
      console.log(`- 用户ID: ${user.id}, 邮箱: ${user.email}, 名称: ${user.name}`);
    });
    
    // 2. 获取所有账本
    const allAccountBooks = await prisma.accountBook.findMany({
      include: {
        user: {
          select: {
            email: true,
            name: true,
          }
        }
      }
    });
    
    console.log(`\n系统中共有 ${allAccountBooks.length} 个账本:`);
    allAccountBooks.forEach(book => {
      console.log(`- 账本ID: ${book.id}, 名称: ${book.name}, 默认: ${book.isDefault}, 所属用户: ${book.user.email}`);
    });
    
    // 3. 检查每个用户的账本
    console.log('\n检查每个用户的账本:');
    for (const user of users) {
      const userAccountBooks = await prisma.accountBook.findMany({
        where: { userId: user.id },
      });
      
      console.log(`用户 ${user.email} 有 ${userAccountBooks.length} 个账本`);
      
      if (userAccountBooks.length === 0) {
        console.log(`  警告: 用户 ${user.email} 没有账本!`);
      } else {
        userAccountBooks.forEach(book => {
          console.log(`  - 账本ID: ${book.id}, 名称: ${book.name}, 默认: ${book.isDefault}`);
        });
      }
    }
    
    // 4. 测试账本仓库的findAllByUserId方法
    console.log('\n测试账本仓库的findAllByUserId方法:');
    for (const user of users) {
      // 模拟仓库方法的实现
      const [accountBooks, total] = await Promise.all([
        prisma.accountBook.findMany({
          where: { userId: user.id },
          skip: 0,
          take: 20,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.accountBook.count({
          where: { userId: user.id },
        }),
      ]);
      
      console.log(`用户 ${user.email} 的findAllByUserId结果: ${accountBooks.length} 个账本, 总数: ${total}`);
      
      if (accountBooks.length === 0) {
        console.log(`  警告: 用户 ${user.email} 的findAllByUserId返回空结果!`);
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
