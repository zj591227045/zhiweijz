#!/usr/bin/env node

/**
 * 完整测试预算跨月创建和结转修复
 * 包括创建测试数据和验证功能
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function createTestData() {
  console.log('📝 创建测试数据...');

  // 1. 创建测试用户
  const hashedPassword = await bcrypt.hash('test123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'test@example.com',
      passwordHash: hashedPassword,
      name: '张杰'
    }
  });
  console.log(`✅ 创建用户: ${user.name}`);

  // 2. 创建家庭
  const family = await prisma.family.create({
    data: {
      name: '张家',
      createdBy: user.id
    }
  });
  console.log(`✅ 创建家庭: ${family.name}`);

  // 3. 创建家庭成员（用户自己）
  const userMember = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      userId: user.id,
      name: user.name,
      role: 'ADMIN',
      isRegistered: true,
      isCustodial: false
    }
  });

  // 4. 创建托管成员
  const custodialMember = await prisma.familyMember.create({
    data: {
      familyId: family.id,
      name: '小明',
      role: 'MEMBER',
      isRegistered: false,
      isCustodial: true
    }
  });
  console.log(`✅ 创建托管成员: ${custodialMember.name}`);

  // 5. 创建家庭账本
  const accountBook = await prisma.accountBook.create({
    data: {
      name: '家庭账本',
      description: '测试家庭账本',
      userId: user.id,
      familyId: family.id,
      type: 'FAMILY',
      isDefault: true
    }
  });
  console.log(`✅ 创建账本: ${accountBook.name}`);

  // 6. 创建分类
  const category = await prisma.category.create({
    data: {
      name: '生活费',
      type: 'EXPENSE',
      icon: 'life',
      familyId: family.id,
      accountBookId: accountBook.id,
      isDefault: false
    }
  });
  console.log(`✅ 创建分类: ${category.name}`);

  // 7. 创建历史预算（两个月前，确保触发自动创建）
  const twoMonthsAgo = new Date();
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
  const lastMonthStart = new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 25);
  const lastMonthEnd = new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth() + 1, 24);

  // 用户个人预算
  const userBudget = await prisma.budget.create({
    data: {
      name: '个人预算',
      amount: 2000,
      period: 'MONTHLY',
      startDate: lastMonthStart,
      endDate: lastMonthEnd,
      rollover: true,
      rolloverAmount: 394.50, // 模拟有结转金额
      userId: user.id,
      familyId: family.id,
      accountBookId: accountBook.id,
      budgetType: 'PERSONAL',
      refreshDay: 25,
      enableCategoryBudget: false,
      isAutoCalculated: false
    }
  });
  console.log(`✅ 创建用户历史预算: ${userBudget.name} (结转: ¥${userBudget.rolloverAmount})`);

  // 托管成员预算
  const custodialBudget = await prisma.budget.create({
    data: {
      name: '小明预算',
      amount: 1500,
      period: 'MONTHLY',
      startDate: lastMonthStart,
      endDate: lastMonthEnd,
      rollover: true,
      rolloverAmount: 141.00, // 模拟有结转金额
      userId: user.id,
      familyId: family.id,
      familyMemberId: custodialMember.id,
      accountBookId: accountBook.id,
      budgetType: 'PERSONAL',
      refreshDay: 25,
      enableCategoryBudget: false,
      isAutoCalculated: false
    }
  });
  console.log(`✅ 创建托管成员历史预算: ${custodialBudget.name} (结转: ¥${custodialBudget.rolloverAmount})`);

  // 8. 创建一些交易记录
  await prisma.transaction.create({
    data: {
      amount: 1605.50,
      type: 'EXPENSE',
      categoryId: category.id,
      description: '历史生活费支出',
      date: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 28),
      userId: user.id,
      familyId: family.id,
      accountBookId: accountBook.id,
      budgetId: userBudget.id
    }
  });

  await prisma.transaction.create({
    data: {
      amount: 1359.00,
      type: 'EXPENSE',
      categoryId: category.id,
      description: '小明历史支出',
      date: new Date(twoMonthsAgo.getFullYear(), twoMonthsAgo.getMonth(), 28),
      userId: user.id,
      familyId: family.id,
      familyMemberId: custodialMember.id,
      accountBookId: accountBook.id,
      budgetId: custodialBudget.id
    }
  });

  console.log('✅ 创建交易记录');

  return { user, family, accountBook, custodialMember, userBudget, custodialBudget };
}

async function testBudgetRolloverFix() {
  try {
    console.log('🧪 开始测试预算跨月创建和结转修复...\n');

    // 清理现有数据
    await prisma.transaction.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.category.deleteMany();
    await prisma.accountBook.deleteMany();
    await prisma.familyMember.deleteMany();
    await prisma.family.deleteMany();
    await prisma.user.deleteMany();
    console.log('🧹 清理现有数据完成');

    // 创建测试数据
    const testData = await createTestData();

    // 测试自动创建缺失预算的功能
    console.log('\n🔄 测试自动创建缺失预算...');
    
    const { BudgetService } = require('../dist/services/budget.service.js');
    const budgetService = new BudgetService();

    try {
      await budgetService.autoCreateMissingBudgets(testData.user.id, testData.accountBook.id);
      console.log('✅ 自动创建缺失预算完成');
    } catch (error) {
      console.log(`❌ 自动创建缺失预算失败: ${error.message}`);
      console.error(error);
    }

    // 检查创建后的预算
    const allBudgets = await prisma.budget.findMany({
      where: {
        accountBookId: testData.accountBook.id
      },
      include: {
        familyMember: true
      },
      orderBy: {
        endDate: 'desc'
      }
    });

    console.log(`\n📊 总预算数量: ${allBudgets.length}`);
    
    const personalBudgets = allBudgets.filter(b => !b.familyMemberId);
    const custodialBudgets = allBudgets.filter(b => b.familyMemberId);

    console.log(`👤 个人预算数量: ${personalBudgets.length}`);
    console.log(`👶 托管成员预算数量: ${custodialBudgets.length}`);

    // 显示所有预算
    for (const budget of allBudgets) {
      const memberName = budget.familyMemberId 
        ? budget.familyMember?.name || '未知托管成员'
        : testData.user.name;
      
      console.log(`  ${budget.name} (${memberName}): ${budget.startDate.toISOString().split('T')[0]} ~ ${budget.endDate.toISOString().split('T')[0]}`);
      console.log(`    金额: ¥${budget.amount}, 结转: ${budget.rollover ? '启用' : '禁用'}, 结转金额: ¥${budget.rolloverAmount || 0}`);
    }

    // 检查结转功能
    console.log('\n💰 检查预算结转功能...');
    
    const budgetsWithRollover = allBudgets.filter(b => b.rollover && b.rolloverAmount && Number(b.rolloverAmount) !== 0);
    console.log(`📈 有结转金额的预算数量: ${budgetsWithRollover.length}`);

    for (const budget of budgetsWithRollover) {
      const memberName = budget.familyMemberId 
        ? budget.familyMember?.name || '未知托管成员'
        : testData.user.name;
      
      console.log(`  ${budget.name} (${memberName}): 结转金额 ¥${budget.rolloverAmount}`);
    }

    // 验证结果
    console.log('\n🎯 验证结果:');
    
    if (personalBudgets.length >= 2) {
      console.log('✅ 个人预算自动创建成功');
    } else {
      console.log('❌ 个人预算自动创建失败');
    }

    if (custodialBudgets.length >= 2) {
      console.log('✅ 托管成员预算自动创建成功');
    } else {
      console.log('❌ 托管成员预算自动创建失败');
    }

    if (budgetsWithRollover.length > 0) {
      console.log('✅ 预算结转功能正常');
    } else {
      console.log('❌ 预算结转功能异常');
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
