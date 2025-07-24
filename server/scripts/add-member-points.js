/**
 * 为test01@test.com用户重置会员记账点
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resetMemberPoints() {
  console.log('💰 [ResetPoints] 开始为用户重置会员记账点...\n');

  try {
    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: 'test01@test.com' },
      include: {
        membership: true,
        accountingPoints: true
      }
    });

    if (!user) {
      throw new Error('未找到test01@test.com用户');
    }

    console.log('👤 [ResetPoints] 用户信息:');
    console.log('  - 用户ID:', user.id);
    console.log('  - 会员类型:', user.membership?.memberType);
    console.log('  - 会员记账点额度:', user.membership?.monthlyPoints);

    // 重置会员记账点到对应额度
    const memberPoints = user.membership?.monthlyPoints || 1000;

    const updatedPoints = await prisma.userAccountingPoints.update({
      where: { userId: user.id },
      data: {
        memberBalance: memberPoints // 重置而不是累加
      }
    });

    // 记录积分记账
    await prisma.accountingPointsTransactions.create({
      data: {
        userId: user.id,
        type: 'member',
        operation: 'reset',
        points: memberPoints,
        balanceType: 'member',
        balanceAfter: updatedPoints.memberBalance,
        description: '会员记账点重置 - 测试用'
      }
    });

    console.log('\n✅ [ResetPoints] 会员记账点重置成功:');
    console.log('  - 重置数量:', memberPoints);
    console.log('  - 当前会员记账点:', updatedPoints.memberBalance);
    console.log('  - 当前赠送记账点:', updatedPoints.giftBalance);

    console.log('\n🎯 [ResetPoints] 现在用户应该能在会员中心看到:');
    console.log('  - 会员记账点:', updatedPoints.memberBalance, '（每月', memberPoints, '点）');
    console.log('  - 赠送记账点:', updatedPoints.giftBalance, '（签到获得）');

  } catch (error) {
    console.error('\n❌ [ResetPoints] 重置记账点失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
if (require.main === module) {
  resetMemberPoints()
    .then(() => {
      console.log('\n🎉 记账点重置完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 重置失败:', error);
      process.exit(1);
    });
}

module.exports = { resetMemberPoints };
