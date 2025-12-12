import { logger } from '../utils/logger';
import { Request, Response, NextFunction } from 'express';
import { SourceDetectionUtil } from '../utils/source-detection.util';

/**
 * 来源检测中间件
 * 自动检测请求来源并将其添加到请求对象中
 */
export function sourceDetectionMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // 检测请求来源
    const source = SourceDetectionUtil.detectSource(req);
    
    // 将来源信息添加到请求对象中
    (req as any).source = source;
    
    // 获取详细的来源信息
    const detailedInfo = SourceDetectionUtil.getDetailedSourceInfo(req);
    (req as any).sourceInfo = detailedInfo;
    
    // 在开发环境下记录来源检测日志
    SourceDetectionUtil.logSourceDetection(req, source);
    
    next();
  } catch (error) {
    logger.error('来源检测中间件错误:', error);
    // 即使检测失败，也不应该阻止请求继续处理
    // 设置默认来源为App
    (req as any).source = 'App';
    (req as any).sourceInfo = {
      source: 'App',
      userAgent: req.get('User-Agent') || '',
      platform: 'unknown',
    };
    next();
  }
}

/**
 * 扩展Request接口以包含来源信息
 */
declare global {
  namespace Express {
    interface Request {
      source?: 'App' | 'WeChat' | 'API';
      sourceInfo?: {
        source: 'App' | 'WeChat' | 'API';
        userAgent: string;
        referer?: string;
        clientType?: string;
        platform?: string;
      };
    }
  }
}
