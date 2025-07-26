import { Router } from 'express';

// Import MembershipService properly
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Define MembershipService inline for now to avoid import issues
class MembershipService {
  prisma: any;
  enableMembershipSystem: boolean;
  enableAccountingPointsSystem: boolean;
  membershipMonthlyPoints: number;
  defaultMemberType: string;

  constructor() {
    this.prisma = prisma;
    this.enableMembershipSystem = process.env.ENABLE_MEMBERSHIP_SYSTEM === 'true';
    this.enableAccountingPointsSystem = process.env.ENABLE_ACCOUNTING_POINTS_SYSTEM === 'true';
    this.membershipMonthlyPoints = parseInt(process.env.MEMBERSHIP_MONTHLY_POINTS as string) || 1000;
    this.defaultMemberType = process.env.DEFAULT_MEMBER_TYPE || 'REGULAR';
  }

  isEnabled() {
    return this.enableMembershipSystem;
  }

  async getMembershipStats() {
    if (!this.enableMembershipSystem) {
      return {
        totalMembers: 0,
        regularMembers: 0,
        donorMembers: 0,
        lifetimeMembers: 0,
        activeMembers: 0,
        expiringInWeek: 0
      };
    }

    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalMembers,
      donorMembers,
      lifetimeMembers,
      activeMembers,
      expiringInWeek
    ] = await Promise.all([
      // 只统计增值会员（不包括普通会员）
      this.prisma.userMembership.count({
        where: {
          memberType: {
            not: 'REGULAR'
          }
        }
      }),
      this.prisma.userMembership.count({
        where: {
          memberType: {
            in: ['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE']
          }
        }
      }),
      this.prisma.userMembership.count({ where: { memberType: 'LIFETIME' } }),
      this.prisma.userMembership.count({ 
        where: { 
          isActive: true,
          memberType: {
            not: 'REGULAR'
          }
        } 
      }),
      this.prisma.userMembership.count({
        where: {
          endDate: {
            gte: now,
            lte: oneWeekLater
          },
          isActive: true,
          memberType: {
            not: 'REGULAR'
          }
        }
      })
    ]);

    // 获取所有用户数量作为"普通会员"数量
    const totalUsers = await this.prisma.user.count();
    const regularMembers = totalUsers - totalMembers; // 总用户数减去增值会员数

