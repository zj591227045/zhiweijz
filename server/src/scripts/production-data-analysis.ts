/**
 * 生产环境数据分析脚本
 * 分析需要修复的交易记录数量和类型，评估修复风险
 *
 * 使用方法：
 * npx ts-node src/scripts/production-data-analysis.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeProductionData() {
  console.log('📊 开始分析生产环境数据...');

  try {
    // 1. 总体数据统计
    const totalTransactions = await prisma.transaction.count();
    const familyAccountBookTransactions = await prisma.transaction.count({
      where: {
        accountBook: {
          type: 'FAMILY',
        },
      },
    });

    console.log(`\n📈 总体统计:`);
    console.log(`  总交易数: ${totalTransactions}`);
    console.log(`  家庭账本交易数: ${familyAccountBookTransactions}`);

    // 2. 需要修复的数据统计
    const needsFixing = await prisma.transaction.count({
      where: {
        accountBook: {
          type: 'FAMILY',
        },
        OR: [{ familyId: null }, { familyMemberId: null }],
      },
    });

    const onlyMissingFamilyId = await prisma.transaction.count({
      where: {
        accountBook: {
          type: 'FAMILY',
        },
        familyId: null,
        familyMemberId: { not: null },
      },
    });

    const onlyMissingFamilyMemberId = await prisma.transaction.count({
      where: {
        accountBook: {
          type: 'FAMILY',
        },
        familyId: { not: null },
        familyMemberId: null,
      },
    });

    const missingBoth = await prisma.transaction.count({
      where: {
        accountBook: {
          type: 'FAMILY',
        },
        familyId: null,
        familyMemberId: null,
      },
    });

    console.log(`\n🔧 需要修复的数据:`);
    console.log(`  需要修复的总数: ${needsFixing}`);
    console.log(`  只缺少familyId: ${onlyMissingFamilyId}`);
    console.log(`  只缺少familyMemberId: ${onlyMissingFamilyMemberId}`);
    console.log(`  两者都缺少: ${missingBoth}`);
    console.log(`  修复比例: ${((needsFixing / familyAccountBookTransactions) * 100).toFixed(2)}%`);

    // 3. 按家庭分组分析
    const familyStats = await prisma.family.findMany({
      include: {
        accountBooks: {
          include: {
            _count: {
              select: {
                transactions: {
                  where: {
                    OR: [{ familyId: null }, { familyMemberId: null }],
                  },
                },
              },
            },
          },
        },
        members: true,
      },
    });

    console.log(`\n👨‍👩‍👧‍👦 按家庭分析:`);
    for (const family of familyStats) {
      const needsFixingCount = family.accountBooks.reduce(
        (sum, book) => sum + book._count.transactions,
        0,
      );

      if (needsFixingCount > 0) {
        console.log(`  ${family.name}:`);
        console.log(`    需要修复: ${needsFixingCount} 条`);
        console.log(`    家庭成员: ${family.members.length} 人`);
        console.log(`    账本数量: ${family.accountBooks.length} 个`);
      }
    }

    // 4. 预算关联情况分析
    const withBudget = await prisma.transaction.count({
      where: {
        accountBook: {
          type: 'FAMILY',
        },
        OR: [{ familyId: null }, { familyMemberId: null }],
        budgetId: { not: null },
      },
    });

    const withoutBudget = needsFixing - withBudget;

    console.log(`\n💰 预算关联情况:`);
    console.log(
      `  有预算ID的记录: ${withBudget} (${((withBudget / needsFixing) * 100).toFixed(2)}%)`,
    );
    console.log(
      `  无预算ID的记录: ${withoutBudget} (${((withoutBudget / needsFixing) * 100).toFixed(2)}%)`,
    );

    // 5. 用户分布分析
    const userDistribution = await prisma.transaction.groupBy({
      by: ['userId'],
      where: {
        accountBook: {
          type: 'FAMILY',
        },
        OR: [{ familyId: null }, { familyMemberId: null }],
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
    });

    console.log(`\n👤 用户分布 (前10名):`);
    for (let i = 0; i < Math.min(10, userDistribution.length); i++) {
      const item = userDistribution[i];
      const user = await prisma.user.findUnique({
        where: { id: item.userId },
        select: { name: true },
      });
      console.log(`  ${user?.name || '未知用户'}: ${item._count.id} 条`);
    }

    // 6. 风险评估
    console.log(`\n⚠️  风险评估:`);

    if (needsFixing > 10000) {
      console.log(`  🔴 高风险: 需要修复的记录超过1万条，建议分批处理`);
    } else if (needsFixing > 1000) {
      console.log(`  🟡 中风险: 需要修复的记录超过1千条，建议谨慎处理`);
    } else {
      console.log(`  🟢 低风险: 需要修复的记录较少，可以一次性处理`);
    }

    if (needsFixing / familyAccountBookTransactions > 0.5) {
      console.log(`  🔴 数据完整性风险: 超过50%的家庭交易记录需要修复`);
    }

    if (withoutBudget > needsFixing * 0.3) {
      console.log(`  🟡 修复复杂度风险: 超过30%的记录没有预算ID，需要使用备选方案`);
    }

    // 7. 修复建议
    console.log(`\n💡 修复建议:`);

    if (needsFixing > 5000) {
      console.log(`  1. 建议分批处理，每批处理500-1000条记录`);
      console.log(`  2. 在业务低峰期执行修复脚本`);
      console.log(`  3. 每批处理后验证数据完整性`);
    } else {
      console.log(`  1. 可以一次性处理所有记录`);
      console.log(`  2. 建议在业务低峰期执行`);
    }

    console.log(`  3. 执行前务必备份数据库`);
    console.log(`  4. 准备回滚方案`);
    console.log(`  5. 修复后验证家庭统计功能`);
  } catch (error) {
    console.error('❌ 分析过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行分析
analyzeProductionData()
  .then(() => {
    console.log('\n🏁 数据分析完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 数据分析失败:', error);
    process.exit(1);
  });
