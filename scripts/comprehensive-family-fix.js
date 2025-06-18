#!/usr/bin/env node

/**
 * 综合修复家庭账本的预算和交易关联问题
 * 1. 修复预算的家庭关联（familyId和familyMemberId）
 * 2. 修复交易的家庭成员归属（基于修复后的预算）
 * 
 * 使用方法：
 * 1. Docker环境：docker exec -it <container_name> node scripts/comprehensive-family-fix.js [accountBookId] [preview|fix]
 * 2. 本地环境：node scripts/comprehensive-family-fix.js [accountBookId] [preview|fix]
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const accountBookId = process.argv[2];
  const mode = process.argv[3] || 'preview'; // preview | fix
  
  if (!accountBookId) {
    console.error('❌ 请提供账本ID作为参数');
    console.error('使用方法: node scripts/comprehensive-family-fix.js <accountBookId> [preview|fix]');
    process.exit(1);
  }

  if (!['preview', 'fix'].includes(mode)) {
    console.error('❌ 模式参数错误，只支持 preview 或 fix');
    process.exit(1);
  }

  console.log(`🔍 开始${mode === 'preview' ? '预览' : '修复'}账本 ${accountBookId} 的家庭关联问题...`);

  try {
    // 1. 验证账本
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
      include: { 
        family: {
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, isCustodial: true } }
              }
            }
          }
        }
      }
    });

    if (!accountBook) {
      console.error(`❌ 账本 ${accountBookId} 不存在`);
      process.exit(1);
    }

    if (accountBook.type !== 'FAMILY' || !accountBook.familyId) {
      console.error(`❌ 账本 ${accountBookId} 不是家庭账本`);
      process.exit(1);
    }

    console.log(`✅ 家庭账本: ${accountBook.name} (家庭: ${accountBook.family?.name})`);

    // 2. 第一步：修复预算的家庭关联
    console.log('\n📋 第一步：修复预算的家庭关联...');
    
    const budgetsToFix = await prisma.budget.findMany({
      where: {
        accountBookId: accountBookId,
        OR: [
          { familyId: null },
          { 
            AND: [
              { familyId: { not: null } },
              { familyMemberId: null },
              { budgetType: 'PERSONAL' }
            ]
          }
        ]
      },
      include: {
        user: { select: { id: true, name: true, isCustodial: true } }
      }
    });

    console.log(`   找到 ${budgetsToFix.length} 个需要修复的预算`);

    let budgetFixedCount = 0;
    const budgetErrors = [];

    for (const budget of budgetsToFix) {
      try {
        const familyMember = accountBook.family?.members.find(m => m.userId === budget.userId);
        
        if (!familyMember) {
          console.log(`   ⚠️  预算 ${budget.id} 的所有者不在家庭成员中，跳过`);
          continue;
        }

        const correctFamilyId = accountBook.familyId;
        const correctFamilyMemberId = familyMember.id;

        if (mode === 'preview') {
          console.log(`   🔍 [预览] 预算 ${budget.id} (${budget.name}):`);
          console.log(`       familyId: ${budget.familyId || '(空)'} -> ${correctFamilyId}`);
          console.log(`       familyMemberId: ${budget.familyMemberId || '(空)'} -> ${correctFamilyMemberId}`);
        } else {
          await prisma.budget.update({
            where: { id: budget.id },
            data: {
              familyId: correctFamilyId,
              familyMemberId: correctFamilyMemberId,
              updatedAt: new Date()
            }
          });
          console.log(`   ✅ 修复预算 ${budget.id} (${budget.name})`);
        }
        budgetFixedCount++;
      } catch (error) {
        console.error(`   ❌ 处理预算 ${budget.id} 时出错:`, error.message);
        budgetErrors.push({ budgetId: budget.id, error: error.message });
      }
    }

    // 3. 第二步：修复交易的家庭成员归属
    console.log('\n💰 第二步：修复交易的家庭成员归属...');
    
    const transactionsToFix = await prisma.transaction.findMany({
      where: {
        accountBookId: accountBookId,
        budgetId: { not: null }
      },
      include: {
        budget: {
          include: {
            user: { select: { id: true, name: true, isCustodial: true } },
            familyMember: { select: { id: true, name: true } }
          }
        }
      }
    });

    console.log(`   找到 ${transactionsToFix.length} 条有预算的交易记录`);

    let transactionFixedCount = 0;
    const transactionErrors = [];

    for (const transaction of transactionsToFix) {
      try {
        const budget = transaction.budget;
        let correctFamilyMemberId = null;

        if (!budget) {
          console.log(`   ⚠️  交易 ${transaction.id} 的预算不存在，跳过`);
          continue;
        }

        // 根据预算确定正确的家庭成员ID
        if (budget.familyMemberId) {
          correctFamilyMemberId = budget.familyMemberId;
        } else if (budget.userId) {
          const familyMember = accountBook.family?.members.find(m => m.userId === budget.userId);
          if (familyMember) {
            correctFamilyMemberId = familyMember.id;
          }
        }

        if (correctFamilyMemberId && transaction.familyMemberId !== correctFamilyMemberId) {
          if (mode === 'preview') {
            console.log(`   🔍 [预览] 交易 ${transaction.id}:`);
            console.log(`       familyMemberId: ${transaction.familyMemberId || '(空)'} -> ${correctFamilyMemberId}`);
            console.log(`       预算: ${budget.name} (${budget.user?.name || budget.familyMember?.name})`);
          } else {
            await prisma.transaction.update({
              where: { id: transaction.id },
              data: {
                familyMemberId: correctFamilyMemberId,
                updatedAt: new Date()
              }
            });
            console.log(`   ✅ 修复交易 ${transaction.id}`);
          }
          transactionFixedCount++;
        }
      } catch (error) {
        console.error(`   ❌ 处理交易 ${transaction.id} 时出错:`, error.message);
        transactionErrors.push({ transactionId: transaction.id, error: error.message });
      }
    }

    // 4. 输出总结
    console.log(`\n📈 ${mode === 'preview' ? '预览' : '修复'}结果总结:`);
    console.log(`📋 预算修复:`);
    console.log(`   ${mode === 'preview' ? '🔍 需要修复' : '✅ 成功修复'}: ${budgetFixedCount} 个`);
    console.log(`   ❌ 处理失败: ${budgetErrors.length} 个`);
    
    console.log(`💰 交易修复:`);
    console.log(`   ${mode === 'preview' ? '🔍 需要修复' : '✅ 成功修复'}: ${transactionFixedCount} 条`);
    console.log(`   ❌ 处理失败: ${transactionErrors.length} 条`);

    if (budgetErrors.length > 0 || transactionErrors.length > 0) {
      console.log('\n❌ 错误详情:');
      budgetErrors.forEach(({ budgetId, error }) => {
        console.log(`   预算 ${budgetId}: ${error}`);
      });
      transactionErrors.forEach(({ transactionId, error }) => {
        console.log(`   交易 ${transactionId}: ${error}`);
      });
    }

    if (mode === 'preview') {
      console.log(`\n🎉 预览完成！`);
      if (budgetFixedCount > 0 || transactionFixedCount > 0) {
        console.log(`\n💡 要执行实际修复，请运行:`);
        console.log(`   node scripts/comprehensive-family-fix.js ${accountBookId} fix`);
      }
    } else {
      console.log(`\n🎉 修复完成！`);
      console.log(`\n💡 建议操作:`);
      console.log(`   1. 重新运行分析脚本验证修复结果`);
      console.log(`   2. 在应用中检查家庭成员统计是否正确`);
      console.log(`   3. 测试新创建的交易是否正确归属`);
    }

  } catch (error) {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
main().catch((error) => {
  console.error('❌ 未处理的错误:', error);
  process.exit(1);
});
