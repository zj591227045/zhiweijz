import { PrismaClient, MemberType, NotificationType } from '@prisma/client';

const prisma = new PrismaClient();

export class MembershipService {
  private prisma: PrismaClient;
  private enableMembershipSystem: boolean;
  private enableAccountingPointsSystem: boolean;
  private membershipMonthlyPoints: number;
  private defaultMemberType: string;

  constructor() {
    this.prisma = prisma;
    this.enableMembershipSystem = process.env.ENABLE_MEMBERSHIP_SYSTEM === 'true';
    this.enableAccountingPointsSystem = process.env.ENABLE_ACCOUNTING_POINTS_SYSTEM === 'true';
    this.membershipMonthlyPoints = parseInt(process.env.MEMBERSHIP_MONTHLY_POINTS || '1000');
    this.defaultMemberType = process.env.DEFAULT_MEMBER_TYPE || 'REGULAR';
  }

  // 检查是否启用会员系统
  isEnabled(): boolean {
    return this.enableMembershipSystem;
  }

  // 检查是否启用积分系统
  isAccountingPointsEnabled(): boolean {
    return this.enableAccountingPointsSystem;
  }

  // 获取用户会员信息
  async getUserMembership(userId: string) {
    if (!this.enableMembershipSystem) {
      // 自部署版本返回永久会员
      return {
        id: 'self-hosted',
        userId,
        memberType: this.defaultMemberType,
        startDate: new Date(),
        endDate: null,
        isActive: true,
        autoRenewal: false,
        activationMethod: 'self-hosted',
        monthlyPoints: this.enableAccountingPointsSystem ? this.membershipMonthlyPoints : 0,
        usedPoints: 0,
        lastPointsReset: null,
        selectedBadge: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        renewalHistory: [],
        badges: []
      };
    }

    let membership = await this.prisma.userMembership.findUnique({
      where: { userId },
      include: {
        renewalHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        badges: {
          include: {
            badge: true
          },
          orderBy: { awardedAt: 'desc' }
        }
      }
    });

    if (!membership) {
      // 对于没有会员记录的用户，直接返回普通会员信息，不创建数据库记录
      return this.createVirtualRegularMembership(userId);
    }

    return membership;
  }

  // 创建虚拟的普通会员信息（不存储到数据库）
  createVirtualRegularMembership(userId: string) {
    return {
      id: `virtual-${userId}`,
      userId,
      memberType: 'REGULAR',
      startDate: new Date(),
      endDate: null,
      isActive: true,
      autoRenewal: false,
      activationMethod: 'default',
      monthlyPoints: 0,
      usedPoints: 0,
      lastPointsReset: null,
      selectedBadge: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      renewalHistory: [],
      badges: []
    };
  }

  // 创建基础会员信息
  async createBasicMembership(userId: string) {
    const startDate = new Date();
    
    return await this.prisma.userMembership.create({
      data: {
        userId,
        memberType: 'REGULAR',
        startDate,
        endDate: null, // 普通会员无到期时间
        isActive: true,
        autoRenewal: false,
        activationMethod: 'registration',
        monthlyPoints: 0, // 普通会员无积分
        usedPoints: 0,
        lastPointsReset: null,
        selectedBadge: null
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
  }

  // 升级会员
  async upgradeMembership(userId: string, memberType: string, duration: number = 12, paymentMethod: string = 'manual') {
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
          memberType: memberType as MemberType,
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

      // 如果升级为捐赠会员，自动添加会员记账点
      if (memberType === 'DONOR') {
        await this.addMemberPoints(userId, this.membershipMonthlyPoints, '升级为捐赠会员赠送');
        await this.awardDonorBadge(userId);
      }

      return updatedMembership;
    } else {
      // 创建新的增值会员记录
      const newMembership = await this.prisma.userMembership.create({
        data: {
          userId,
          memberType: memberType as MemberType,
          startDate,
          endDate,
          isActive: true,
          activationMethod: 'upgrade',
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
          membershipId: newMembership.id,
          renewalType: 'UPGRADE',
          startDate,
          endDate: endDate || new Date('2099-12-31'),
          paymentMethod,
          status: 'COMPLETED'
        }
      });

      // 如果升级为捐赠会员，自动添加会员记账点和颁发徽章
      if (memberType === 'DONOR') {
        await this.addMemberPoints(userId, this.membershipMonthlyPoints, '成为捐赠会员赠送');
        await this.awardDonorBadge(userId);
      }

      return newMembership;
    }
  }

  // 颁发捐赠会员徽章
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

  // 检查会员状态并处理到期
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
      await this.createNotification(userId, NotificationType.MEMBERSHIP_EXPIRED, '会员已到期', '您的捐赠会员已到期，已自动降级为普通会员。');
    }
  }