    return {
      totalMembers: totalUsers, // 所有用户都是会员
      regularMembers, // 虚拟的普通会员数量
      donorMembers,
      lifetimeMembers,
      activeMembers,
      expiringInWeek
    };
  }

  async upgradeMembership(userId: string, memberType: string, duration: number, paymentMethod: string) {
    if (!this.enableMembershipSystem) {
      throw new Error('会员系统未启用');
    }

    // 只有升级为增值会员类型时才处理
    if (memberType === 'REGULAR') {
      throw new Error('无需升级为普通会员，普通会员是默认状态');
    }

    const now = new Date();
    let membership = await this.prisma.userMembership.findUnique({
      where: { userId }
    });

    let startDate = now;
    let endDate: Date | null = new Date(now);
    
    if (memberType === 'DONOR') {
      // 捐赠会员有到期时间
      if (membership && membership.endDate && membership.endDate > now) {
        startDate = membership.endDate;
      }
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);
    } else if (memberType === 'LIFETIME') {
      // 永久会员无到期时间
      endDate = null;
    }

    if (membership) {
      // 更新现有会员信息
      const updatedMembership = await this.prisma.userMembership.update({
        where: { userId },
        data: {
          memberType,
          endDate,
          isActive: true,
          monthlyPoints: memberType === 'DONOR' ? this.membershipMonthlyPoints : 0,
          usedPoints: 0,
          lastPointsReset: memberType === 'DONOR' ? new Date() : null
        },
        include: {
          renewalHistory: true,
          badges: {
            include: {
              badge: true
            }
          }
        }
      });

      // 记录续费历史
      await this.prisma.membershipRenewal.create({
        data: {
          membershipId: membership.id,
          renewalType: 'UPGRADE',
          startDate,
          endDate: endDate || new Date('2099-12-31'), // 永久会员使用一个很远的日期
          paymentMethod,
          status: 'COMPLETED'
        }
      });

      return updatedMembership;
    } else {
      // 创建新的增值会员记录
      const newMembership = await this.prisma.userMembership.create({
        data: {
          userId,
          memberType,
          startDate,
          endDate,
          isActive: true,
          activationMethod: 'upgrade',
          monthlyPoints: ['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE'].includes(memberType) ? this.membershipMonthlyPoints : 0,
          usedPoints: 0,
          lastPointsReset: ['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE'].includes(memberType) ? new Date() : null
        },
        include: {
          renewalHistory: true,
          badges: {
            include: {
              badge: true
            }
          }
        }
      });

      // 记录续费历史
      await this.prisma.membershipRenewal.create({
        data: {
          membershipId: newMembership.id,
          renewalType: 'UPGRADE',
          startDate,
          endDate: endDate || new Date('2099-12-31'),
          paymentMethod,
          status: 'COMPLETED'
        }
      });

      // 如果升级为捐赠会员，自动颁发捐赠徽章
      if (['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE'].includes(memberType)) {
        await this.awardDonorBadge(userId);
      }

      return newMembership;
    }
  }

  async awardDonorBadge(userId: string) {
    const donorBadge = await this.prisma.badge.findFirst({
      where: { name: '捐赠会员徽章' }
    });

    if (donorBadge) {
      const existingBadge = await this.prisma.userBadge.findUnique({
        where: {
          userId_badgeId: {
            userId,
            badgeId: donorBadge.id
          }
        }
      });

      if (!existingBadge) {
        await this.prisma.userBadge.create({
          data: {
            userId,
            badgeId: donorBadge.id,
            awardReason: '升级为捐赠会员'
          }
        });
      }
    }
  }

  async createNotification(userId: string, type: string, title: string, content: string) {
    if (!this.enableMembershipSystem) {
      return;
    }

    return await this.prisma.membershipNotification.create({
      data: {
        userId,
        notificationType: type,
        title,
        content
      }
    });
  }

  async awardBadge(userId: string, badgeId: string, reason: string) {
    if (!this.enableMembershipSystem) {
      return;
    }

    const existingBadge = await this.prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId
        }
      }
    });

    if (existingBadge) {
      return existingBadge;
    }

    const userBadge = await this.prisma.userBadge.create({
      data: {
        userId,
        badgeId,
        awardReason: reason
      },
      include: {
        badge: true
      }
    });

    // 发送徽章获得通知
    await this.createNotification(
      userId,
      'BADGE_AWARDED',
      '获得新徽章',
      `恭喜您获得新徽章：${userBadge.badge.name}`
    );

    return userBadge;
  }

  async addMemberPoints(userId: string, points: number, description: string) {
    if (!this.enableAccountingPointsSystem) {
      return;
    }

    // 获取或创建用户积分账户
    let userPoints = await this.prisma.userAccountingPoints.findUnique({
      where: { userId }
    });

    if (!userPoints) {
      userPoints = await this.prisma.userAccountingPoints.create({
        data: {
          userId,
          giftBalance: 0,
          memberBalance: 0
        }
      });
    }

    // 更新会员积分余额
    const updatedPoints = await this.prisma.userAccountingPoints.update({
      where: { userId },
      data: {
        memberBalance: userPoints.memberBalance + points
      }
    });

    // 记录积分记账
    await this.prisma.accountingPointsTransactions.create({
      data: {
        userId,
        type: 'member',
        operation: 'add',
        points,
        balanceType: 'member',
        balanceAfter: updatedPoints.memberBalance,
        description
      }
    });

    return updatedPoints;
  }

  async checkAndUpdateMembershipStatus(userId: string) {
    if (!this.enableMembershipSystem) {
      return;
    }

    const membership = await this.prisma.userMembership.findUnique({
      where: { userId }
    });

    if (!membership || !membership.endDate) {
      return;
    }

    const now = new Date();
    if (membership.endDate < now && membership.isActive) {
      // 会员已到期，降级为普通会员
      await this.prisma.userMembership.update({
        where: { userId },
        data: {
          memberType: 'REGULAR',
          isActive: false,
          monthlyPoints: 0,
          usedPoints: 0
        }
      });

      // 发送到期通知
      await this.createNotification(userId, 'MEMBERSHIP_EXPIRED', '会员已到期', '您的捐赠会员已到期，已自动降级为普通会员。');
    }
  }
}

