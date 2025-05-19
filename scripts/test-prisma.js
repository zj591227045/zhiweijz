const { PrismaClient } = require('@prisma/client');

// 设置数据库连接字符串
process.env.DATABASE_URL = 'postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz?schema=public';

// 初始化Prisma客户端
const prisma = new PrismaClient();

async function testPrismaConnection() {
  try {
    console.log('测试Prisma客户端连接...');
    
    // 尝试执行一个简单的查询
    const userCount = await prisma.user.count();
    console.log(`数据库中有 ${userCount} 个用户`);
    
    console.log('Prisma客户端连接测试成功！');
  } catch (error) {
    console.error('Prisma客户端连接测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行测试
testPrismaConnection();
