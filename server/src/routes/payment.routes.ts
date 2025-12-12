import { logger } from '../utils/logger';
import { Router, Request, Response } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { PrismaClient, MemberType, NotificationType, RenewalType, RenewalStatus } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// 同步客户信息API
router.post('/sync-customer', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      customerInfo,
      platform,
      timestamp
    } = req.body;

    // 验证必需字段
    if (!customerInfo || !platform) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的字段'
      });
    }

    const userId = req.user!.id;

    logger.info('📱 [SyncCustomer] 收到客户信息同步请求:', {
      userId,
      platform,
      activeSubscriptions: customerInfo.activeSubscriptions,
      activeEntitlements: Object.keys(customerInfo.entitlements?.active || {})
    });

    // 处理客户信息同步
    const result = await processCustomerSync({
      userId: userId,
      customerInfo,
      platform,
      timestamp
    });

    return res.json({
      success: true,
      message: '客户信息同步成功',
      data: result
    });

  } catch (error: any) {
    logger.error('📱 [SyncCustomer] 同步失败:', error);
    return res.status(500).json({
      success: false,
      message: '同步客户信息失败',
      error: error.message
    });
  }
});

// 同步购买信息API
router.post('/sync-purchase', authenticate, async (req: Request, res: Response) => {
  try {
    const {
      customerInfo,
      productIdentifier,
      transaction,
      platform,
      timestamp
    } = req.body;

    // 验证必需字段
    if (!customerInfo || !productIdentifier || !platform) {
      return res.status(400).json({
        success: false,
        message: '缺少必需的字段'
      });
    }

    const userId = req.user!.id;

    logger.info('📱 [SyncPurchase] 收到购买同步请求:', {
      userId,
      productIdentifier,
      platform,
      activeSubscriptions: customerInfo.activeSubscriptions
    });

    // 处理购买同步
    const result = await processPurchaseSync({
      userId: userId,
      customerInfo,
      productIdentifier,
      transaction,
      platform,
      timestamp
    });

    return res.json({
      success: true,
      message: '购买信息同步成功',
      data: result
    });

  } catch (error: any) {
    logger.error('📱 [SyncPurchase] 同步失败:', error);
    return res.status(500).json({
      success: false,
      message: '同步购买信息失败',
      error: error.message
    });
  }
});

/**
 * 处理客户信息同步
 */
