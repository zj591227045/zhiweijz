import { PrismaClient } from '@prisma/client';
import config from './config';

// 确保在Docker环境中使用正确的数据库连接
const getDatabaseUrl = (): string => {
  // 优先使用环境变量中的DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('使用环境变量DATABASE_URL:', process.env.DATABASE_URL.replace(/:[^:@]*@/, ':***@'));
    return process.env.DATABASE_URL;
  }

  // 回退到配置文件
  console.log('使用配置文件database.url:', config.database.url.replace(/:[^:@]*@/, ':***@'));
  return config.database.url;
};

// 创建Prisma客户端实例
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: getDatabaseUrl(),
    },
  },
  log:
    process.env.PRISMA_LOG_LEVEL === 'debug'
      ? ['query', 'info', 'warn', 'error']
      : ['error'], // 只记录错误日志，减少输出
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
