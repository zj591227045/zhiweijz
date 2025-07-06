import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config();

interface Config {
  env: string;
  port: number;
  database: {
    url: string;
  };
  jwt: {
    secret: string;
    expiresIn: string | number;
    adminSecret?: string;
    adminExpiresIn?: string | number;
  };
  email?: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
  openai?: {
    apiKey: string;
  };
  wechat?: {
    appId: string;
    appSecret: string;
    token: string;
    encodingAESKey?: string;
  };
}

const config: Config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url:
      process.env.DATABASE_URL ||
      'postgresql://postgres:postgres@localhost:5432/zhiweijz?schema=public',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    adminSecret: process.env.JWT_ADMIN_SECRET || process.env.JWT_SECRET || 'your_admin_jwt_secret',
    adminExpiresIn: process.env.JWT_ADMIN_EXPIRES_IN || '24h',
  },
};

// 可选配置
if (
  process.env.SMTP_HOST &&
  process.env.SMTP_PORT &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS
) {
  config.email = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  };
}

if (process.env.OPENAI_API_KEY) {
  config.openai = {
    apiKey: process.env.OPENAI_API_KEY,
  };
}

// 微信配置
if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET && process.env.WECHAT_TOKEN) {
  config.wechat = {
    appId: process.env.WECHAT_APP_ID,
    appSecret: process.env.WECHAT_APP_SECRET,
    token: process.env.WECHAT_TOKEN,
    encodingAESKey: process.env.WECHAT_ENCODING_AES_KEY,
  };
}

export default config;