async function processCustomerSync(data: {
  userId: string;
  customerInfo: any;
  platform: string;
  timestamp: string;
}) {
  const { userId, customerInfo, platform } = data;

  try {
    // 1. 更新用户的RevenueCat映射
    await updateRevenueCatUserMapping(userId, customerInfo.originalAppUserId);

    // 2. 分析当前会员状态
    const membershipAnalysis = analyzeMembershipStatus(customerInfo);

    logger.info('🔍 [ProcessCustomerSync] 会员状态分析结果:', {
      userId,
      membershipAnalysis,
      originalCustomerInfo: {
        activeSubscriptions: customerInfo.activeSubscriptions,
        allExpirationDates: customerInfo.allExpirationDates,
        entitlements: customerInfo.entitlements
      }
    });

    // 3. 更新用户会员状态
    await updateUserMembershipStatus(userId, {
      ...membershipAnalysis,
      platform,
      externalUserId: customerInfo.originalAppUserId,
      activeSubscriptions: customerInfo.activeSubscriptions
    });

    // 4. 更新用户权益
    await updateUserEntitlements(userId, customerInfo.entitlements?.active || {});

    // 5. 创建会员通知
    await createMembershipNotification(userId, membershipAnalysis);

    // 6. 如果是续费，记录续费历史
    if (membershipAnalysis.isActive && membershipAnalysis.level !== 'free') {
      await recordMembershipRenewal(userId, membershipAnalysis, platform);
    }

    return {
      membershipLevel: membershipAnalysis.level,
      isActive: membershipAnalysis.isActive,
      expiresAt: membershipAnalysis.expiresAt,
      activeSubscriptions: customerInfo.activeSubscriptions,
      activeEntitlements: Object.keys(customerInfo.entitlements?.active || {}),
      syncedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('📱 [ProcessCustomerSync] 处理失败:', error);
    throw error;
  }
}

/**
 * 处理购买信息同步
 */
async function processPurchaseSync(data: {
  userId: string;
  customerInfo: any;
  productIdentifier: string;
  transaction?: any;
  platform: string;
  timestamp: string;
}) {
  const { userId, customerInfo, productIdentifier, platform } = data;

  try {
    // 1. 更新用户的RevenueCat用户ID映射
    await updateRevenueCatUserMapping(userId, customerInfo.originalAppUserId);

    // 2. 分析活跃订阅，确定会员级别
    const membershipLevel = determineMembershipLevel(customerInfo.activeSubscriptions);

    // 3. 更新用户会员状态
    if (membershipLevel) {
      await updateUserMembership(userId, {
        level: membershipLevel,
        platform,
        externalUserId: customerInfo.originalAppUserId,
        activeSubscriptions: customerInfo.activeSubscriptions,
        expirationDates: customerInfo.allExpirationDates
      });
    }

    return {
      membershipLevel,
      activeSubscriptions: customerInfo.activeSubscriptions,
      syncedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('📱 [ProcessPurchaseSync] 处理失败:', error);
    throw error;
  }
}

/**
 * 分析会员状态
 */
function analyzeMembershipStatus(customerInfo: any) {
  const { activeSubscriptions, allExpirationDates, entitlements } = customerInfo;

  logger.info('🔍 [AnalyzeMembershipStatus] 开始分析会员状态:', {
    activeSubscriptions,
    allExpirationDates,
    entitlements: entitlements?.active || {}
  });

  // 检查是否有活跃订阅
  const hasActiveSubscriptions = activeSubscriptions && activeSubscriptions.length > 0;

  // 确定会员级别
  let level = 'free';
  let isActive = false;
  let expiresAt: Date | null = null;

  if (hasActiveSubscriptions) {
    logger.info('🔍 [AnalyzeMembershipStatus] 检查活跃订阅:', activeSubscriptions);

    // 检查捐赠会员（叁）
    const hasDonationThree = activeSubscriptions.some((sub: string) => {
      const matches = sub.includes('donation.three') || sub.includes('Monthly3') || sub.includes('Annual3');
      logger.info(`🔍 检查订阅 ${sub} 是否为捐赠会员（叁）: ${matches}`);
      return matches;
    });

    if (hasDonationThree) {
      level = 'donation_three';
      isActive = true;
      logger.info('✅ [AnalyzeMembershipStatus] 识别为捐赠会员（叁）');
    } else {
      // 检查捐赠会员（贰）
      const hasDonationTwo = activeSubscriptions.some((sub: string) => {
        const matches = sub.includes('donation.two') || sub.includes('Monthly2') || sub.includes('Annual2');
        logger.info(`🔍 检查订阅 ${sub} 是否为捐赠会员（贰）: ${matches}`);
        return matches;
      });

      if (hasDonationTwo) {
        level = 'donation_two';
        isActive = true;
        logger.info('✅ [AnalyzeMembershipStatus] 识别为捐赠会员（贰）');
      } else {
        // 检查捐赠会员（壹）
        const hasDonationOne = activeSubscriptions.some((sub: string) => {
          const matches = sub.includes('donation.one') || sub.includes('Monthly1') || sub.includes('Annual1');
          logger.info(`🔍 检查订阅 ${sub} 是否为捐赠会员（壹）: ${matches}`);
          return matches;
        });

        if (hasDonationOne) {
          level = 'donation_one';
          isActive = true;
          logger.info('✅ [AnalyzeMembershipStatus] 识别为捐赠会员（壹）');
        } else {
          logger.info('⚠️ [AnalyzeMembershipStatus] 未识别的订阅类型');
        }
      }
    }

    // 获取最晚的过期时间
    if (isActive && allExpirationDates) {
      expiresAt = getLatestExpirationDate(allExpirationDates);
    }
  }

  // 检查终身购买
  const hasLifetimePurchase = checkLifetimePurchase(entitlements?.all || {});
  if (hasLifetimePurchase.hasLifetime) {
    level = hasLifetimePurchase.level;
    isActive = true;
    expiresAt = null; // 终身购买没有过期时间
  }

  const result = {
    level,
    isActive,
    expiresAt,
    hasActiveSubscriptions,
    hasLifetimePurchase: hasLifetimePurchase.hasLifetime,
    activeSubscriptions // 添加活跃订阅列表
  };

  logger.info('✅ [AnalyzeMembershipStatus] 分析完成:', result);

  return result;
}

/**
 * 检查终身购买
 */
function checkLifetimePurchase(allEntitlements: { [key: string]: any }) {
  const lifetimeProducts = Object.keys(allEntitlements).filter(key => 
    key.includes('lifetime') || key.includes('Lifetime')
  );

  if (lifetimeProducts.length === 0) {
    return { hasLifetime: false, level: 'free' };
  }

  // 检查捐赠会员终身购买
  const hasDonationLifetime = lifetimeProducts.some(product => 
    product.includes('donation') || product.includes('Donation')
  );

  if (hasDonationLifetime) {
    return { hasLifetime: true, level: 'donation_three' }; // 终身购买默认为最高级别
  }

  return { hasLifetime: false, level: 'free' };
}

/**
 * 获取最晚的过期时间
 */
function getLatestExpirationDate(expirationDates: { [key: string]: string }): Date | null {
  const dates = Object.values(expirationDates)
    .filter(date => date)
    .map(date => new Date(date))
    .filter(date => !isNaN(date.getTime()));

  if (dates.length === 0) {
    return null;
  }

  return new Date(Math.max(...dates.map(date => date.getTime())));
}

/**
 * 更新RevenueCat用户ID映射
 */
async function updateRevenueCatUserMapping(userId: string, revenueCatUserId: string) {
  logger.info('📱 [UpdateMapping] 更新用户映射:', { userId, revenueCatUserId });

  try {
    // 在UserMembership中更新RevenueCat映射
    await prisma.userMembership.upsert({
      where: { userId: userId },
      update: {
        revenueCatUserId: revenueCatUserId,
        updatedAt: new Date()
      },
      create: {
        userId: userId,
        memberType: MemberType.REGULAR,
        startDate: new Date(),
        revenueCatUserId: revenueCatUserId
      }
    });

    logger.info('✅ [UpdateMapping] 用户映射更新成功');

    // 处理该用户的待关联购买
    await processPendingPurchasesForUser(userId, revenueCatUserId);

  } catch (error) {
    logger.error('❌ [UpdateMapping] 更新用户映射失败:', error);
    throw error;
  }
}

/**
 * 处理用户的待关联购买
 */
async function processPendingPurchasesForUser(userId: string, revenueCatUserId: string) {
  try {
    logger.info('🔄 [ProcessPending] 开始处理用户待关联购买:', { userId, revenueCatUserId });

    const { PendingMembershipService } = require('../services/pending-membership.service');
    const pendingService = new PendingMembershipService();

    const success = await pendingService.processPendingPurchasesForUser(userId, revenueCatUserId);

    if (success) {
      logger.info('✅ [ProcessPending] 用户待关联购买处理成功');
    } else {
      logger.warn('⚠️ [ProcessPending] 用户待关联购买处理部分失败');
    }

  } catch (error) {
    logger.error('❌ [ProcessPending] 处理用户待关联购买失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

/**
 * 更新用户会员状态
 */
async function updateUserMembershipStatus(userId: string, membershipData: {
  level: string;
  isActive: boolean;
  expiresAt: Date | null;
  platform: string;
  externalUserId: string;
  hasActiveSubscriptions: boolean;
  hasLifetimePurchase: boolean;
  activeSubscriptions?: string[];
}) {
  logger.info('📱 [UpdateMembershipStatus] 更新会员状态:', {
    userId,
    level: membershipData.level,
    isActive: membershipData.isActive,
    expiresAt: membershipData.expiresAt
  });

  try {
    // 映射会员级别
    const memberTypeMap: { [key: string]: MemberType } = {
      'donation_one': MemberType.DONATION_ONE,
      'donation_two': MemberType.DONATION_TWO,
      'donation_three': MemberType.DONATION_THREE,
      'free': MemberType.REGULAR
    };

    const memberType = memberTypeMap[membershipData.level] || MemberType.REGULAR;

    // 计算月度积分 - 根据订阅周期而不是会员级别
    // 月度订阅：1000积分/月，年度订阅：1500积分/月
    let monthlyPoints = 0;
    if (memberType !== MemberType.REGULAR) {
      // 检查是否为年度订阅
      const isAnnualSubscription = membershipData.activeSubscriptions &&
        membershipData.activeSubscriptions.some(sub =>
          sub.includes('Annual') || sub.includes('annual') || sub.includes('yearly')
        );

      monthlyPoints = isAnnualSubscription ? 1500 : 1000;
    }

    // 更新或创建会员记录
    const updatedMembership = await prisma.userMembership.upsert({
      where: { userId: userId },
      update: {
        memberType: memberType,
        isActive: membershipData.isActive,
        endDate: membershipData.expiresAt,
        platform: membershipData.platform,
        revenueCatUserId: membershipData.externalUserId,
        monthlyPoints: monthlyPoints,
        autoRenewal: membershipData.hasActiveSubscriptions,
        updatedAt: new Date()
      },
      create: {
        userId: userId,
        memberType: memberType,
        startDate: new Date(),
        endDate: membershipData.expiresAt,
        isActive: membershipData.isActive,
        platform: membershipData.platform,
        revenueCatUserId: membershipData.externalUserId,
        monthlyPoints: monthlyPoints,
        autoRenewal: membershipData.hasActiveSubscriptions,
        activationMethod: 'revenuecat'
      }
    });

    logger.info('✅ [UpdateMembershipStatus] 会员状态更新成功:', {
      userId,
      memberType,
      isActive: membershipData.isActive,
      updatedMembership: {
        id: updatedMembership.id,
        memberType: updatedMembership.memberType,
        isActive: updatedMembership.isActive,
        endDate: updatedMembership.endDate,
        monthlyPoints: updatedMembership.monthlyPoints
      }
    });

    // 如果是新激活的会员，添加会员积分
    if (membershipData.isActive && memberType !== MemberType.REGULAR && monthlyPoints > 0) {
      try {
        const { MembershipService } = await import('../services/membership.service');
        const membershipService = new MembershipService();

        // 检查是否启用积分系统
        if (membershipService.isAccountingPointsEnabled()) {
          await membershipService.addMemberPoints(
            userId,
            monthlyPoints,
            `激活${getMemberTypeLabel(memberType)}赠送`
          );
          logger.info('✅ [UpdateMembershipStatus] 会员积分添加成功:', {
            userId,
            points: monthlyPoints,
            memberType
          });
        }
      } catch (pointsError) {
        logger.error('⚠️ [UpdateMembershipStatus] 添加会员积分失败:', pointsError);
        // 不抛出错误，因为会员状态更新已经成功
      }
    }

  } catch (error) {
    logger.error('❌ [UpdateMembershipStatus] 更新会员状态失败:', error);
    throw error;
  }
}

/**
 * 获取会员类型标签
 */
function getMemberTypeLabel(memberType: MemberType): string {
  switch (memberType) {
    case MemberType.DONATION_ONE:
      return '捐赠会员（壹）';
    case MemberType.DONATION_TWO:
      return '捐赠会员（贰）';
    case MemberType.DONATION_THREE:
      return '捐赠会员（叁）';
    // case MemberType.DONOR:
    //   return '捐赠会员';
    case MemberType.LIFETIME:
      return '永久会员';
    default:
      return '普通会员';
  }
}

/**
 * 更新用户权益
 */
async function updateUserEntitlements(userId: string, activeEntitlements: { [key: string]: any }) {
  const entitlementList = Object.keys(activeEntitlements);

  logger.info('📱 [UpdateEntitlements] 更新用户权益:', {
    userId,
    entitlements: entitlementList
  });

  try {
    // 权益映射到会员类型
    const entitlementToMemberType: { [key: string]: MemberType } = {
      'donation_one_features': MemberType.DONATION_ONE,
      'donation_two_features': MemberType.DONATION_TWO,
      'donation_three_features': MemberType.DONATION_THREE
    };

    // 为每个权益创建或更新记录
    for (const entitlementKey of entitlementList) {
      const entitlement = activeEntitlements[entitlementKey];
      const memberType = entitlementToMemberType[entitlementKey];

      if (memberType) {
        await prisma.membershipEntitlements.upsert({
          where: {
            memberType_entitlementKey: {
              memberType: memberType,
              entitlementKey: entitlementKey
            }
          },
          update: {
            isActive: entitlement.isActive || true,
            updatedAt: new Date()
          },
          create: {
            memberType: memberType,
            entitlementKey: entitlementKey,
            entitlementValue: JSON.stringify(entitlement),
            isActive: entitlement.isActive || true
          }
        });
      }
    }

    logger.info('✅ [UpdateEntitlements] 权益更新成功');
  } catch (error) {
    logger.error('❌ [UpdateEntitlements] 更新权益失败:', error);
    // 权益更新失败不应该阻止主流程
  }
}

/**
 * 根据活跃订阅确定会员级别
 */
function determineMembershipLevel(activeSubscriptions: string[]): string | null {
  if (!activeSubscriptions || activeSubscriptions.length === 0) {
    return null;
  }

  // 检查捐赠会员（叁）
  const hasDonationThree = activeSubscriptions.some(sub =>
    sub.includes('donation.three') || sub.includes('Monthly3') || sub.includes('Annual3')
  );

  if (hasDonationThree) {
    return 'donation_three';
  }

  // 检查捐赠会员（贰）
  const hasDonationTwo = activeSubscriptions.some(sub =>
    sub.includes('donation.two') || sub.includes('Monthly2') || sub.includes('Annual2')
  );

  if (hasDonationTwo) {
    return 'donation_two';
  }

  // 检查捐赠会员（壹）
  const hasDonationOne = activeSubscriptions.some(sub =>
    sub.includes('donation.one') || sub.includes('Monthly1') || sub.includes('Annual1')
  );

  if (hasDonationOne) {
    return 'donation_one';
  }

  return null;
}

/**
 * 更新用户会员状态（购买同步专用）
 */
async function updateUserMembership(userId: string, membershipData: {
  level: string;
  platform: string;
  externalUserId: string;
  activeSubscriptions: string[];
  expirationDates: { [key: string]: string };
}) {
  // 计算过期时间
  const expirationDate = getLatestExpirationDate(membershipData.expirationDates);

  logger.info('📱 [UpdateMembership] 更新会员状态:', {
    userId,
    level: membershipData.level,
    expiresAt: expirationDate
  });

  try {
    // 映射会员级别
    const memberTypeMap: { [key: string]: MemberType } = {
      'donation_one': MemberType.DONATION_ONE,
      'donation_two': MemberType.DONATION_TWO,
      'donation_three': MemberType.DONATION_THREE,
      'free': MemberType.REGULAR
    };

    const memberType = memberTypeMap[membershipData.level] || MemberType.REGULAR;

    // 计算月度积分 - 根据订阅周期而不是会员级别
    // 月度订阅：1000积分/月，年度订阅：1500积分/月
    let monthlyPoints = 0;
    if (memberType !== MemberType.REGULAR) {
      // 检查是否为年度订阅
      const isAnnualSubscription = membershipData.activeSubscriptions.some(sub =>
        sub.includes('Annual') || sub.includes('annual') || sub.includes('yearly')
      );

      monthlyPoints = isAnnualSubscription ? 1500 : 1000;
    }

    // 更新或创建会员记录
    const updatedMembership = await prisma.userMembership.upsert({
      where: { userId: userId },
      update: {
        memberType: memberType,
        isActive: true,
        endDate: expirationDate,
        platform: membershipData.platform,
        revenueCatUserId: membershipData.externalUserId,
        monthlyPoints: monthlyPoints,
        autoRenewal: membershipData.activeSubscriptions.length > 0,
        updatedAt: new Date()
      },
      create: {
        userId: userId,
        memberType: memberType,
        startDate: new Date(),
        endDate: expirationDate,
        isActive: true,
        platform: membershipData.platform,
        revenueCatUserId: membershipData.externalUserId,
        monthlyPoints: monthlyPoints,
        autoRenewal: membershipData.activeSubscriptions.length > 0,
        activationMethod: 'revenuecat'
      }
    });

    logger.info('✅ [UpdateMembership] 会员状态更新成功:', {
      userId,
      memberType,
      isActive: true,
      updatedMembership: {
        id: updatedMembership.id,
        memberType: updatedMembership.memberType,
        isActive: updatedMembership.isActive,
        endDate: updatedMembership.endDate,
        monthlyPoints: updatedMembership.monthlyPoints
      }
    });

    // 如果是新激活的会员，添加会员积分
    if (memberType !== MemberType.REGULAR && monthlyPoints > 0) {
      try {
        const { MembershipService } = await import('../services/membership.service');
        const membershipService = new MembershipService();

        // 检查是否启用积分系统
        if (membershipService.isAccountingPointsEnabled()) {
          await membershipService.resetMemberPoints(
            userId,
            monthlyPoints,
            `激活${getMemberTypeLabel(memberType)}`
          );
          logger.info('✅ [UpdateMembership] 会员记账点重置成功:', {
            userId,
            points: monthlyPoints,
            memberType
          });
        }
      } catch (pointsError) {
        logger.error('⚠️ [UpdateMembership] 添加会员积分失败:', pointsError);
        // 不抛出错误，因为会员状态更新已经成功
      }
    }

  } catch (error) {
    logger.error('❌ [UpdateMembership] 更新会员状态失败:', error);
    throw error;
  }
}

/**
 * 创建会员通知
 */
async function createMembershipNotification(userId: string, membershipAnalysis: any) {
  try {
    logger.info('📱 [CreateNotification] 创建会员通知:', {
      userId,
      level: membershipAnalysis.level,
      isActive: membershipAnalysis.isActive
    });

    let notificationType: NotificationType = NotificationType.MEMBERSHIP_RENEWED;
    let title = '会员状态更新';
    let content = '';

    if (membershipAnalysis.isActive && membershipAnalysis.level !== 'free') {
      const levelNames: Record<string, string> = {
        'donation_one': '捐赠会员（壹）',
        'donation_two': '捐赠会员（贰）',
        'donation_three': '捐赠会员（叁）'
      };

      const levelName = levelNames[membershipAnalysis.level as string] || '会员';
      title = '会员激活成功';
      content = `恭喜您！${levelName}已成功激活。感谢您的支持！`;

      if (membershipAnalysis.expiresAt) {
        const expiryDate = new Date(membershipAnalysis.expiresAt).toLocaleDateString();
        content += ` 有效期至：${expiryDate}`;
      } else {
        content += ' 永久有效。';
      }
    } else {
      notificationType = NotificationType.MEMBERSHIP_EXPIRED;
      title = '会员状态变更';
      content = '您的会员状态已更新为普通会员。';
    }

    await prisma.membershipNotification.create({
      data: {
        userId: userId,
        notificationType: notificationType,
        title: title,
        content: content,
        isRead: false
      }
    });

    logger.info('✅ [CreateNotification] 会员通知创建成功');
  } catch (error) {
    logger.error('❌ [CreateNotification] 创建会员通知失败:', error);
    // 通知创建失败不应该阻止主流程
  }
}

/**
 * 记录会员续费历史
 */
async function recordMembershipRenewal(userId: string, membershipAnalysis: any, platform: string) {
  try {
    logger.info('📱 [RecordRenewal] 记录续费历史:', {
      userId,
      level: membershipAnalysis.level,
      platform
    });

    // 获取用户的会员记录
    const membership = await prisma.userMembership.findUnique({
      where: { userId: userId }
    });

    if (!membership) {
      logger.warn('📱 [RecordRenewal] 未找到会员记录，跳过续费记录');
      return;
    }

    // 检查是否已存在相同的续费记录（避免重复）
    const existingRenewal = await prisma.membershipRenewal.findFirst({
      where: {
        membershipId: membership.id,
        startDate: membership.startDate,
        endDate: membership.endDate || undefined
      }
    });

    if (existingRenewal) {
      logger.info('📱 [RecordRenewal] 续费记录已存在，跳过创建');
      return;
    }

    // 创建续费记录
    await prisma.membershipRenewal.create({
      data: {
        membershipId: membership.id,
        renewalType: membershipAnalysis.hasLifetimePurchase ? RenewalType.REVENUECAT_PURCHASE : RenewalType.AUTO,
        startDate: membership.startDate,
        endDate: membership.endDate || new Date('2099-12-31'), // 终身购买设置为远期日期
        paymentMethod: platform === 'ios' ? 'APP_STORE' : 'GOOGLE_PLAY',
        status: RenewalStatus.COMPLETED
      }
    });

    logger.info('✅ [RecordRenewal] 续费历史记录成功');
  } catch (error) {
    logger.error('❌ [RecordRenewal] 记录续费历史失败:', error);
    // 续费记录失败不应该阻止主流程
  }
}

export default router;