const router = Router();
const membershipService = new MembershipService();

// 获取会员统计数据
router.get('/stats', async (req, res) => {
  try {
    const stats = await membershipService.getMembershipStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    console.error('获取会员统计失败:', error);
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
    if (!membershipService.isEnabled()) {
      return res.json({
        success: true,
        data: {
          memberships: [],
          total: 0,
          page: 1,
          limit: 20
        },
        message: '会员系统未启用'
      });
    }

    const { 
      page = 1, 
      limit = 20, 
      memberType, 
      isActive, 
      search 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    // 构建查询条件 - 只显示增值会员（排除普通会员）
    const where: any = {
      memberType: {
        not: 'REGULAR'  // 排除普通会员
      }
    };
    if (memberType) where.memberType = memberType;
    if (isActive !== undefined) where.isActive = isActive === 'true';
    
    // 如果有搜索条件，通过用户表搜索
    let userWhere: any = {};
    if (search) {
      userWhere = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [memberships, total] = await Promise.all([
      membershipService.prisma.userMembership.findMany({
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
              createdAt: true
            }
          },
          renewalHistory: {
            orderBy: { createdAt: 'desc' },
            take: 3
          },
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
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit as string)
      }),
      membershipService.prisma.userMembership.count({
        where: {
          ...where,
          user: userWhere
        }
      })
    ]);

    res.json({
      success: true,
      data: {
        memberships,
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('获取会员列表失败:', error);
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
    
    if (!['DONOR', 'LIFETIME'].includes(memberType)) {
      return res.status(400).json({
        success: false,
        message: '无效的会员类型'
      });
    }

    const membership = await membershipService.upgradeMembership(userId, memberType, duration, 'admin');
    
    // 记录管理员操作日志
    const memberTypeText = memberType === 'DONOR' ? '捐赠会员' : memberType === 'LIFETIME' ? '永久会员' : '增值会员';
    await membershipService.createNotification(
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
    console.error('升级会员失败:', error);
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
    const user = await membershipService.prisma.user.findFirst({
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
    const membership = await membershipService.upgradeMembership(user.id, memberType, duration, 'admin');
    
    // 记录管理员操作日志
    const memberTypeText = memberType === 'DONOR' ? '捐赠会员' : memberType === 'LIFETIME' ? '永久会员' : '增值会员';
    await membershipService.createNotification(
      user.id,
      'MEMBERSHIP_RENEWED',
      '管理员添加会员',
      `管理员已为您开通${memberTypeText}，时长：${memberType === 'LIFETIME' ? '永久' : `${duration}个月`}。${reason ? `原因：${reason}` : ''}`
    );

    res.json({
      success: true,
      data: {
        membership,
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        }
      },
      message: `成功为 ${user.name}(${user.email}) 添加${memberTypeText}`
    });
  } catch (error: any) {
    console.error('添加会员失败:', error);
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

    const userPoints = await membershipService.addMemberPoints(userId, points, description || '管理员手动添加');
    
    res.json({
      success: true,
      data: userPoints,
      message: '积分添加成功'
    });
  } catch (error: any) {
    console.error('添加积分失败:', error);
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
    
    const userBadge = await membershipService.awardBadge(userId, badgeId, reason || '管理员颁发');
    
    res.json({
      success: true,
      data: userBadge,
      message: '徽章颁发成功'
    });
  } catch (error: any) {
    console.error('颁发徽章失败:', error);
    res.status(500).json({
      success: false,
      message: '颁发徽章失败',
      error: error.message
    });
  }
});

// 创建新徽章
router.post('/badge/create', async (req, res) => {
  try {
    const { name, description, icon, color = '#FFD700', rarity = 'COMMON', category = 'general' } = req.body;
    
    if (!name || !icon) {
      return res.status(400).json({
        success: false,
        message: '徽章名称和图标不能为空'
      });
    }

    const badge = await membershipService.prisma.badge.create({
      data: {
        name,
        description,
        icon,
        color,
        rarity,
        category
      }
    });
    
    res.json({
      success: true,
      data: badge,
      message: '徽章创建成功'
    });
  } catch (error: any) {
    console.error('创建徽章失败:', error);
    res.status(500).json({
      success: false,
      message: '创建徽章失败',
      error: error.message
    });
  }
});

// 更新徽章
router.put('/badge/:badgeId', async (req, res) => {
  try {
    const { badgeId } = req.params;
    const updateData = req.body;
    
    const badge = await membershipService.prisma.badge.update({
      where: { id: badgeId },
      data: updateData
    });
    
    res.json({
      success: true,
      data: badge,
      message: '徽章更新成功'
    });
  } catch (error: any) {
    console.error('更新徽章失败:', error);
    res.status(500).json({
      success: false,
      message: '更新徽章失败',
      error: error.message
    });
  }
});

// 删除徽章
router.delete('/badge/:badgeId', async (req, res) => {
  try {
    const { badgeId } = req.params;
    
    // 软删除，将isActive设为false
    await membershipService.prisma.badge.update({
      where: { id: badgeId },
      data: { isActive: false }
    });
    
    res.json({
      success: true,
      message: '徽章删除成功'
    });
  } catch (error: any) {
    console.error('删除徽章失败:', error);
    res.status(500).json({
      success: false,
      message: '删除徽章失败',
      error: error.message
    });
  }
});

// 获取会员续费历史
router.get('/renewal-history', async (req, res) => {
  try {
    const { page = 1, limit = 20, userId, membershipId } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    
    const where: any = {};
    if (userId) {
      where.membership = { userId };
    }
    if (membershipId) {
      where.membershipId = membershipId;
    }

    const [renewals, total] = await Promise.all([
      membershipService.prisma.membershipRenewal.findMany({
        where,
        include: {
          membership: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit as string)
      }),
      membershipService.prisma.membershipRenewal.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        renewals,
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (error: any) {
    console.error('获取续费历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取续费历史失败',
      error: error.message
    });
  }
});

// 批量检查会员状态
router.post('/check-all-status', async (req, res) => {
  try {
    if (!membershipService.isEnabled()) {
      return res.json({
        success: true,
        message: '会员系统未启用，无需检查'
      });
    }

    // 获取所有需要检查的会员
    const memberships = await membershipService.prisma.userMembership.findMany({
      where: {
        isActive: true,
        endDate: {
          not: null
        }
      },
      select: { userId: true }
    });

    let checkedCount = 0;
    let expiredCount = 0;

    for (const membership of memberships) {
      await membershipService.checkAndUpdateMembershipStatus(membership.userId);
      checkedCount++;
      
      // 重新检查状态
      const updated = await membershipService.prisma.userMembership.findUnique({
        where: { userId: membership.userId }
      });
      
      if (updated && !updated.isActive) {
        expiredCount++;
      }
    }

    res.json({
      success: true,
      message: `检查完成，共检查 ${checkedCount} 个会员，${expiredCount} 个已到期`
    });
  } catch (error: any) {
    console.error('批量检查会员状态失败:', error);
    res.status(500).json({
      success: false,
      message: '批量检查会员状态失败',
      error: error.message
    });
  }
});

export default router;