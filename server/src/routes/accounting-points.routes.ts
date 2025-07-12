import express from 'express';
import AccountingPointsService from '../services/accounting-points.service';
import { authenticate } from '../middlewares/auth.middleware';
import type { Request, Response } from 'express';

const router = express.Router();

/**
 * 获取用户记账点余额
 * GET /api/accounting-points/balance
 */
router.get('/balance', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const userPoints = await AccountingPointsService.getUserPoints(userId);
    
    res.json({
      success: true,
      data: {
        giftBalance: userPoints.giftBalance,
        memberBalance: userPoints.memberBalance,
        totalBalance: userPoints.giftBalance + userPoints.memberBalance
      }
    });
  } catch (error) {
    console.error('获取记账点余额失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取记账点余额失败' 
    });
  }
});

/**
 * 获取用户记账点消费记录
 * GET /api/accounting-points/transactions
 */
router.get('/transactions', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { limit = '50', offset = '0' } = req.query;
    
    const transactions = await AccountingPointsService.getUserTransactions(
      userId, 
      parseInt(limit as string), 
      parseInt(offset as string)
    );
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('获取记账点消费记录失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '获取记账点消费记录失败' 
    });
  }
});

/**
 * 用户签到
 * POST /api/accounting-points/checkin
 */
router.post('/checkin', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    
    // 检查今天是否已经签到
    const hasCheckedIn = await AccountingPointsService.hasCheckedInToday(userId);
    if (hasCheckedIn) {
      return res.status(400).json({
        success: false,
        error: '今天已经签到过了'
      });
    }
    
    const result = await AccountingPointsService.checkin(userId);
    
    res.json({
      success: true,
      data: {
        pointsAwarded: result.checkin.pointsAwarded,
        newBalance: result.newBalance,
        message: '签到成功！'
      }
    });
  } catch (error) {
    console.error('签到失败:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : '签到失败' 
    });
  }
});

/**
 * 检查用户今天是否已签到
 * GET /api/accounting-points/checkin-status
 */
router.get('/checkin-status', authenticate, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const hasCheckedIn = await AccountingPointsService.hasCheckedInToday(userId);
    
    res.json({
      success: true,
      data: {
        hasCheckedIn
      }
    });
  } catch (error) {
    console.error('检查签到状态失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '检查签到状态失败' 
    });
  }
});

export default router; 