  // 重置会员积分
  async resetMemberPoints(userId: string) {
    if (!this.enableMembershipSystem || !this.enableAccountingPointsSystem) {
      return;
    }

    const membership = await this.getUserMembership(userId);
    const now = new Date();
    const lastReset = membership.lastPointsReset;

    // 检查是否需要重置（每月重置一次）
    if (!lastReset || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      const pointsToAdd = membership.memberType === 'DONOR' ? this.membershipMonthlyPoints : 0;

      if (pointsToAdd > 0) {
        await this.prisma.userMembership.update({
          where: { userId },
          data: {
            usedPoints: 0,
            lastPointsReset: now
          }
        });

        // 添加积分到用户账户
        await this.addMemberPoints(userId, pointsToAdd, '月度会员积分重置');
      }
    }
  }

  // 添加会员积分
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

    // 记录积分交易
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

  // 使用会员积分
  async useMemberPoints(userId: string, points: number, description: string): Promise<boolean> {
    if (!this.enableAccountingPointsSystem) {
      return false;
    }

    const userPoints = await this.prisma.userAccountingPoints.findUnique({
      where: { userId }
    });

    if (!userPoints || userPoints.memberBalance < points) {
      return false;
    }

    // 扣除积分
    const updatedPoints = await this.prisma.userAccountingPoints.update({
      where: { userId },
      data: {
        memberBalance: userPoints.memberBalance - points
      }
    });

    // 记录积分交易
    await this.prisma.accountingPointsTransactions.create({
      data: {
        userId,
        type: 'member',
        operation: 'deduct',
        points,
        balanceType: 'member',
        balanceAfter: updatedPoints.memberBalance,
        description
      }
    });

    // 更新会员已使用积分
    await this.prisma.userMembership.update({
      where: { userId },
      data: {
        usedPoints: {
          increment: points
        }
      }
    });

    return true;
  }

  // 设置用户选择的徽章
  async setSelectedBadge(userId: string, badgeId: string) {
    if (!this.enableMembershipSystem) {
      return;
    }

    // 验证用户拥有该徽章
    const userBadge = await this.prisma.userBadge.findUnique({
      where: {
        userId_badgeId: {
          userId,
          badgeId
        }
      }
    });

    if (!userBadge) {
      throw new Error('用户未拥有该徽章');
    }

    // 更新所有徽章为不显示
    await this.prisma.userBadge.updateMany({
      where: { userId },
      data: { isDisplayed: false }
    });

    // 设置选中的徽章为显示
    await this.prisma.userBadge.update({
      where: {
        userId_badgeId: {
          userId,
          badgeId
        }
      },
      data: { isDisplayed: true }
    });

    // 更新会员信息中的选中徽章
    await this.prisma.userMembership.update({
      where: { userId },
      data: { selectedBadge: badgeId }
    });
  }

  // 创建通知
  async createNotification(userId: string, type: NotificationType, title: string, content: string) {
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

  // 获取用户通知
  async getUserNotifications(userId: string, limit: number = 20) {
    if (!this.enableMembershipSystem) {
      return [];
    }

    return await this.prisma.membershipNotification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // 标记通知为已读
  async markNotificationAsRead(notificationId: string) {
    if (!this.enableMembershipSystem) {
      return;
    }

    return await this.prisma.membershipNotification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        sentAt: new Date()
      }
    });
  }

  // 获取所有徽章
  async getAllBadges() {
    if (!this.enableMembershipSystem) {
      return [];
    }

    return await this.prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { sortOrder: 'asc' },
        { createdAt: 'asc' }
      ]
    });
  }

  // 颁发徽章
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
      NotificationType.BADGE_AWARDED,
      '获得新徽章',
      `恭喜您获得新徽章：${userBadge.badge.name}`
    );

    return userBadge;
  }

  // 获取会员统计数据
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
      this.prisma.userMembership.count({ where: { memberType: 'DONOR' } }),
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
}
