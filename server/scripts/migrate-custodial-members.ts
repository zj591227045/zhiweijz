import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * 将托管成员迁移为托管用户
 * 1. 为每个托管成员创建对应的托管用户
 * 2. 更新相关的预算记录
 * 3. 更新相关的交易记录
 * 4. 保持数据一致性
 */
async function migrateCustodialMembers() {
  console.log('开始迁移托管成员...');

  try {
    // 查找所有托管成员
    const custodialMembers = await prisma.familyMember.findMany({
      where: {
        isCustodial: true,
        userId: null // 确保是真正的托管成员，没有关联用户
      },
      include: {
        family: true,
        budgets: true,
        transactions: true
      }
    });

    console.log(`找到 ${custodialMembers.length} 个托管成员需要迁移`);

    for (const member of custodialMembers) {
      console.log(`\n迁移托管成员: ${member.name} (ID: ${member.id})`);

      // 1. 创建托管用户
      const custodialUser = await prisma.user.create({
        data: {
          id: uuidv4(),
          email: `custodial_${member.id}@internal.zhiweijz.local`, // 内部邮箱，不允许登录
          passwordHash: await bcrypt.hash(uuidv4(), 10), // 随机密码，无法登录
          name: member.name,
          isCustodial: true,
          birthDate: member.birthDate,
          createdAt: member.createdAt,
          updatedAt: member.updatedAt
        }
      });

      console.log(`  创建托管用户: ${custodialUser.name} (ID: ${custodialUser.id})`);

      // 2. 更新family_member记录，关联到新创建的用户
      await prisma.familyMember.update({
        where: { id: member.id },
        data: {
          userId: custodialUser.id,
          isCustodial: false // 现在通过user.isCustodial来标识
        }
      });

      console.log(`  更新家庭成员记录，关联到用户ID: ${custodialUser.id}`);

      // 3. 更新预算记录
      const budgetUpdateCount = await prisma.budget.updateMany({
        where: {
          familyMemberId: member.id
        },
        data: {
          userId: custodialUser.id,
          familyMemberId: null // 移除familyMemberId，使用userId
        }
      });

      console.log(`  更新了 ${budgetUpdateCount.count} 条预算记录`);

      // 4. 更新交易记录
      const transactionUpdateCount = await prisma.transaction.updateMany({
        where: {
          familyMemberId: member.id
        },
        data: {
          userId: custodialUser.id,
          familyMemberId: null // 移除familyMemberId，使用userId
        }
      });

      console.log(`  更新了 ${transactionUpdateCount.count} 条交易记录`);

      // 5. 更新预算历史记录
      const budgetHistoryUpdateCount = await prisma.budgetHistory.updateMany({
        where: {
          budgetId: {
            in: member.budgets.map(b => b.id)
          }
        },
        data: {
          userId: custodialUser.id
        }
      });

      console.log(`  更新了 ${budgetHistoryUpdateCount.count} 条预算历史记录`);
    }

    console.log('\n✅ 托管成员迁移完成！');
    console.log('\n迁移总结:');
    console.log(`- 迁移了 ${custodialMembers.length} 个托管成员`);
    console.log('- 所有相关的预算、交易、历史记录都已更新');
    console.log('- 托管成员现在作为托管用户存在，可以按普通用户逻辑处理');

  } catch (error) {
    console.error('❌ 迁移过程中发生错误:', error);
    throw error;
  }
}

/**
 * 验证迁移结果
 */
async function validateMigration() {
  console.log('\n开始验证迁移结果...');

  // 检查是否还有未关联用户的托管成员
  const remainingCustodialMembers = await prisma.familyMember.findMany({
    where: {
      isCustodial: true,
      userId: null
    }
  });

  if (remainingCustodialMembers.length > 0) {
    console.warn(`⚠️  仍有 ${remainingCustodialMembers.length} 个托管成员未迁移`);
    return false;
  }

  // 检查托管用户数量
  const custodialUsers = await prisma.user.findMany({
    where: {
      isCustodial: true
    }
  });

  console.log(`✅ 验证通过: 找到 ${custodialUsers.length} 个托管用户`);

  // 检查预算记录
  const budgetsWithFamilyMember = await prisma.budget.findMany({
    where: {
      familyMemberId: { not: null }
    }
  });

  if (budgetsWithFamilyMember.length > 0) {
    console.warn(`⚠️  仍有 ${budgetsWithFamilyMember.length} 条预算记录使用familyMemberId`);
  } else {
    console.log('✅ 所有预算记录都已更新为使用userId');
  }

  return true;
}

async function main() {
  try {
    await migrateCustodialMembers();
    const isValid = await validateMigration();
    
    if (isValid) {
      console.log('\n🎉 托管成员架构迁移成功完成！');
    } else {
      console.log('\n❌ 迁移验证失败，请检查数据');
    }
  } catch (error) {
    console.error('迁移失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { migrateCustodialMembers, validateMigration };
