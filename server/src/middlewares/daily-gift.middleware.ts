import { Request, Response, NextFunction } from 'express';
import AccountingPointsService from '../services/accounting-points.service';

/**
 * 每日首次访问记账点赠送中间件
 * 在用户认证成功后，检查今天是否首次访问，如果是则赠送记账点
 */
export async function dailyFirstVisitGift(
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  try {
    // 确保用户已经通过认证
    if (!req.user) {
      next();
      return;
    }

    // 检查并执行每日首次访问赠送
    const result = await AccountingPointsService.checkAndGiveDailyPoints(req.user.id);
    
    // 如果是首次访问，可以在响应头中添加信息（可选）
    if (result.isFirstVisitToday) {
      res.setHeader('X-First-Visit-Today', 'true');
      if (result.pointsGiven && result.pointsGiven > 0) {
        res.setHeader('X-Daily-Points-Given', result.pointsGiven.toString());
        res.setHeader('X-New-Points-Balance', result.newBalance?.toString() || '0');
      }
    }

    next();
  } catch (error) {
    // 记账点赠送失败不应该影响正常的API调用，只记录错误
    console.error('每日首次访问记账点赠送失败:', error);
    next();
  }
}