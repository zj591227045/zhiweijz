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

    // 在获取会员信息前，先检查是否到期
    await this.checkAndUpdateMembershipStatus(userId);

    let membership = await this.prisma.userMembership.findUnique({
      where: { userId },
      include: {
        renewalHistory: {
          orderBy: { createdAt: 'desc' },
          take: 10
        },
        user: {
          include: {
            badges: {
              include: {
                badge: true
              },
              orderBy: { awardedAt: 'desc' }
            }
          }
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
      user: {
        badges: []
      }
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
        user: {
          include: {
            badges: {
              include: {
                badge: true
              }
            }
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

    // 处理不同的会员类型
    if (['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE'].includes(memberType)) {
      // 捐赠会员有到期时间
      if (membership && membership.endDate && membership.endDate > now) {
        startDate = membership.endDate;
      }
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);
    } else if (memberType === 'LIFETIME') {
      // 永久会员无到期时间
      endDate = null;
    } else if (memberType === 'DONOR') {
      // 兼容旧的DONOR类型，迁移为DONATION_ONE
      memberType = 'DONATION_ONE';
      if (membership && membership.endDate && membership.endDate > now) {
        startDate = membership.endDate;
      }
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);
    }

    if (membership) {
      // 更新现有会员信息
      const updatedMembership = await this.prisma.userMembership.update({
        where: { userId },
        data: {
          memberType: memberType as MemberType,
          endDate,
          isActive: true,
          monthlyPoints: this.getMonthlyPointsByMemberType(memberType),
          usedPoints: 0,
          lastPointsReset: this.isDonationMember(memberType) ? new Date() : null
        },
        include: {
          renewalHistory: true,
          user: {
            include: {
              badges: {
                include: {
                  badge: true
                }
              }
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

      // 如果升级为捐赠会员，重置会员记账点
      if (this.isDonationMember(memberType)) {
        const points = this.getMonthlyPointsByMemberType(memberType);
        await this.resetMemberPoints(userId, points, `升级为${this.getMemberTypeLabel(memberType)}`);
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
          monthlyPoints: this.getMonthlyPointsByMemberType(memberType),
          usedPoints: 0,
          lastPointsReset: this.isDonationMember(memberType) ? new Date() : null
        },
        include: {
          renewalHistory: true,
          user: {
            include: {
              badges: {
                include: {
                  badge: true
                }
              }
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

      // 如果升级为捐赠会员，重置会员记账点和颁发徽章
      if (this.isDonationMember(memberType)) {
        const points = this.getMonthlyPointsByMemberType(memberType);
        await this.resetMemberPoints(userId, points, `成为${this.getMemberTypeLabel(memberType)}`);
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
      // 会员已到期，降级为普通会员（统一处理所有相关字段）
      await this.prisma.userMembership.update({
        where: { userId },
        data: {
          memberType: 'REGULAR',
          isActive: false,
          autoRenewal: false,
          monthlyPoints: 0,
          usedPoints: 0,
          hasCharityAttribution: false,
          hasPrioritySupport: false
        }
      });

      // 发送到期通知
      await this.createNotification(userId, NotificationType.MEMBERSHIP_EXPIRED, '会员已到期', '您的会员已到期，已自动降级为普通会员。');

      console.log(`✅ [会员到期] 用户 ${userId} 的会员已到期并降级为普通会员`);
    }
  }

  // 获取需要检查的活跃会员列表（用于定时任务）
  async getActiveMembershipsForCheck() {
    if (!this.enableMembershipSystem) {
      return [];
    }

    return await this.prisma.userMembership.findMany({
      where: {
        isActive: true,
        endDate: {
          not: null
        }
      },
      select: {
        userId: true,
        memberType: true,
        endDate: true
      }
    });
  }

  // 获取单个会员的状态（用于定时任务检查结果）
  async getMembershipStatus(userId: string) {
    if (!this.enableMembershipSystem) {
      return null;
    }

    return await this.prisma.userMembership.findUnique({
      where: { userId },
      select: { isActive: true }
    });
  }

  // 月度重置会员积分
  async monthlyResetMemberPoints(userId: string) {
    if (!this.enableMembershipSystem || !this.enableAccountingPointsSystem) {
      return;
    }

    const membership = await this.getUserMembership(userId);
    const now = new Date();
    const lastReset = membership.lastPointsReset;

    // 检查是否需要重置（每月重置一次）
    if (!lastReset || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      const pointsToAdd = this.getMonthlyPointsByMemberType(membership.memberType);

      if (pointsToAdd > 0) {
        await this.prisma.userMembership.update({
          where: { userId },
          data: {
            usedPoints: 0,
            lastPointsReset: now
          }
        });

        // 重置会员记账点到月度额度
        await this.resetMemberPoints(userId, pointsToAdd, '月度会员记账点重置');
      }
    }
  }

  // 重置会员记账点（开通会员时调用）
  async resetMemberPoints(userId: string, points: number, description: string) {
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
          memberBalance: points // 直接设置为目标点数
        }
      });
    } else {
      // 重置会员记账点到指定数值
      userPoints = await this.prisma.userAccountingPoints.update({
        where: { userId },
        data: {
          memberBalance: points // 重置而不是累加
        }
      });
    }

    // 记录积分记账
    await this.prisma.accountingPointsTransactions.create({
      data: {
        userId,
        type: 'member',
        operation: 'reset',
        points,
        balanceType: 'member',
        balanceAfter: userPoints.memberBalance,
        description
      }
    });

    return userPoints;
  }

  // 添加会员积分（保留用于其他场景，如月度重置）
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

    // 记录积分记账
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

  // 辅助方法：判断是否为捐赠会员
  private isDonationMember(memberType: string): boolean {
    return ['DONATION_ONE', 'DONATION_TWO', 'DONATION_THREE'].includes(memberType);
  }

  // 辅助方法：根据会员类型获取月度积分
  private getMonthlyPointsByMemberType(memberType: string, isAnnual: boolean = false): number {
    switch (memberType) {
      case 'DONATION_ONE':
      case 'DONATION_TWO':
      case 'DONATION_THREE':
      case 'DONOR': // 兼容旧类型
        // 月度订阅：1000积分/月，年度订阅：1500积分/月
        return isAnnual ? 1500 : 1000;
      case 'LIFETIME':
        return 2000; // 永久会员固定2000积分
      default:
        return 0;
    }
  }

  // 新增：根据会员类型和订阅周期获取月度积分的公共方法
  getMonthlyPointsByMemberTypeAndPeriod(memberType: string, billingPeriod?: string): number {
    const isAnnual = billingPeriod === 'yearly' || billingPeriod === 'annual';
    return this.getMonthlyPointsByMemberType(memberType, isAnnual);
  }

  // 辅助方法：获取会员类型标签
  private getMemberTypeLabel(memberType: string): string {
    switch (memberType) {
      case 'REGULAR':
        return '普通会员';
      case 'DONATION_ONE':
        return '捐赠会员（壹）';
      case 'DONATION_TWO':
        return '捐赠会员（贰）';
      case 'DONATION_THREE':
        return '捐赠会员（叁）';
      case 'LIFETIME':
        return '永久会员';
      default:
        return memberType;
    }
  }

  // RevenueCat集成：更新会员状态
  async updateMembershipFromRevenueCat(
    userId: string,
    memberType: 'DONATION_ONE' | 'DONATION_TWO' | 'DONATION_THREE',
    duration: number,
    revenueCatData: {
      revenueCatUserId: string;
      platform: string;
      externalProductId: string;
      externalTransactionId?: string;
      billingPeriod: string;
      hasCharityAttribution: boolean;
      hasPrioritySupport: boolean;
    }
  ) {
    if (!this.enableMembershipSystem) {
      throw new Error('会员系统未启用');
    }

    const now = new Date();
    let membership = await this.prisma.userMembership.findUnique({
      where: { userId }
    });

    let startDate = now;
    let endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + duration);

    const membershipData = {
      userId,
      memberType: memberType as MemberType,
      startDate,
      endDate,
      isActive: true,
      autoRenewal: true, // RevenueCat订阅默认自动续费
      activationMethod: 'revenuecat',
      monthlyPoints: this.getMonthlyPointsByMemberTypeAndPeriod(memberType, revenueCatData.billingPeriod),
      usedPoints: 0,
      lastPointsReset: new Date(),
      revenueCatUserId: revenueCatData.revenueCatUserId,
      platform: revenueCatData.platform,
      externalProductId: revenueCatData.externalProductId,
      externalTransactionId: revenueCatData.externalTransactionId,
      billingPeriod: revenueCatData.billingPeriod,
      hasCharityAttribution: revenueCatData.hasCharityAttribution,
      hasPrioritySupport: revenueCatData.hasPrioritySupport
    };

    if (membership) {
      // 更新现有会员信息
      const updatedMembership = await this.prisma.userMembership.update({
        where: { userId },
        data: membershipData,
        include: {
          renewalHistory: true,
          user: {
            include: {
              badges: {
                include: {
                  badge: true
                }
              }
            }
          }
        }
      });

      // 记录续费历史
      await this.prisma.membershipRenewal.create({
        data: {
          membershipId: membership.id,
          renewalType: 'REVENUECAT_PURCHASE' as any,
          startDate,
          endDate,
          paymentMethod: 'revenuecat',
          status: 'COMPLETED'
        }
      });

      return updatedMembership;
    } else {
      // 创建新的会员记录
      const newMembership = await this.prisma.userMembership.create({
        data: membershipData,
        include: {
          renewalHistory: true,
          user: {
            include: {
              badges: {
                include: {
                  badge: true
                }
              }
            }
          }
        }
      });

      // 记录续费历史
      await this.prisma.membershipRenewal.create({
        data: {
          membershipId: newMembership.id,
          renewalType: 'REVENUECAT_PURCHASE' as any,
          startDate,
          endDate,
          paymentMethod: 'revenuecat',
          status: 'COMPLETED'
        }
      });

      // 重置会员记账点和徽章
      const points = this.getMonthlyPointsByMemberTypeAndPeriod(memberType, revenueCatData.billingPeriod);
      await this.resetMemberPoints(userId, points, `成为${this.getMemberTypeLabel(memberType)}`);
      await this.awardDonorBadge(userId);

      return newMembership;
    }
  }

  // RevenueCat集成：处理订阅过期
  async expireMembershipFromRevenueCat(userId: string) {
    if (!this.enableMembershipSystem) {
      return;
    }

    const membership = await this.prisma.userMembership.findUnique({
      where: { userId }
    });

    if (membership && membership.isActive) {
      await this.prisma.userMembership.update({
        where: { userId },
        data: {
          memberType: 'REGULAR',
          isActive: false,
          autoRenewal: false,
          monthlyPoints: 0,
          usedPoints: 0,
          hasCharityAttribution: false,
          hasPrioritySupport: false
        }
      });

      // 发送过期通知
      await this.createNotification(
        userId,
        NotificationType.MEMBERSHIP_EXPIRED,
        '会员已过期',
        '您的订阅已过期，已自动降级为普通会员。'
      );
    }
  }
}
