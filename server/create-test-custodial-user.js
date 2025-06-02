const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createTestCustodialUser() {
  try {
    console.log('开始创建测试托管用户...');
    console.log('数据库连接中...');
    
    // 查找现有的家庭
    const family = await prisma.family.findFirst({
      where: {
        name: '我们的家'
      }
    });
    
    if (!family) {
      console.error('未找到测试家庭');
      return;
    }
    
    console.log('找到家庭:', family.name, family.id);
    
    // 创建托管用户
    const custodialUser = await prisma.user.create({
      data: {
        email: `custodial_test_${Date.now()}@internal.zhiweijz.local`,
        passwordHash: await bcrypt.hash('random_password_' + Math.random(), 10),
        name: '小明',
        isCustodial: true,
        birthDate: new Date('2020-05-15'), // 4岁多的孩子
      }
    });
    
    console.log('创建托管用户:', custodialUser.name, custodialUser.id);
    
    // 创建家庭成员记录
    const familyMember = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: custodialUser.id,
        name: custodialUser.name,
        gender: '男',
        birthDate: custodialUser.birthDate,
        role: 'MEMBER',
        isRegistered: false,
        isCustodial: false // 现在通过user.isCustodial来标识
      }
    });
    
    console.log('创建家庭成员记录:', familyMember.id);
    
    // 再创建一个托管用户（女孩，更小的年龄）
    const custodialUser2 = await prisma.user.create({
      data: {
        email: `custodial_test2_${Date.now()}@internal.zhiweijz.local`,
        passwordHash: await bcrypt.hash('random_password_' + Math.random(), 10),
        name: '小红',
        isCustodial: true,
        birthDate: new Date('2023-08-20'), // 1岁多的孩子
      }
    });
    
    console.log('创建第二个托管用户:', custodialUser2.name, custodialUser2.id);
    
    // 创建家庭成员记录
    const familyMember2 = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: custodialUser2.id,
        name: custodialUser2.name,
        gender: '女',
        birthDate: custodialUser2.birthDate,
        role: 'MEMBER',
        isRegistered: false,
        isCustodial: false
      }
    });
    
    console.log('创建第二个家庭成员记录:', familyMember2.id);
    
    // 创建一个新生儿
    const custodialUser3 = await prisma.user.create({
      data: {
        email: `custodial_test3_${Date.now()}@internal.zhiweijz.local`,
        passwordHash: await bcrypt.hash('random_password_' + Math.random(), 10),
        name: '小宝',
        isCustodial: true,
        birthDate: new Date('2024-11-01'), // 几个月大的新生儿
      }
    });
    
    console.log('创建第三个托管用户:', custodialUser3.name, custodialUser3.id);
    
    // 创建家庭成员记录
    const familyMember3 = await prisma.familyMember.create({
      data: {
        familyId: family.id,
        userId: custodialUser3.id,
        name: custodialUser3.name,
        gender: '男',
        birthDate: custodialUser3.birthDate,
        role: 'MEMBER',
        isRegistered: false,
        isCustodial: false
      }
    });
    
    console.log('创建第三个家庭成员记录:', familyMember3.id);
    
    console.log('✅ 测试托管用户创建完成！');
    
  } catch (error) {
    console.error('❌ 创建测试托管用户失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestCustodialUser();
