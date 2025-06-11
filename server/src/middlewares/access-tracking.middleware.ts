import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 需要跟踪的路径白名单
const TRACKED_PATHS = [
  '/api/users',
  '/api/transactions',
  '/api/account-books',
  '/api/categories',
  '/api/budgets',
  '/api/families',
  '/api/statistics',
  '/api/ai',
  '/api/auth'
];

// 排除的路径（健康检查、静态资源等）
const EXCLUDED_PATHS = [
  '/api/health',
  '/data/',
  '/favicon.ico',
  '/_next/',
  '/static/'
];

/**
 * 前端访问统计中间件
 * 记录用户的API访问情况
 */
export function trackAccess(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // 检查是否需要跟踪此路径
  const shouldTrack = TRACKED_PATHS.some(path => req.path.startsWith(path)) &&
                     !EXCLUDED_PATHS.some(path => req.path.startsWith(path));

  if (!shouldTrack) {
    next();
    return;
  }

  // 重写 res.end 方法来捕获响应
  const originalEnd = res.end.bind(res);
  res.end = function(this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
    const duration = Date.now() - startTime;

    // 异步记录访问日志，不阻塞响应
    setImmediate(async () => {
      try {
        await recordAccess(req, res, duration);
      } catch (error) {
        console.error('记录访问日志失败:', error);
      }
    });

    // 调用原始的 end 方法
    if (typeof chunk === 'undefined') {
      return originalEnd();
    } else if (typeof encoding === 'function') {
      return originalEnd(chunk, encoding);
    } else if (typeof encoding === 'string') {
      return originalEnd(chunk, encoding, cb);
    } else {
      return originalEnd(chunk);
    }
  } as any;

  next();
}

/**
 * 记录访问日志到数据库
 */
async function recordAccess(req: Request, res: Response, duration: number): Promise<void> {
  try {
    // 获取用户信息
    const userId = req.user?.id || null;

    // 获取客户端信息
    const userAgent = req.get('User-Agent') || null;
    const ip = getClientIP(req);

    // 记录API调用日志
    await prisma.apiCallLog.create({
      data: {
        endpoint: req.path,
        method: req.method,
        userId,
        statusCode: res.statusCode,
        duration,
        createdAt: new Date()
      }
    });

    // 如果是前端页面访问（非API调用），记录访问日志
    if (!req.path.startsWith('/api/')) {
      await prisma.accessLog.create({
        data: {
          userId,
          path: req.path,
          method: req.method,
          userAgent,
          ipAddress: ip,
          createdAt: new Date()
        }
      });
    }
  } catch (error) {
    console.error('记录访问数据失败:', error);
    // 不抛出错误，避免影响正常请求
  }
}

/**
 * 生成或获取会话ID
 */
function generateSessionId(req: Request): string {
  // 尝试从请求头获取会话ID
  let sessionId = req.get('X-Session-ID');
  
  if (!sessionId) {
    // 如果没有会话ID，生成一个新的
    sessionId = generateUUID();
  }
  
  return sessionId;
}

/**
 * 获取客户端真实IP地址
 */
function getClientIP(req: Request): string {
  return (
    req.get('X-Forwarded-For')?.split(',')[0] ||
    req.get('X-Real-IP') ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * 生成UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * API调用统计中间件
 * 专门用于API调用的详细统计
 */
export function trackApiCall(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // 只跟踪API调用
  if (!req.path.startsWith('/api/')) {
    next();
    return;
  }

  // 排除某些路径
  if (EXCLUDED_PATHS.some(path => req.path.startsWith(path))) {
    next();
    return;
  }

  // 重写 res.end 方法
  const originalEnd = res.end.bind(res);
  res.end = function(this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void): Response {
    const duration = Date.now() - startTime;
    
    // 异步记录API调用日志
    setImmediate(async () => {
      try {
        await recordApiCall(req, res, duration);
      } catch (error) {
        console.error('记录API调用日志失败:', error);
      }
    });

    // 调用原始的 end 方法
    if (typeof chunk === 'undefined') {
      return originalEnd();
    } else if (typeof encoding === 'function') {
      return originalEnd(chunk, encoding);
    } else if (typeof encoding === 'string') {
      return originalEnd(chunk, encoding, cb);
    } else {
      return originalEnd(chunk);
    }
  } as any;

  next();
}

/**
 * 记录API调用详细信息
 */
async function recordApiCall(req: Request, res: Response, duration: number): Promise<void> {
  try {
    const userId = req.user?.id || null;

    await prisma.apiCallLog.create({
      data: {
        endpoint: req.path,
        method: req.method,
        userId,
        statusCode: res.statusCode,
        duration,
        createdAt: new Date()
      }
    });
  } catch (error) {
    console.error('记录API调用数据失败:', error);
  }
} 