import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import { MembershipService } from '../services/membership.service';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const membershipService = new MembershipService();

// 获取当前用户会员信息
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const membership = await membershipService.getUserMembership(req.user!.id);
    res.json({
      success: true,
      data: membership,
      systemEnabled: membershipService.isEnabled(),
      pointsEnabled: membershipService.isAccountingPointsEnabled()
    });
  } catch (error: any) {
    logger.error('获取会员信息失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会员信息失败',
      error: error.message
    });
  }
});

// 重置会员积分（手动触发）
router.post('/reset-points', authenticate, async (req: Request, res: Response) => {
  try {
    await membershipService.monthlyResetMemberPoints(req.user!.id);
    const membership = await membershipService.getUserMembership(req.user!.id);
    res.json({
      success: true,
      data: membership,
      message: '积分重置成功'
    });
  } catch (error: any) {
    logger.error('重置积分失败:', error);
    res.status(500).json({
      success: false,
      message: '重置积分失败',
      error: error.message
    });
  }
});

// 设置选择的徽章
router.post('/badge/select', authenticate, async (req: Request, res: Response) => {
  try {
    const { badgeId } = req.body;
    await membershipService.setSelectedBadge(req.user!.id, badgeId);
    res.json({
      success: true,
      message: '徽章设置成功'
    });
  } catch (error: any) {
    logger.error('设置徽章失败:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// 获取所有可用徽章
router.get('/badges', authenticate, async (req: Request, res: Response) => {
  try {
    const badges = await membershipService.getAllBadges();
    res.json({
      success: true,
      data: badges
    });
  } catch (error: any) {
    logger.error('获取徽章列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取徽章列表失败',
      error: error.message
    });
  }
});

// 获取会员通知
router.get('/notifications', authenticate, async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const limitNum = parseInt(limit as string);
    const notifications = await membershipService.getUserNotifications(req.user!.id, limitNum);
    res.json({
      success: true,
      data: notifications
    });
  } catch (error: any) {
    logger.error('获取通知失败:', error);
    res.status(500).json({
      success: false,
      message: '获取通知失败',
      error: error.message
    });
  }
});

// 标记通知为已读
router.put('/notifications/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await membershipService.markNotificationAsRead(id);
    res.json({
      success: true,
      message: '通知已标记为已读'
    });
  } catch (error: any) {
    logger.error('标记通知失败:', error);
    res.status(500).json({
      success: false,
      message: '标记通知失败',
      error: error.message
    });
  }
});

// 使用会员积分
router.post('/points/use', authenticate, async (req: Request, res: Response) => {
  try {
    const { points, description } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        message: '积分数量必须大于0'
      });
    }

    const success = await membershipService.useMemberPoints(req.user!.id, points, description);

    if (success) {
      res.json({
        success: true,
        message: '积分使用成功'
      });
    } else {
      res.status(400).json({
        success: false,
        message: '积分不足或使用失败'
      });
    }
  } catch (error: any) {
    logger.error('使用积分失败:', error);
    res.status(500).json({
      success: false,
      message: '使用积分失败',
      error: error.message
    });
  }
});

// 升级会员（用于测试或手动升级）
router.post('/upgrade', authenticate, async (req: Request, res: Response) => {
  try {
    const { memberType, duration = 12, paymentMethod = 'manual' } = req.body;

    if (!['REGULAR', 'DONOR'].includes(memberType)) {
      return res.status(400).json({
        success: false,
        message: '无效的会员类型'
      });
    }

    const membership = await membershipService.upgradeMembership(req.user!.id, memberType, duration, paymentMethod);
    res.json({
      success: true,
      data: membership,
      message: '会员升级成功'
    });
  } catch (error: any) {
    logger.error('升级会员失败:', error);
    res.status(500).json({
      success: false,
      message: '升级会员失败',
      error: error.message
    });
  }
});

export default router;
