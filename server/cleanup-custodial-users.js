// 清理多余的托管用户，只保留朵朵
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function cleanupCustodialUsers() {
  try {
    console.log('🧹 开始清理多余的托管用户...');
    
    // 查找所有托管用户
    const custodialUsers = await prisma.user.findMany({
      where: {
        isCustodial: true
      },
      include: {
        familyMembers: true
      }
    });
    
    console.log(`找到 ${custodialUsers.length} 个托管用户`);
    
    // 找到朵朵
    const duoduo = custodialUsers.find(user => user.name === '朵朵');
    if (!duoduo) {
      console.log('❌ 未找到朵朵，无法继续');
      return;
    }
    
    console.log(`✅ 找到朵朵: ${duoduo.name} (${duoduo.id})`);
    
    // 删除其他托管用户
    const usersToDelete = custodialUsers.filter(user => user.name !== '朵朵');
    console.log(`需要删除 ${usersToDelete.length} 个托管用户`);
    
    for (const user of usersToDelete) {
      console.log(`🗑️  删除托管用户: ${user.name} (${user.id})`);
      
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
        
        console.log(`✅ 成功删除: ${user.name}`);
        
      } catch (error) {
        console.error(`❌ 删除 ${user.name} 失败:`, error.message);
      }
    }
    
    // 验证结果
    const remainingCustodialUsers = await prisma.user.findMany({
      where: {
        isCustodial: true
      }
    });
    
    console.log(`\n🎉 清理完成！剩余托管用户数量: ${remainingCustodialUsers.length}`);
    remainingCustodialUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.id})`);
    });
    
  } catch (error) {
    console.error('❌ 清理失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupCustodialUsers();
