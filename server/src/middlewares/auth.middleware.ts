import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import prisma from '../config/database';

// 扩展Express的Request接口，添加用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

/**
 * 认证中间件
 * 验证请求头中的JWT令牌，并将解码后的用户信息添加到请求对象中
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // 从请求头中获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({ message: '未提供认证令牌' });
      return;
    }

    // 验证令牌格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ message: '认证令牌格式不正确' });
      return;
    }

    const token = parts[1];

    // 验证令牌
    const decoded = verifyToken(token);

    // 检查用户是否存在且未被删除
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        deletionRequestedAt: true,
        deletionScheduledAt: true,
      },
    });

    if (!user) {
      res.status(401).json({ message: '用户不存在' });
      return;
    }

    // 检查用户是否在注销冷静期
    if (user.deletionRequestedAt && user.deletionScheduledAt) {
      const now = new Date();
      const remainingMs = user.deletionScheduledAt.getTime() - now.getTime();
      const remainingHours = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));

      // 如果是注销相关的请求，允许通过
      const allowedPaths = ['/me/deletion-status', '/me/cancel-deletion', '/me/request-deletion'];

      console.log('🔍 [Auth Middleware] 冷静期检查:', {
        path: req.path,
        isAllowed: allowedPaths.includes(req.path),
        allowedPaths,
        remainingHours
      });

      if (!allowedPaths.includes(req.path)) {
        res.status(423).json({
          message: '账户正在注销中',
          isDeletionRequested: true,
          remainingHours,
          deletionRequestedAt: user.deletionRequestedAt,
          deletionScheduledAt: user.deletionScheduledAt
        });
        return;
      }

      // 如果是允许的路径，继续执行，但记录日志
      console.log('✅ [Auth Middleware] 允许冷静期用户访问:', req.path);
    }

    // 将用户信息添加到请求对象中
    req.user = {
      id: decoded.id,
      email: decoded.email,
    };

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({ message: error.message });
    } else {
      res.status(401).json({ message: '认证失败' });
    }
  }
}
