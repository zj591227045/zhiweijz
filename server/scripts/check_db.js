const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    // 检查 users 表结构
    console.log('检查 users 表结构...');
    const users = await prisma.$queryRaw`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    console.log(users);

    // 检查 users 表中的数据
    console.log('\n检查 users 表中的数据...');
    const userData = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true
      },
      take: 5
    });
    console.log(userData);

    console.log('\n检查 Prisma 模型定义...');
    console.log('User 模型字段:', Object.keys(prisma.user.fields));

  } catch (error) {
    console.error('查询数据库时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
