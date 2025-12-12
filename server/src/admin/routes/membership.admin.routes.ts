import { logger } from '../../utils/logger';
import { Router } from 'express';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';
import { MembershipService } from '../../services/membership.service';
import prisma from '../../config/database';

const router = Router();
const adminMembershipService = new MembershipService();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

// 获取会员统计数据
router.get('/stats', async (req, res) => {
  try {
    const stats = await adminMembershipService.getMembershipStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    logger.error('获取会员统计失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会员统计失败',
      error: error.message
    });
  }
});

// 获取所有会员列表
router.get('/list', async (req, res) => {
  try {
    if (!adminMembershipService.isEnabled()) {
      return res.json({
        success: true,
        data: {
          memberships: [],
          total: 0,
          totalPages: 0
        }
      });
    }

    const { page = 1, limit = 20, search, memberType } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // 构建查询条件
    let where: any = {
      memberType: {
        not: 'REGULAR' // 只显示增值会员
      }
    };

    let userWhere: any = {};

    if (search) {
      userWhere = {
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } }
        ]
      };
    }

    if (memberType) {
      where.memberType = memberType;
    }

    const [memberships, total] = await Promise.all([
      prisma.userMembership.findMany({
        where: {
          ...where,
          user: userWhere
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
              createdAt: true,
              badges: {
                include: {
                  badge: {
                    select: {
                      id: true,
                      name: true,
                      icon: true,
                      color: true,
                      rarity: true
                    }
                  }
                }
              }
            }
          },
          renewalHistory: {
            orderBy: { createdAt: 'desc' },
            take: 3
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit as string)
      }),
      prisma.userMembership.count({
        where: {
          ...where,
          user: userWhere
        }
      })
    ]);

    const totalPages = Math.ceil(total / parseInt(limit as string));

    res.json({
      success: true,
      data: {
        memberships,
        total,
        totalPages
      }
    });
  } catch (error: any) {
    logger.error('获取会员列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取会员列表失败',
      error: error.message
    });
  }
});

// 手动升级用户会员
router.post('/upgrade/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { memberType, duration = 12, reason } = req.body;

    if (!['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE', 'LIFETIME'].includes(memberType)) {
      return res.status(400).json({
        success: false,
        message: '无效的会员类型'
      });
    }

    const membership = await adminMembershipService.upgradeMembership(userId, memberType, duration, 'admin');
    
    // 记录管理员操作日志
    const memberTypeText = memberType === 'DONATION_ONE' ? '捐赠会员（壹）' : 
                          memberType === 'DONATION_TWO' ? '捐赠会员（贰）' : 
                          memberType === 'DONATION_THREE' ? '捐赠会员（叁）' : 
                          memberType === 'LIFETIME' ? '永久会员' : '增值会员';
    await adminMembershipService.createNotification(
      userId,
      'MEMBERSHIP_RENEWED',
      '管理员升级会员',
      `管理员已将您的会员升级为${memberTypeText}，${reason ? `原因：${reason}` : ''}`
    );

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

// 手动为用户添加会员（通过邮箱/用户名搜索）
router.post('/add-membership', async (req, res) => {
  try {
    const { email, memberType, duration = 12, reason } = req.body;
    
    logger.info('🔍 [添加会员] 接收到的请求参数:', {
      email,
      memberType,
      duration,
      reason,
      rawBody: req.body
    });
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: '邮箱地址不能为空'
      });
    }

    if (!['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE', 'LIFETIME'].includes(memberType)) {
      return res.status(400).json({
        success: false,
        message: '无效的会员类型'
      });
    }

    // 查找用户
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: { equals: email, mode: 'insensitive' } },
          { name: { contains: email, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: '未找到该用户'
      });
    }

    // 添加会员
    logger.info('🔍 [添加会员] 调用upgradeMembership:', {
      userId: user.id,
      memberType,
      duration,
      paymentMethod: 'admin'
    });
    
    const membership = await adminMembershipService.upgradeMembership(user.id, memberType, duration, 'admin');
    
    // 记录管理员操作日志
    const memberTypeText = memberType === 'DONATION_ONE' ? '捐赠会员（壹）' : 
                          memberType === 'DONATION_TWO' ? '捐赠会员（贰）' : 
                          memberType === 'DONATION_THREE' ? '捐赠会员（叁）' : 
                          memberType === 'LIFETIME' ? '永久会员' : '增值会员';
    await adminMembershipService.createNotification(
      user.id,
      'MEMBERSHIP_RENEWED',
      '管理员添加会员',
      `管理员已为您开通${memberTypeText}，时长：${memberType === 'LIFETIME' ? '永久' : `${duration}个月`}。${reason ? `原因：${reason}` : ''}`
    );

    res.json({
      success: true,
      data: membership,
      message: '会员添加成功'
    });
  } catch (error: any) {
    logger.error('添加会员失败:', error);
    res.status(500).json({
      success: false,
      message: '添加会员失败',
      error: error.message
    });
  }
});

// 手动添加会员积分
router.post('/points/add/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { points, description } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({
        success: false,
        message: '积分数量必须大于0'
      });
    }

    const userPoints = await adminMembershipService.addMemberPoints(userId, points, description || '管理员手动添加');

    res.json({
      success: true,
      data: userPoints,
      message: '积分添加成功'
    });
  } catch (error: any) {
    logger.error('添加积分失败:', error);
    res.status(500).json({
      success: false,
      message: '添加积分失败',
      error: error.message
    });
  }
});

