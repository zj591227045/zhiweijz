const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetDeletionStatus() {
  try {
    console.log('正在重置所有用户的注销状态...');
    
    const result = await prisma.user.updateMany({
      where: {
        OR: [
          { deletionRequestedAt: { not: null } },
          { deletionScheduledAt: { not: null } }
        ]
      },
      data: {
        deletionRequestedAt: null,
        deletionScheduledAt: null
      }
    });
    
    console.log(`已重置 ${result.count} 个用户的注销状态`);
    
    // 检查重置后的状态
    const usersWithDeletion = await prisma.user.findMany({
      where: {
        OR: [
          { deletionRequestedAt: { not: null } },
          { deletionScheduledAt: { not: null } }
        ]
      },
      select: {
        id: true,
        email: true,
        deletionRequestedAt: true,
        deletionScheduledAt: true
      }
    });
    
    if (usersWithDeletion.length === 0) {
      console.log('✅ 所有用户的注销状态已成功重置');
    } else {
      console.log('⚠️ 仍有用户处于注销状态:', usersWithDeletion);
    }
    
  } catch (error) {
    console.error('重置失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetDeletionStatus();
