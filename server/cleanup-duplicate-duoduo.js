// 删除重复的朵朵，只保留一个
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupDuplicateDuoduo() {
  try {
    console.log('🧹 开始清理重复的朵朵...');
    
    // 查找所有名为朵朵的托管用户
    const duoduoUsers = await prisma.user.findMany({
      where: {
        name: '朵朵',
        isCustodial: true
      },
      include: {
        familyMembers: true
      },
      orderBy: {
        createdAt: 'asc' // 按创建时间排序，保留最早的
      }
    });
    
    console.log(`找到 ${duoduoUsers.length} 个朵朵`);
    
    if (duoduoUsers.length <= 1) {
      console.log('✅ 只有一个朵朵，无需清理');
      return;
    }
    
    // 保留第一个（最早创建的）
    const keepUser = duoduoUsers[0];
    const deleteUsers = duoduoUsers.slice(1);
    
    console.log(`✅ 保留朵朵: ${keepUser.id} (创建于: ${keepUser.createdAt})`);
    console.log(`🗑️  需要删除 ${deleteUsers.length} 个重复的朵朵`);
    
    for (const user of deleteUsers) {
      console.log(`🗑️  删除重复朵朵: ${user.id} (创建于: ${user.createdAt})`);
      
      try {
        // 删除家庭成员记录
        await prisma.familyMember.deleteMany({
          where: {
            userId: user.id
          }
        });
        
        // 删除预算记录
        await prisma.budget.deleteMany({
          where: {
            userId: user.id
          }
        });
        
        // 删除交易记录
        await prisma.transaction.deleteMany({
          where: {
            userId: user.id
          }
        });
        
        // 删除用户
        await prisma.user.delete({
          where: {
            id: user.id
          }
        });
        
        console.log(`✅ 成功删除重复朵朵: ${user.id}`);
        
      } catch (error) {
        console.error(`❌ 删除重复朵朵 ${user.id} 失败:`, error.message);
      }
    }
    
    // 验证结果
    const finalDuoduoUsers = await prisma.user.findMany({
      where: {
        name: '朵朵',
        isCustodial: true
      }
    });
    
    console.log(`\n🎉 清理完成！剩余朵朵数量: ${finalDuoduoUsers.length}`);
    finalDuoduoUsers.forEach(user => {
      console.log(`  - 朵朵 (${user.id}) - 创建于: ${user.createdAt}`);
    });
    
  } catch (error) {
    console.error('❌ 清理失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDuplicateDuoduo();
