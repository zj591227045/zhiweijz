#!/usr/bin/env node

/**
 * 调试托管成员预算自动创建问题
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCustodialBudget() {
  try {
    console.log('🔍 调试托管成员预算自动创建...\n');

    // 1. 查找测试数据
    const user = await prisma.user.findFirst({
      where: {
        email: 'test@example.com'
      }
    });

    if (!user) {
      console.log('❌ 未找到测试用户');
      return;
    }

    const accountBook = await prisma.accountBook.findFirst({
      where: {
        userId: user.id,
        type: 'FAMILY'
      }
    });

    if (!accountBook) {
      console.log('❌ 未找到家庭账本');
      return;
    }

    console.log(`✅ 找到用户: ${user.name}`);
    console.log(`✅ 找到账本: ${accountBook.name}, familyId: ${accountBook.familyId}`);

    // 2. 检查家庭和托管成员
    if (accountBook.familyId) {
      const family = await prisma.family.findUnique({
        where: { id: accountBook.familyId },
        include: {
          members: true
        }
      });

      console.log(`\n👨‍👩‍👧‍👦 家庭信息: ${family?.name}`);
      console.log(`📊 家庭成员总数: ${family?.members?.length || 0}`);

      const custodialMembers = family?.members?.filter(m => m.isCustodial) || [];
      console.log(`👶 托管成员数量: ${custodialMembers.length}`);

      for (const member of custodialMembers) {
        console.log(`  - ${member.name} (ID: ${member.id}, isCustodial: ${member.isCustodial})`);
      }

      // 3. 检查现有预算
      console.log('\n📋 现有预算:');
      const allBudgets = await prisma.budget.findMany({
        where: {
          accountBookId: accountBook.id
        },
        include: {
          familyMember: true
        },
        orderBy: {
          endDate: 'desc'
        }
      });

      console.log(`总预算数量: ${allBudgets.length}`);
      
      for (const budget of allBudgets) {
        const memberName = budget.familyMemberId 
          ? budget.familyMember?.name || '未知托管成员'
          : user.name;
        
        console.log(`  ${budget.name} (${memberName}): ${budget.startDate.toISOString().split('T')[0]} ~ ${budget.endDate.toISOString().split('T')[0]}`);
        console.log(`    familyMemberId: ${budget.familyMemberId || 'null'}`);
      }

      // 4. 手动测试托管成员预算查找
      console.log('\n🔍 手动测试托管成员预算查找:');
      
      for (const member of custodialMembers) {
        console.log(`\n检查托管成员: ${member.name} (${member.id})`);
        
        const memberBudgets = await prisma.budget.findMany({
          where: {
            familyMemberId: member.id,
            accountBookId: accountBook.id,
            budgetType: 'PERSONAL',
            period: 'MONTHLY'
          },
          orderBy: {
            endDate: 'desc'
          }
        });

        console.log(`  找到预算数量: ${memberBudgets.length}`);
        
        if (memberBudgets.length > 0) {
          const latest = memberBudgets[0];
          console.log(`  最新预算: ${latest.name}`);
          console.log(`  结束日期: ${latest.endDate.toISOString().split('T')[0]}`);
          console.log(`  当前日期: ${new Date().toISOString().split('T')[0]}`);
          console.log(`  需要创建新预算: ${latest.endDate < new Date()}`);
        } else {
          console.log(`  ❌ 没有找到托管成员 ${member.name} 的预算`);
        }
      }

      // 5. 手动调用托管成员预算创建方法
      console.log('\n🔧 手动测试托管成员预算创建方法:');
      
      const { BudgetService } = require('../dist/services/budget.service.js');
      const budgetService = new BudgetService();

      // 直接调用托管成员预算创建方法
      try {
        console.log('调用 autoCreateMissingCustodialBudgets...');
        await budgetService.autoCreateMissingCustodialBudgets(user.id, accountBook.id);
        console.log('✅ 托管成员预算创建方法执行完成');
      } catch (error) {
        console.log(`❌ 托管成员预算创建失败: ${error.message}`);
        console.error(error);
      }

      // 6. 检查创建后的结果
      console.log('\n📊 创建后的预算状态:');
      const finalBudgets = await prisma.budget.findMany({
        where: {
          accountBookId: accountBook.id
        },
        include: {
          familyMember: true
        },
        orderBy: {
          endDate: 'desc'
        }
      });

      console.log(`最终预算数量: ${finalBudgets.length}`);
      
      const finalCustodialBudgets = finalBudgets.filter(b => b.familyMemberId);
      console.log(`托管成员预算数量: ${finalCustodialBudgets.length}`);

      for (const budget of finalCustodialBudgets) {
        console.log(`  ${budget.name} (${budget.familyMember?.name}): ${budget.startDate.toISOString().split('T')[0]} ~ ${budget.endDate.toISOString().split('T')[0]}`);
      }

    } else {
      console.log('❌ 账本没有关联家庭');
    }

  } catch (error) {
    console.error('❌ 调试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行调试
debugCustodialBudget();
