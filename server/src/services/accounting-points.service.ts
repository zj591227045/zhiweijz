import { PrismaClient } from '@prisma/client';
import type { 
  UserAccountingPoints, 
  AccountingPointsTransactions, 
  UserCheckins 
} from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 记账点系统服务
 */
class AccountingPointsService {
  // 记账点消费标准
  static POINT_COSTS = {
    text: 1,
    voice: 2,
    image: 3
  };

  // 签到奖励点数
  static CHECKIN_REWARD = 5;

  // 每日赠送点数
  static DAILY_GIFT = 10;

  // 赠送余额上限
  static GIFT_BALANCE_LIMIT = 30;

  /**
   * 获取用户记账点余额
   */
  static async getUserPoints(userId: string): Promise<UserAccountingPoints> {
    let userPoints = await prisma.userAccountingPoints.findUnique({
      where: { userId }
    });

    // 如果用户没有记账点账户，创建一个
    if (!userPoints) {
      userPoints = await this.createUserPointsAccount(userId);
    }

    return userPoints;
  }

  /**
   * 为用户创建记账点账户
   */
  static async createUserPointsAccount(userId: string): Promise<UserAccountingPoints> {
    const userPoints = await prisma.userAccountingPoints.create({
      data: {
        userId,
        giftBalance: this.DAILY_GIFT,
        memberBalance: 0
      }
    });

    // 记录初始化记录
    await this.recordTransaction(userId, 'gift', 'add', this.DAILY_GIFT, 'gift', this.DAILY_GIFT, '系统初始化赠送记账点');

    return userPoints;
  }

  /**
   * 检查用户是否有足够的记账点
   */
  static async canUsePoints(userId: string, pointsNeeded: number): Promise<boolean> {
    const userPoints = await this.getUserPoints(userId);
    const totalBalance = userPoints.giftBalance + userPoints.memberBalance;
    return totalBalance >= pointsNeeded;
  }

  /**
   * 消费记账点（优先使用赠送余额）
   */
  static async deductPoints(userId: string, type: string, pointsNeeded: number): Promise<{
    giftBalance: number;
    memberBalance: number;
    totalDeducted: number;
  }> {
    const userPoints = await this.getUserPoints(userId);
    const totalBalance = userPoints.giftBalance + userPoints.memberBalance;

    if (totalBalance < pointsNeeded) {
      throw new Error('记账点余额不足');
    }

    let remainingPoints = pointsNeeded;
    let newGiftBalance = userPoints.giftBalance;
    let newMemberBalance = userPoints.memberBalance;

    // 优先扣除赠送余额
    if (remainingPoints > 0 && newGiftBalance > 0) {
      const deductFromGift = Math.min(remainingPoints, newGiftBalance);
      newGiftBalance -= deductFromGift;
      remainingPoints -= deductFromGift;

      // 记录赠送余额扣除
      await this.recordTransaction(
        userId, 
        type, 
        'deduct', 
        deductFromGift, 
        'gift', 
        newGiftBalance, 
        `${this.getTypeDescription(type)}消费记账点`
      );
    }

    // 如果还有剩余，扣除会员余额
    if (remainingPoints > 0 && newMemberBalance > 0) {
      const deductFromMember = Math.min(remainingPoints, newMemberBalance);
      newMemberBalance -= deductFromMember;
      remainingPoints -= deductFromMember;

      // 记录会员余额扣除
      await this.recordTransaction(
        userId, 
        type, 
        'deduct', 
        deductFromMember, 
        'member', 
        newMemberBalance, 
        `${this.getTypeDescription(type)}消费记账点`
      );
    }

    // 更新用户记账点余额
    await prisma.userAccountingPoints.update({
      where: { userId },
      data: {
        giftBalance: newGiftBalance,
        memberBalance: newMemberBalance
      }
    });

    return {
      giftBalance: newGiftBalance,
      memberBalance: newMemberBalance,
      totalDeducted: pointsNeeded
    };
  }

