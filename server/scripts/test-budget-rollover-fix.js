#!/usr/bin/env node

/**
 * 测试预算跨月创建和结转修复
 * 验证：
 * 1. 托管成员预算自动创建
 * 2. 预算结转正确执行
 * 3. 结转金额正确传递到新预算
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testBudgetRolloverFix() {
  try {
    console.log('🧪 开始测试预算跨月创建和结转修复...\n');

    // 1. 查找测试用户和账本
    const user = await prisma.user.findFirst({
      where: {
        email: { contains: '@' }
      }
    });

    if (!user) {
      console.log('❌ 未找到测试用户');
      return;
    }

    console.log(`✅ 找到测试用户: ${user.name} (${user.email})`);

    // 查找用户的家庭账本
    const accountBook = await prisma.accountBook.findFirst({
      where: {
        userId: user.id,
        type: 'FAMILY'
      },
      include: {
        family: {
          include: {
            members: {
              where: {
                isCustodial: true
              }
            }
          }
        }
      }
    });

    if (!accountBook) {
      console.log('❌ 未找到家庭账本');
      return;
    }

    console.log(`✅ 找到家庭账本: ${accountBook.name}`);
    console.log(`📊 托管成员数量: ${accountBook.family?.members?.length || 0}`);

    // 2. 查找现有预算
    const existingBudgets = await prisma.budget.findMany({
      where: {
        accountBookId: accountBook.id,
        period: 'MONTHLY'
      },
      include: {
        familyMember: true
      },
      orderBy: {
        endDate: 'desc'
      }
    });

    console.log(`\n📋 现有预算数量: ${existingBudgets.length}`);
    
    for (const budget of existingBudgets.slice(0, 5)) {
      const memberName = budget.familyMemberId 
        ? budget.familyMember?.name || '未知托管成员'
        : user.name;
      
      console.log(`  - ${budget.name} (${memberName}): ${budget.startDate.toISOString().split('T')[0]} ~ ${budget.endDate.toISOString().split('T')[0]}`);
      console.log(`    金额: ¥${budget.amount}, 结转: ${budget.rollover ? '启用' : '禁用'}, 结转金额: ¥${budget.rolloverAmount || 0}`);
    }

    // 3. 测试自动创建缺失预算的功能
    console.log('\n🔄 测试自动创建缺失预算...');
    
    // 模拟调用预算服务的自动创建方法
    const { BudgetService } = require('../dist/services/budget.service.js');
    const budgetService = new BudgetService();

    try {
      await budgetService.autoCreateMissingBudgets(user.id, accountBook.id);
      console.log('✅ 自动创建缺失预算完成');
    } catch (error) {
      console.log(`❌ 自动创建缺失预算失败: ${error.message}`);
    }

    // 4. 检查创建后的预算
    const newBudgets = await prisma.budget.findMany({
      where: {
        accountBookId: accountBook.id,
        period: 'MONTHLY'
      },
      include: {
        familyMember: true
      },
      orderBy: {
        endDate: 'desc'
      }
    });

    console.log(`\n📊 更新后预算数量: ${newBudgets.length}`);
    
    if (newBudgets.length > existingBudgets.length) {
      console.log(`✅ 新增了 ${newBudgets.length - existingBudgets.length} 个预算`);
      
      // 显示新增的预算
      const newlyCreated = newBudgets.slice(0, newBudgets.length - existingBudgets.length);
      for (const budget of newlyCreated) {
        const memberName = budget.familyMemberId 
          ? budget.familyMember?.name || '未知托管成员'
          : user.name;
        
        console.log(`  新增: ${budget.name} (${memberName}): ${budget.startDate.toISOString().split('T')[0]} ~ ${budget.endDate.toISOString().split('T')[0]}`);
        console.log(`    金额: ¥${budget.amount}, 结转: ${budget.rollover ? '启用' : '禁用'}, 结转金额: ¥${budget.rolloverAmount || 0}`);
      }
    } else {
      console.log('ℹ️  没有新增预算（可能已经是最新状态）');
    }

    // 5. 检查托管成员预算
    const custodialBudgets = newBudgets.filter(b => b.familyMemberId);
    const personalBudgets = newBudgets.filter(b => !b.familyMemberId);

    console.log(`\n👤 个人预算数量: ${personalBudgets.length}`);
    console.log(`👶 托管成员预算数量: ${custodialBudgets.length}`);

    // 6. 检查结转功能
    console.log('\n💰 检查预算结转功能...');
    
    const budgetsWithRollover = newBudgets.filter(b => b.rollover);
    console.log(`📈 启用结转的预算数量: ${budgetsWithRollover.length}`);

    for (const budget of budgetsWithRollover.slice(0, 3)) {
      const memberName = budget.familyMemberId 
        ? budget.familyMember?.name || '未知托管成员'
        : user.name;
      
      console.log(`  ${budget.name} (${memberName}): 结转金额 ¥${budget.rolloverAmount || 0}`);
      
      // 检查预算历史记录
      const histories = await prisma.budgetHistory.findMany({
        where: {
          budgetId: budget.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 2
      });
      
      if (histories.length > 0) {
        console.log(`    最近结转记录: ${histories[0].period}, 金额: ¥${histories[0].amount}, 类型: ${histories[0].type}`);
      }
    }

    console.log('\n🎉 测试完成！');

  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行测试
testBudgetRolloverFix();
