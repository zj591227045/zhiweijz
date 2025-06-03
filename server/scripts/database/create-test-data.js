// 创建测试数据脚本
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

// 创建Prisma客户端
const prisma = new PrismaClient();

// 测试用户数据
const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
};

// 创建测试数据
async function createTestData() {
  try {
    console.log('开始创建测试数据...');

    // 1. 创建测试用户
    console.log('创建测试用户...');
    const passwordHash = await bcrypt.hash(testUser.password, 10);
    
    // 检查用户是否已存在
    let user = await prisma.user.findUnique({
      where: { email: testUser.email }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: testUser.email,
          passwordHash,
          name: testUser.name,
        },
      });
      console.log('测试用户创建成功:', user.id);
    } else {
      console.log('测试用户已存在:', user.id);
    }
    
    const userId = user.id;

    // 2. 创建测试分类
    console.log('创建测试分类...');
    
    // 检查分类是否已存在
    let expenseCategory = await prisma.category.findFirst({
      where: { 
        name: 'Test Expense Category',
        userId: userId,
        type: 'EXPENSE'
      }
    });
    
    if (!expenseCategory) {
      expenseCategory = await prisma.category.create({
        data: {
          name: 'Test Expense Category',
          type: 'EXPENSE',
          icon: 'test-expense-icon',
          userId: userId,
          isDefault: false,
        },
      });
      console.log('测试支出分类创建成功:', expenseCategory.id);
    } else {
      console.log('测试支出分类已存在:', expenseCategory.id);
    }
    
    // 创建收入分类
    let incomeCategory = await prisma.category.findFirst({
      where: { 
        name: 'Test Income Category',
        userId: userId,
        type: 'INCOME'
      }
    });
    
    if (!incomeCategory) {
      incomeCategory = await prisma.category.create({
        data: {
          name: 'Test Income Category',
          type: 'INCOME',
          icon: 'test-income-icon',
          userId: userId,
          isDefault: false,
        },
      });
      console.log('测试收入分类创建成功:', incomeCategory.id);
    } else {
      console.log('测试收入分类已存在:', incomeCategory.id);
    }

    // 3. 创建测试交易
    console.log('创建测试交易...');
    
    // 创建支出交易
    let expenseTransaction = await prisma.transaction.findFirst({
      where: { 
        description: 'Test Expense Transaction',
        userId: userId,
        type: 'EXPENSE'
      }
    });
    
    if (!expenseTransaction) {
      expenseTransaction = await prisma.transaction.create({
        data: {
          amount: 100,
          type: 'EXPENSE',
          categoryId: expenseCategory.id,
          description: 'Test Expense Transaction',
          date: new Date(),
          userId: userId,
        },
      });
      console.log('测试支出交易创建成功:', expenseTransaction.id);
    } else {
      console.log('测试支出交易已存在:', expenseTransaction.id);
    }
    
    // 创建收入交易
    let incomeTransaction = await prisma.transaction.findFirst({
      where: { 
        description: 'Test Income Transaction',
        userId: userId,
        type: 'INCOME'
      }
    });
    
    if (!incomeTransaction) {
      incomeTransaction = await prisma.transaction.create({
        data: {
          amount: 200,
          type: 'INCOME',
          categoryId: incomeCategory.id,
          description: 'Test Income Transaction',
          date: new Date(),
          userId: userId,
        },
      });
      console.log('测试收入交易创建成功:', incomeTransaction.id);
    } else {
      console.log('测试收入交易已存在:', incomeTransaction.id);
    }

    // 4. 创建测试预算
    console.log('创建测试预算...');
    
    let budget = await prisma.budget.findFirst({
      where: { 
        name: 'Test Budget',
        userId: userId
      }
    });
    
    if (!budget) {
      budget = await prisma.budget.create({
        data: {
          name: 'Test Budget',
          amount: 1000,
          period: 'MONTHLY',
          startDate: new Date(),
          endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
          categoryId: expenseCategory.id,
          userId: userId,
          rollover: false,
        },
      });
      console.log('测试预算创建成功:', budget.id);
    } else {
      console.log('测试预算已存在:', budget.id);
    }

    // 5. 创建测试用户设置
    console.log('创建测试用户设置...');
    
    const settingsData = [
      { key: 'CURRENCY', value: 'CNY' },
      { key: 'LANGUAGE', value: 'zh-CN' },
      { key: 'THEME', value: 'light' }
    ];
    
    for (const setting of settingsData) {
      const existingSetting = await prisma.userSetting.findFirst({
        where: { 
          key: setting.key,
          userId: userId
        }
      });
      
      if (!existingSetting) {
        await prisma.userSetting.create({
          data: {
            key: setting.key,
            value: setting.value,
            userId: userId,
          },
        });
        console.log(`测试用户设置 ${setting.key} 创建成功`);
      } else {
        console.log(`测试用户设置 ${setting.key} 已存在`);
      }
    }

    console.log('测试数据创建完成！');
    
    // 输出测试数据的ID，以便在测试中使用
    console.log('\n测试数据ID:');
    console.log('用户ID:', userId);
    console.log('支出分类ID:', expenseCategory.id);
    console.log('收入分类ID:', incomeCategory.id);
    console.log('支出交易ID:', expenseTransaction.id);
    console.log('收入交易ID:', incomeTransaction.id);
    console.log('预算ID:', budget.id);
    
  } catch (error) {
    console.error('创建测试数据失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行创建测试数据函数
createTestData();
