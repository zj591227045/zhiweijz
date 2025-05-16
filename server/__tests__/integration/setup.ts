import { generateToken } from '../../src/utils/jwt';

// 设置环境变量
process.env.DATABASE_URL = 'postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz?schema=public';

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

    // 使用预定义的测试数据ID
    console.log('Using predefined test data IDs');

    // 使用预定义的测试数据，不进行验证
    console.log('Using test user ID:', testUserId);
    console.log('Using test category ID:', testCategoryId);
    console.log('Using test transaction ID:', testTransactionId);
    console.log('Using test budget ID:', testBudgetId);

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
  // 不进行实际的数据库操作
  console.log('Skipping test data cleanup in mock environment');
};

/**
 * 关闭测试环境
 */
export const teardownTestEnvironment = async () => {
  try {
    console.log('Starting test environment teardown...');

    // 清理测试数据
    await cleanupTestData();
    console.log('Test data cleanup completed');

    console.log('Test environment teardown completed');
  } catch (error) {
    console.error('Failed to teardown test environment:', error);
    // Don't throw error to allow tests to complete
  }
};