  /**
   * 增加记账点
   */
  static async addPoints(
    userId: string, 
    type: string, 
    points: number, 
    balanceType: 'gift' | 'member' = 'gift', 
    description: string = ''
  ): Promise<number> {
    const userPoints = await this.getUserPoints(userId);
    
    let newBalance: number;
    if (balanceType === 'gift') {
      newBalance = userPoints.giftBalance + points;
      await prisma.userAccountingPoints.update({
        where: { userId },
        data: { giftBalance: newBalance }
      });
    } else {
      newBalance = userPoints.memberBalance + points;
      await prisma.userAccountingPoints.update({
        where: { userId },
        data: { memberBalance: newBalance }
      });
    }

    // 记录交易
    await this.recordTransaction(userId, type, 'add', points, balanceType, newBalance, description);

    return newBalance;
  }

  /**
   * 记录记账点交易
   */
  static async recordTransaction(
    userId: string, 
    type: string, 
    operation: 'add' | 'deduct', 
    points: number, 
    balanceType: 'gift' | 'member', 
    balanceAfter: number, 
    description: string = ''
  ): Promise<AccountingPointsTransactions> {
    return await prisma.accountingPointsTransactions.create({
      data: {
        userId,
        type,
        operation,
        points,
        balanceType,
        balanceAfter,
        description
      }
    });
  }

  /**
   * 用户签到
   */
  static async checkin(userId: string): Promise<{
    checkin: UserCheckins;
    newBalance: number;
  }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
    
    // 检查今天是否已经签到
    const existingCheckin = await prisma.userCheckins.findUnique({
      where: {
        userId_checkinDate: {
          userId,
          checkinDate: new Date(today)
        }
      }
    });

    if (existingCheckin) {
      throw new Error('今天已经签到过了');
    }

    // 创建签到记录
    const checkin = await prisma.userCheckins.create({
      data: {
        userId,
        checkinDate: new Date(today),
        pointsAwarded: this.CHECKIN_REWARD
      }
    });

    // 增加记账点
    const newBalance = await this.addPoints(
      userId, 
      'checkin', 
      this.CHECKIN_REWARD, 
      'gift', 
      '每日签到奖励'
    );

