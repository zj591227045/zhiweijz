import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

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
export function authenticate(req: Request, res: Response, next: NextFunction): void {
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
