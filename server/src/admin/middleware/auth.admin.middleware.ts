import { Request, Response, NextFunction } from 'express';
import { verifyAdminToken, AdminTokenPayload } from '../utils/jwt.admin';
import { admin_role } from '@prisma/client';

// 扩展Express的Request接口，添加管理员信息
declare global {
  namespace Express {
    interface Request {
      admin?: AdminTokenPayload;
    }
  }
}

/**
 * 管理员认证中间件
 * 验证请求头中的管理员JWT令牌，并将解码后的管理员信息添加到请求对象中
 */
export function authenticateAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    // 从请求头中获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: '未提供管理员认证令牌',
      });
      return;
    }

    // 验证令牌格式
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        message: '管理员认证令牌格式不正确',
      });
      return;
    }

    const token = parts[1];

    // 验证令牌
    const decoded = verifyAdminToken(token);

    // 将管理员信息添加到请求对象中
    req.admin = decoded;

    next();
  } catch (error) {
    if (error instanceof Error) {
      res.status(401).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(401).json({
        success: false,
        message: '管理员认证失败',
      });
    }
  }
}

/**
 * 超级管理员权限验证中间件
 * 必须在authenticateAdmin中间件之后使用
 */
export function requireSuperAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    if (req.admin.role !== admin_role.SUPER_ADMIN) {
      res.status(403).json({
        success: false,
        message: '需要超级管理员权限',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '权限验证失败',
    });
  }
}

/**
 * 管理员权限验证中间件（普通管理员或超级管理员）
 * 必须在authenticateAdmin中间件之后使用
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.admin) {
      res.status(401).json({
        success: false,
        message: '未认证',
      });
      return;
    }

    if (req.admin.role !== admin_role.ADMIN && req.admin.role !== admin_role.SUPER_ADMIN) {
      res.status(403).json({
        success: false,
        message: '需要管理员权限',
      });
      return;
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '权限验证失败',
    });
  }
}
