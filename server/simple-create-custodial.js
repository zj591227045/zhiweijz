const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('开始创建托管用户...');
  
  // 查找家庭
  const families = await prisma.family.findMany();
  console.log('找到家庭数量:', families.length);
  
  if (families.length === 0) {
    console.log('没有找到家庭');
    return;
  }
  
  const family = families[0];
  console.log('使用家庭:', family.name);
  
  // 创建托管用户
  const user = await prisma.user.create({
    data: {
      email: 'custodial_xiaoming@test.com',
      passwordHash: 'test123',
      name: '小明',
      isCustodial: true,
      birthDate: new Date('2020-05-15')
    }
  });
  
  console.log('创建用户:', user.name, user.id);
  
  // 创建家庭成员
  const member = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      userId: user.id,
      name: user.name,
      role: 'MEMBER',
      isRegistered: false,
      isCustodial: false
    }
  });
  
  console.log('创建成员:', member.id);
  console.log('完成！');
}

main().catch(console.error).finally(() => prisma.$disconnect());
