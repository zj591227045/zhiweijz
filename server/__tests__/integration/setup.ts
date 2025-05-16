import { PrismaClient, Prisma } from '@prisma/client';
import { generateToken } from '../../src/utils/jwt';
import { hash } from 'bcrypt';

// 设置环境变量
process.env.DATABASE_URL = 'postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz?schema=public';

// 创建Prisma客户端
export const prisma = new PrismaClient();

// 测试用户数据
export const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
};

// 测试用户ID - 使用已创建的测试用户ID
export let testUserId: string = 'b050eb78-d394-49cb-9442-91095a7b0726';

// 测试用户令牌
export let testUserToken: string = generateToken({ userId: testUserId });

// 测试分类ID - 使用已创建的测试分类ID
export let testCategoryId: string = '01276f41-9b92-48f8-ad07-6ed7485373eb';

// 测试交易ID - 使用已创建的测试交易ID
export let testTransactionId: string = 'c0be4b39-82ea-4ef7-bd34-48b4c38bfdad';

// 测试收入分类ID
export let testIncomeCategoryId: string = '230d5aae-7d34-4fd9-ab84-c0d0dca83073';

// 测试收入交易ID
export let testIncomeTransactionId: string = '8f34f4f8-59bb-4633-bc6d-7307c0b11b3a';

// 测试预算ID
export let testBudgetId: string = '7af5c095-e04a-4841-a24d-7fea1143cff2';

/**
 * 设置测试环境
 */
export const setupTestEnvironment = async () => {
  try {
    console.log('Starting test environment setup...');

    // 测试数据库连接
    let dbConnected = false;
    try {
      console.log('Attempting to connect to database with URL:', process.env.DATABASE_URL);
      await prisma.$connect();
      console.log('Database connection successful');

      // 测试查询
      const testQuery = await prisma.$queryRaw`SELECT 1 as test`;
      console.log('Test query result:', testQuery);
      dbConnected = true;
    } catch (error) {
      console.error('Database connection failed:', error);
      console.log('Using predefined test data IDs');
      return; // 跳过后续的数据库操作
    }

    // 验证测试数据是否存在
    try {
      // 验证用户
      const user = await prisma.user.findUnique({
        where: { id: testUserId }
      });

      if (!user) {
        throw new Error(`Test user with ID ${testUserId} not found`);
      }
      console.log('Test user verified:', user.id);

      // 验证分类
      const category = await prisma.category.findUnique({
        where: { id: testCategoryId }
      });

      if (!category) {
        throw new Error(`Test category with ID ${testCategoryId} not found`);
      }
      console.log('Test category verified:', category.id);

      // 验证交易
      const transaction = await prisma.transaction.findUnique({
        where: { id: testTransactionId }
      });

      if (!transaction) {
        throw new Error(`Test transaction with ID ${testTransactionId} not found`);
      }
      console.log('Test transaction verified:', transaction.id);

      // 验证预算
      const budget = await prisma.budget.findUnique({
        where: { id: testBudgetId }
      });

      if (!budget) {
        throw new Error(`Test budget with ID ${testBudgetId} not found`);
      }
      console.log('Test budget verified:', budget.id);

      // 验证用户设置
      const settings = await prisma.userSetting.findMany({
        where: { userId: testUserId }
      });

      if (settings.length === 0) {
        throw new Error(`No settings found for user ${testUserId}`);
      }
      console.log('Test user settings verified:', settings.length);

      console.log('All test data verified successfully');
    } catch (verifyError) {
      console.error('Failed to verify test data:', verifyError);
      throw verifyError;
    }

    console.log('Test environment setup completed successfully');
  } catch (error) {
    console.error('Failed to setup test environment:', error);
    throw error;
  }
};

/**
 * 清理测试数据
 *
 * 注意：我们不再删除测试数据，因为我们使用的是固定的测试数据
 */
export const cleanupTestData = async () => {
  try {
    // 删除测试过程中创建的临时数据

    // 删除导入的交易
    await prisma.transaction.deleteMany({
      where: {
        description: 'Imported Transaction',
      },
    });

    // 删除更新的交易
    await prisma.transaction.deleteMany({
      where: {
        description: 'Updated Transaction',
      },
    });

    console.log('Temporary test data cleaned up');
  } catch (error) {
    console.error('Failed to cleanup temporary test data:', error);
    // 不抛出错误，继续执行测试
    console.log('Continuing tests despite cleanup errors');
  }
};

/**
 * 关闭测试环境
 */
export const teardownTestEnvironment = async () => {
  try {
    console.log('Starting test environment teardown...');

    // 清理测试数据
    try {
      await cleanupTestData();
      console.log('Test data cleanup completed');
    } catch (cleanupError) {
      console.error('Test data cleanup failed:', cleanupError);
      // Continue despite cleanup errors
    }

    // 断开Prisma连接
    try {
      await prisma.$disconnect();
      console.log('Database connection closed');
    } catch (disconnectError) {
      console.error('Failed to disconnect from database:', disconnectError);
      // Continue despite disconnect errors
    }

    console.log('Test environment teardown completed');
  } catch (error) {
    console.error('Failed to teardown test environment:', error);
    // Don't throw error to allow tests to complete
  }
};
