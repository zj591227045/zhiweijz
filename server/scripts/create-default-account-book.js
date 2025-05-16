// 脚本：为指定用户创建默认账本
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 要创建账本的用户邮箱
const targetEmail = '591227045@qq.com';

async function main() {
  try {
    console.log(`开始为用户 ${targetEmail} 创建默认账本...`);
    
    // 1. 查找用户
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });
    
    if (!user) {
      console.error(`错误: 未找到邮箱为 ${targetEmail} 的用户`);
      return;
    }
    
    console.log(`找到用户: ID=${user.id}, 名称=${user.name}`);
    
    // 2. 检查用户是否已有账本
    const existingAccountBooks = await prisma.accountBook.findMany({
      where: { userId: user.id },
    });
    
    if (existingAccountBooks.length > 0) {
      console.log(`用户已有 ${existingAccountBooks.length} 个账本:`);
      existingAccountBooks.forEach(book => {
        console.log(`- 账本ID: ${book.id}, 名称: ${book.name}, 默认: ${book.isDefault}`);
      });
      
      // 如果用户已有账本但没有默认账本，将第一个设为默认
      const hasDefaultBook = existingAccountBooks.some(book => book.isDefault);
      if (!hasDefaultBook && existingAccountBooks.length > 0) {
        console.log(`用户没有默认账本，将第一个账本设为默认...`);
        await prisma.accountBook.update({
          where: { id: existingAccountBooks[0].id },
          data: { isDefault: true },
        });
        console.log(`已将账本 "${existingAccountBooks[0].name}" 设为默认账本`);
      }
      
      return;
    }
    
    // 3. 创建默认账本
    console.log(`用户没有账本，创建默认账本...`);
    
    // 先重置该用户的所有默认账本（以防万一）
    await prisma.accountBook.updateMany({
      where: {
        userId: user.id,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
    
    // 创建新的默认账本
    const newAccountBook = await prisma.accountBook.create({
      data: {
        userId: user.id,
        name: '个人账本',
        description: '默认个人账本',
        isDefault: true,
      },
    });
    
    console.log(`成功创建默认账本:`);
    console.log(`- 账本ID: ${newAccountBook.id}`);
    console.log(`- 名称: ${newAccountBook.name}`);
    console.log(`- 描述: ${newAccountBook.description}`);
    console.log(`- 默认: ${newAccountBook.isDefault}`);
    
    console.log('\n操作完成');
  } catch (error) {
    console.error('创建账本过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
