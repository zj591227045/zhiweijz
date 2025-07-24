const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createMembershipMapping() {
  try {
    console.log('开始创建会员映射...');
    
    // 查找test13用户
    const user = await prisma.user.findUnique({
      where: { email: 'test13@test.com' }
    });
    
    if (!user) {
      console.log('未找到test13用户');
      return;
    }
    
    console.log('找到用户:', user.id, user.email);
    
    // 创建或更新会员记录，设置RevenueCat用户ID映射
    const membership = await prisma.userMembership.upsert({
      where: { userId: user.id },
      update: {
        revenueCatUserId: '$RCAnonymousID:c33124bf0b9e45bf83e8e33fdb0cd1b1',
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        memberType: 'REGULAR',
        startDate: new Date(),
        revenueCatUserId: '$RCAnonymousID:c33124bf0b9e45bf83e8e33fdb0cd1b1',
        isActive: true,
        autoRenewal: false,
        activationMethod: 'manual'
      }
    });
    
    console.log('会员记录已创建/更新:', JSON.stringify(membership, null, 2));
    
  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createMembershipMapping();