// 颁发徽章
router.post('/badge/award/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { badgeId, reason } = req.body;

    const userBadge = await adminMembershipService.awardBadge(userId, badgeId, reason || '管理员颁发');

    res.json({
      success: true,
      data: userBadge,
      message: '徽章颁发成功'
    });
  } catch (error: any) {
    logger.error('颁发徽章失败:', error);
    res.status(500).json({
      success: false,
      message: '颁发徽章失败',
      error: error.message
    });
  }
});

// 降级会员
router.post('/downgrade/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { action, memberType, reduceMonths, reason } = req.body;

    logger.info('🔍 [降级会员] 接收到的请求参数:', {
      userId,
      action,
      memberType,
      reduceMonths,
      reason
    });

    if (!['reduce_time', 'downgrade_type', 'to_regular'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: '无效的降级操作类型'
      });
    }

    // 获取当前会员信息
    const currentMembership = await prisma.userMembership.findUnique({
      where: { userId }
    });

    if (!currentMembership) {
      return res.status(404).json({
        success: false,
        message: '用户不是会员'
      });
    }

    let updatedMembership;

    switch (action) {
      case 'reduce_time':
        if (!currentMembership.endDate) {
          return res.status(400).json({
            success: false,
            message: '永久会员无法减少有效期'
          });
        }

        if (!reduceMonths || reduceMonths < 1) {
          return res.status(400).json({
            success: false,
            message: '减少月数必须大于0'
          });
        }

        const newEndDate = new Date(currentMembership.endDate);
        newEndDate.setMonth(newEndDate.getMonth() - reduceMonths);

        // 如果减少后的时间早于当前时间，则设为已到期
        const now = new Date();
        if (newEndDate <= now) {
          updatedMembership = await prisma.userMembership.update({
            where: { userId },
            data: {
              memberType: 'REGULAR',
              isActive: false,
              endDate: null,
              monthlyPoints: 0,
              usedPoints: 0
            }
          });
        } else {
          updatedMembership = await prisma.userMembership.update({
            where: { userId },
            data: {
              endDate: newEndDate
            }
          });
        }
        break;

      case 'downgrade_type':
        if (!memberType || !['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE'].includes(memberType)) {
          return res.status(400).json({
            success: false,
            message: '无效的会员类型'
          });
        }

        // 验证降级逻辑（只能降级到更低等级）
        const memberTypeHierarchy = {
          'LIFETIME': 4,
          'DONATION_THREE': 3,
          'DONATION_TWO': 2,
          'DONATION_ONE': 1,
          'REGULAR': 0
        };

        const currentLevel = memberTypeHierarchy[currentMembership.memberType as keyof typeof memberTypeHierarchy];
        const targetLevel = memberTypeHierarchy[memberType as keyof typeof memberTypeHierarchy];

        if (targetLevel >= currentLevel) {
          return res.status(400).json({
            success: false,
            message: '只能降级到更低等级的会员类型'
          });
        }

        updatedMembership = await prisma.userMembership.update({
          where: { userId },
          data: {
            memberType,
            monthlyPoints: adminMembershipService.getMembershipMonthlyPoints(),
            usedPoints: 0,
            lastPointsReset: new Date()
          }
        });
        break;

      case 'to_regular':
        updatedMembership = await prisma.userMembership.update({
          where: { userId },
          data: {
            memberType: 'REGULAR',
            isActive: false,
            endDate: null,
            monthlyPoints: 0,
            usedPoints: 0
          }
        });
        break;

      default:
        return res.status(400).json({
          success: false,
          message: '未知的降级操作'
        });
    }

    // 记录降级历史
    await prisma.membershipRenewal.create({
      data: {
        membershipId: currentMembership.id,
        renewalType: 'DOWNGRADE',
        startDate: new Date(),
        endDate: updatedMembership.endDate || new Date('2099-12-31'),
        paymentMethod: 'admin_downgrade',
        status: 'COMPLETED'
      }
    });

    // 发送通知
    const actionText = action === 'reduce_time' ? '减少有效期' :
                      action === 'downgrade_type' ? '降级会员等级' : '降级为普通会员';
    await adminMembershipService.createNotification(
      userId,
      'MEMBERSHIP_DOWNGRADED',
      '会员降级通知',
      `管理员已对您的会员进行${actionText}操作。${reason ? `原因：${reason}` : ''}`
    );

    res.json({
      success: true,
      data: updatedMembership,
      message: '会员降级成功'
    });
  } catch (error: any) {
    logger.error('降级会员失败:', error);
    res.status(500).json({
      success: false,
      message: '降级会员失败',
      error: error.message
    });
  }
});

// 批量检查会员状态
router.post('/check-all-status', async (req, res) => {
  try {
    if (!adminMembershipService.isEnabled()) {
      return res.json({
        success: true,
        message: '会员系统未启用，无需检查'
      });
    }

    // 获取所有需要检查的会员
    const memberships = await prisma.userMembership.findMany({
      where: {
        isActive: true,
        endDate: {
          not: null
        }
      }
    });

    let checkedCount = 0;
    let expiredCount = 0;

    for (const membership of memberships) {
      await adminMembershipService.checkAndUpdateMembershipStatus(membership.userId);
      checkedCount++;

      // 重新检查状态
      const updated = await prisma.userMembership.findUnique({
        where: { userId: membership.userId }
      });

      if (updated && !updated.isActive) {
        expiredCount++;
      }
    }

    res.json({
      success: true,
      message: `批量检查完成，共检查 ${checkedCount} 个会员，其中 ${expiredCount} 个已到期`
    });
  } catch (error: any) {
    logger.error('批量检查会员状态失败:', error);
    res.status(500).json({
      success: false,
      message: '批量检查会员状态失败',
      error: error.message
    });
  }
});

export default router;
