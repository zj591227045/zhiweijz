import { PrismaClient } from '@prisma/client';
import { hash } from 'bcrypt';
import { sign } from 'jsonwebtoken';
import { config } from '../../src/config';

// 创建Prisma客户端
export const prisma = new PrismaClient();

// 测试用户数据
export const testUser = {
  email: 'test@example.com',
  password: 'password123',
  name: 'Test User',
};

// 测试用户ID
export let testUserId: string;

// 测试用户令牌
export let testUserToken: string;

// 测试分类ID
export let testCategoryId: string;

// 测试交易ID
export let testTransactionId: string;

/**
 * 设置测试环境
 */
export const setupTestEnvironment = async () => {
  try {
    // 清理测试数据
    await cleanupTestData();

    // 创建测试用户
    const passwordHash = await hash(testUser.password, 10);
    const user = await prisma.user.create({
      data: {
        email: testUser.email,
        passwordHash,
        name: testUser.name,
      },
    });
    testUserId = user.id;

    // 生成测试用户令牌
    testUserToken = sign({ userId: testUserId }, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    // 创建测试分类
    const category = await prisma.category.create({
      data: {
        name: 'Test Category',
        type: 'EXPENSE',
        icon: 'test-icon',
        userId: testUserId,
        isDefault: false,
      },
    });
    testCategoryId = category.id;

    // 创建测试交易
    const transaction = await prisma.transaction.create({
      data: {
        amount: new prisma.Prisma.Decimal(100),
        type: 'EXPENSE',
        categoryId: testCategoryId,
        description: 'Test Transaction',
        date: new Date(),
        userId: testUserId,
      },
    });
    testTransactionId = transaction.id;

    console.log('Test environment setup completed');
  } catch (error) {
    console.error('Failed to setup test environment:', error);
    throw error;
  }
};

/**
 * 清理测试数据
 */
export const cleanupTestData = async () => {
  try {
    // 删除测试交易
    await prisma.transaction.deleteMany({
      where: {
        OR: [
          { userId: testUserId },
          { description: 'Test Transaction' },
        ],
      },
    });

    // 删除测试分类
    await prisma.category.deleteMany({
      where: {
        OR: [
          { userId: testUserId },
          { name: 'Test Category' },
        ],
      },
    });

    // 删除测试用户
    await prisma.user.deleteMany({
      where: {
        OR: [
          { id: testUserId },
          { email: testUser.email },
        ],
      },
    });

    console.log('Test data cleanup completed');
  } catch (error) {
    console.error('Failed to cleanup test data:', error);
  }
};

/**
 * 关闭测试环境
 */
export const teardownTestEnvironment = async () => {
  try {
    // 清理测试数据
    await cleanupTestData();

    // 断开Prisma连接
    await prisma.$disconnect();

    console.log('Test environment teardown completed');
  } catch (error) {
    console.error('Failed to teardown test environment:', error);
    throw error;
  }
};
