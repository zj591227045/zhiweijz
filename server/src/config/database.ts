import { PrismaClient } from '@prisma/client';
import config from './config';

// 创建Prisma客户端实例
const prisma = new PrismaClient({
  log:
    process.env.PRISMA_LOG_LEVEL === 'debug'
      ? ['query', 'info', 'warn', 'error']
      : config.env === 'development'
      ? ['warn', 'error']
      : ['error'],
});

// 连接数据库
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

// 断开数据库连接
export const disconnectDatabase = async (): Promise<void> => {
  await prisma.$disconnect();
  console.log('数据库连接已断开');
};

export default prisma;
