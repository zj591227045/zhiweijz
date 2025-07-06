import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 应用配置
 */
export const config = {
  // 服务器配置
  server: {
    port: process.env.PORT || 3000,
    nodeEnv: process.env.NODE_ENV || 'development',
  },

  // 数据库配置
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:Zj233401!@10.255.0.75:5432/zhiweijz?schema=public',
  },

  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 邮件配置
  email: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'user@example.com',
    password: process.env.EMAIL_PASSWORD || 'password',
  },

  // 前端URL
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',

  // 密码重置配置
  passwordReset: {
    tokenExpiresIn: parseInt(process.env.PASSWORD_RESET_EXPIRES_IN || '86400000', 10), // 默认24小时
  },
};
