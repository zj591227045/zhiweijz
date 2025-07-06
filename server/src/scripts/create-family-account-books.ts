/**
 * 为已有的家庭创建账本的脚本
 *
 * 使用方法：
 * npx ts-node src/scripts/create-family-account-books.ts
 */

import { PrismaClient, AccountBookType } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function createFamilyAccountBook(familyId: string, familyName: string, creatorId: string) {
  // 检查家庭是否已经有账本
  const existingBooks = await prisma.accountBook.findMany({
    where: {
      familyId,
      type: AccountBookType.FAMILY,
    },
  });

  if (existingBooks.length > 0) {
    console.log(`家庭 ${familyName} (${familyId}) 已有 ${existingBooks.length} 个账本，跳过创建`);
    return;
  }

  // 创建家庭账本
  const accountBook = await prisma.accountBook.create({
    data: {
      id: randomUUID(),
      name: `${familyName}的账本`,
      description: '系统自动创建的家庭账本',
      userId: creatorId,
      type: AccountBookType.FAMILY,
      familyId,
      isDefault: true,
    },
  });

  console.log(
    `为家庭 ${familyName} (${familyId}) 创建了账本: ${accountBook.name} (${accountBook.id})`,
  );

  // 注意：不再自动创建预算
  // 预算将在家庭成员添加时自动创建
}

async function main() {
  try {
    // 获取所有家庭
    const families = await prisma.family.findMany({
      include: {
        creator: true,
      },
    });

    console.log(`找到 ${families.length} 个家庭`);

    // 为每个家庭创建账本
    for (const family of families) {
      await createFamilyAccountBook(family.id, family.name, family.createdBy);
    }

    console.log('所有家庭账本创建完成');
  } catch (error) {
    console.error('创建家庭账本时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