    return {
      checkin,
      newBalance
    };
  }

  /**
   * 检查用户今天是否已经签到
   */
  static async hasCheckedInToday(userId: string): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];
    
    const checkin = await prisma.userCheckins.findUnique({
      where: {
        userId_checkinDate: {
          userId,
          checkinDate: new Date(today)
        }
      }
    });

    return !!checkin;
  }

  /**
   * 检查并执行每日首次访问赠送记账点
   * 当用户每日首次调用API时调用此方法
   */
  static async checkAndGiveDailyPoints(userId: string): Promise<{
    isFirstVisitToday: boolean;
    newBalance?: number;
    pointsGiven?: number;
  }> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD格式
    const todayDate = new Date(today);
    
    // 获取用户记账点信息
    const userPoints = await this.getUserPoints(userId);
    
    // 检查今天是否已经赠送过
    const hasGivenToday = userPoints.lastDailyGiftDate && 
      userPoints.lastDailyGiftDate.toISOString().split('T')[0] === today;
    
    if (hasGivenToday) {
      return {
        isFirstVisitToday: false
      };
    }
    
    // 检查赠送余额是否已达上限
    let pointsToGive = 0;
    if (userPoints.giftBalance < this.GIFT_BALANCE_LIMIT) {
      pointsToGive = Math.min(
        this.DAILY_GIFT, 
        this.GIFT_BALANCE_LIMIT - userPoints.giftBalance
      );
    }
    
    // 更新最后赠送日期（即使没有实际赠送点数也要更新，避免重复检查）
    await prisma.userAccountingPoints.update({
      where: { userId },
      data: { lastDailyGiftDate: todayDate }
    });
    
    if (pointsToGive > 0) {
      // 赠送记账点
      const newBalance = await this.addPoints(
        userId, 
        'daily_first_visit', 
        pointsToGive, 
        'gift', 
        `每日首次访问赠送记账点`
      );
      
      return {
        isFirstVisitToday: true,
        newBalance,
        pointsGiven: pointsToGive
      };
    } else {
      return {
        isFirstVisitToday: true,
        pointsGiven: 0
      };
    }
  }
  static async dailyGiftPoints(): Promise<void> {
    // 获取所有用户
    const users = await prisma.user.findMany({
      select: { id: true }
    });

    for (const user of users) {
      const userPoints = await this.getUserPoints(user.id);
      
      // 只有赠送余额小于上限才赠送
      if (userPoints.giftBalance < this.GIFT_BALANCE_LIMIT) {
        const pointsToAdd = Math.min(
          this.DAILY_GIFT, 
          this.GIFT_BALANCE_LIMIT - userPoints.giftBalance
        );
        
        if (pointsToAdd > 0) {
          await this.addPoints(
            user.id, 
            'daily', 
            pointsToAdd, 
            'gift', 
            '每日赠送记账点'
          );
        }
      }
    }
  }

  /**
   * 获取用户交易记录
   */
  static async getUserTransactions(
    userId: string, 
    limit: number = 50, 
    offset: number = 0
  ): Promise<AccountingPointsTransactions[]> {
    return await prisma.accountingPointsTransactions.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  /**
   * 管理员手动添加记账点
   */
  static async adminAddPoints(userId: string, points: number, description: string = '管理员手动添加'): Promise<number> {
    return await this.addPoints(userId, 'admin', points, 'member', description);
  }

  /**
   * 获取每日活跃用户统计
   * @param date 日期，格式 YYYY-MM-DD，默认为今天
   */
  static async getDailyActiveUsersStats(date?: string): Promise<{
    date: string;
    activeUsers: number;
    totalPointsGiven: number;
  }> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    
    // 统计今天首次访问的用户数量（基于赠送记录）
    const stats = await prisma.accountingPointsTransactions.aggregate({
      where: {
        type: 'daily_first_visit',
        createdAt: {
          gte: new Date(targetDate),
          lt: new Date(new Date(targetDate).getTime() + 24 * 60 * 60 * 1000)
        }
      },
      _count: {
        userId: true
      },
      _sum: {
        points: true
      }
    });
    
    return {
      date: targetDate,
      activeUsers: stats._count.userId || 0,
      totalPointsGiven: stats._sum.points || 0
    };
  }

  /**
   * 获取历史日活跃用户统计
   * @param days 获取最近多少天的数据，默认7天
   */
  static async getHistoricalDailyActiveStats(days: number = 7): Promise<Array<{
    date: string;
    activeUsers: number;
    totalPointsGiven: number;
  }>> {
    const results = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const stats = await this.getDailyActiveUsersStats(dateStr);
      results.push(stats);
    }
    
    return results.reverse(); // 返回按日期正序排列的结果
  }
  /**
   * 获取类型描述
   */
  static getTypeDescription(type: string): string {
    const descriptions: Record<string, string> = {
      text: '文本AI',
      voice: '语音AI',
      image: '图像AI',
      gift: '赠送',
      member: '会员',
      daily: '每日',
      daily_first_visit: '每日首次访问',
      checkin: '签到',
      admin: '管理员'
    };
    return descriptions[type] || type;
  }

  /**
   * 获取所有用户记账点统计
   */
  static async getAllUsersPointsStats(limit: number = 50, offset: number = 0): Promise<{
    users: Array<{
      userId: string;
      giftBalance: number;
      memberBalance: number;
      totalBalance: number;
      user: {
        name: string;
        email: string;
      };
    }>;
    total: number;
  }> {
    const [users, total] = await Promise.all([
      prisma.userAccountingPoints.findMany({
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.userAccountingPoints.count()
    ]);

    return {
      users: users.map(u => ({
        userId: u.userId,
        giftBalance: u.giftBalance,
        memberBalance: u.memberBalance,
        totalBalance: u.giftBalance + u.memberBalance,
        user: u.user
      })),
      total
    };
  }
}

export default AccountingPointsService; 