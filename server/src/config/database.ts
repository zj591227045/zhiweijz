import { PrismaClient } from '@prisma/client';
import config from './config';

// 确保在Docker环境中使用正确的数据库连接
const getDatabaseUrl = (): string => {
  let baseUrl: string;

  // 优先使用环境变量中的DATABASE_URL
  if (process.env.DATABASE_URL) {
    baseUrl = process.env.DATABASE_URL;
    console.log('使用环境变量DATABASE_URL:', baseUrl.replace(/:[^:@]*@/, ':***@'));
  } else {
    // 回退到配置文件
    baseUrl = config.database.url;
    console.log('使用配置文件database.url:', baseUrl.replace(/:[^:@]*@/, ':***@'));
  }

  // 添加连接池参数
  const url = new URL(baseUrl);
  url.searchParams.set('connection_limit', '20'); // 最大连接数
  url.searchParams.set('pool_timeout', '10'); // 连接池超时时间（秒）
  url.searchParams.set('connect_timeout', '10'); // 连接超时时间（秒）

  return url.toString();
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
