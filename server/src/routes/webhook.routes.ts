import { Router, Request, Response } from 'express';
import crypto from 'crypto';

const router = Router();

// RevenueCat Webhook事件类型
enum WebhookEventType {
  INITIAL_PURCHASE = 'INITIAL_PURCHASE',
  NON_RENEWING_PURCHASE = 'NON_RENEWING_PURCHASE',
  RENEWAL = 'RENEWAL',
  PRODUCT_CHANGE = 'PRODUCT_CHANGE',
  CANCELLATION = 'CANCELLATION',
  UNCANCELLATION = 'UNCANCELLATION',
  EXPIRATION = 'EXPIRATION',
  BILLING_ISSUE = 'BILLING_ISSUE',
  SUBSCRIBER_ALIAS = 'SUBSCRIBER_ALIAS',
  SUBSCRIPTION_EXTENDED = 'SUBSCRIPTION_EXTENDED',
  SUBSCRIPTION_PAUSED = 'SUBSCRIPTION_PAUSED',
  SUBSCRIPTION_RESUMED = 'SUBSCRIPTION_RESUMED',
  TEST = 'TEST' // RevenueCat测试事件
}

interface WebhookEvent {
  api_version: string;
  event: {
    type: WebhookEventType;
    id: string;
    event_timestamp_ms: number;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms?: number;
    environment: 'SANDBOX' | 'PRODUCTION';
    entitlement_id?: string;
    entitlement_ids?: string[];
    presented_offering_id?: string;
    transaction_id: string;
    original_transaction_id: string;
    is_family_share: boolean;
    country_code: string;
    app_id: string;
    offer_code?: string;
    currency: string;
    price: number;
    price_in_purchased_currency: number;
    subscriber_attributes?: { [key: string]: any };
    store: 'APP_STORE' | 'MAC_APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
    takehome_percentage: number;
    commission_percentage: number;
  };
}

// RevenueCat Webhook处理
router.post('/revenuecat', async (req: Request, res: Response) => {
  try {
    console.log('📨 [RevenueCatWebhook] 收到webhook请求:', {
      headers: req.headers,
      body: req.body
    });

    // 验证webhook签名
    const isValidSignature = await verifyWebhookSignature(req);
    if (!isValidSignature) {
      console.error('🔒 [RevenueCatWebhook] 签名验证失败');
      return res.status(401).json({
        success: false,
        message: 'Invalid signature'
      });
    }

    const webhookEvent: WebhookEvent = req.body;
    
    console.log('📨 [RevenueCatWebhook] 收到事件:', {
      type: webhookEvent.event.type,
      userId: webhookEvent.event.app_user_id,
      productId: webhookEvent.event.product_id,
      environment: webhookEvent.event.environment
    });

    // 处理webhook事件
    const processed = await processWebhookEvent(webhookEvent);

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
      processed
    });

  } catch (error: any) {
    console.error('❌ [RevenueCatWebhook] 处理失败:', error);
    return res.status(500).json({
      success: false,
      message: 'Webhook processing failed',
      error: error.message
    });
  }
});

/**
 * 验证RevenueCat webhook签名
 */
async function verifyWebhookSignature(req: Request): Promise<boolean> {
  try {
    const signature = req.headers['authorization'];
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      console.warn('🔒 [WebhookSignature] 缺少签名或密钥');
      // 在开发环境中，如果没有配置密钥，跳过验证
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔒 [WebhookSignature] 开发环境，跳过签名验证');
        return true;
      }

      // 如果没有配置webhook secret，但请求来自RevenueCat，允许通过
      // 这种情况下依赖其他安全措施（如IP白名单、请求格式验证等）
      if (!webhookSecret && req.headers['user-agent'] === 'RevenueCat') {
        console.warn('🔒 [WebhookSignature] 未配置webhook secret，但请求来自RevenueCat，允许通过');
        console.warn('🔒 [WebhookSignature] 建议配置webhook secret以增强安全性');
        return true;
      }

      return false;
    }

    // RevenueCat的authorization header可能是API Key而不是签名
    // 如果authorization header是API Key格式（sk_开头），直接验证API Key
    if (signature.startsWith('sk_')) {
      const isValidApiKey = signature === webhookSecret;
      if (!isValidApiKey) {
        console.error('🔒 [WebhookSignature] API Key不匹配');
      }
      return isValidApiKey;
    }

    // 如果是Bearer token格式，按照标准webhook签名验证
    const token = signature.replace('Bearer ', '');

    try {
      // 计算期望的签名
      const body = JSON.stringify(req.body);
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      // 比较签名（确保长度一致）
      if (token.length !== expectedSignature.length) {
        console.error('🔒 [WebhookSignature] 签名长度不匹配');
        return false;
      }

      const isValid = crypto.timingSafeEqual(
        Buffer.from(token, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      );

      return isValid;
    } catch (error) {
      console.error('🔒 [WebhookSignature] 签名验证计算失败:', error);
      return false;
    }

    if (!isValid) {
      console.error('🔒 [WebhookSignature] 签名不匹配');
    }

    return isValid;

  } catch (error) {
    console.error('🔒 [WebhookSignature] 验证异常:', error);
    return false;
  }
}

/**
 * 处理webhook事件
 */
async function processWebhookEvent(webhookEvent: WebhookEvent): Promise<boolean> {
  const { event } = webhookEvent;

  try {
    // 获取用户ID（从RevenueCat的app_user_id中提取）
    const userId = await extractUserIdFromAppUserId(event.app_user_id);
    if (!userId) {
      console.warn('📨 [ProcessWebhook] 无法提取用户ID，尝试保存为待关联购买:', event.app_user_id);
      // 对于匿名用户的购买，保存到待关联表中
      return await handleAnonymousPurchase(event);
    }

    // 记录事件处理开始
    console.log('🎯 [ProcessWebhook] 开始处理事件:', {
      type: event.type,
      userId,
      productId: event.product_id,
      transactionId: event.transaction_id
    });

    // 根据事件类型处理
    let result = false;
    switch (event.type) {
      case WebhookEventType.INITIAL_PURCHASE:
        result = await handleInitialPurchase(userId, event);
        break;

      case WebhookEventType.RENEWAL:
        result = await handleRenewal(userId, event);
        break;

      case WebhookEventType.CANCELLATION:
        result = await handleCancellation(userId, event);
        break;

      case WebhookEventType.UNCANCELLATION:
        result = await handleUncancellation(userId, event);
        break;

      case WebhookEventType.EXPIRATION:
        result = await handleExpiration(userId, event);
        break;

      case WebhookEventType.PRODUCT_CHANGE:
        result = await handleProductChange(userId, event);
        break;

      case WebhookEventType.TEST:
        console.log('🧪 [ProcessWebhook] 收到RevenueCat测试事件，验证webhook配置成功');
        result = true; // 测试事件直接返回成功
        break;

      default:
        console.log('📨 [ProcessWebhook] 未处理的事件类型:', event.type);
        result = true; // 返回true表示已处理，避免重试
    }

    // 记录处理结果
    if (result) {
      console.log('✅ [ProcessWebhook] 事件处理成功:', {
        type: event.type,
        userId,
        productId: event.product_id
      });
    } else {
      console.error('❌ [ProcessWebhook] 事件处理失败:', {
        type: event.type,
        userId,
        productId: event.product_id
      });
    }

    return result;

  } catch (error) {
    console.error('📨 [ProcessWebhook] 处理异常:', error);
    return false;
  }
}

/**
 * 从RevenueCat的app_user_id中提取用户ID
 */
async function extractUserIdFromAppUserId(appUserId: string): Promise<string | null> {
  try {
    // RevenueCat的app_user_id格式可能是：
    // 1. 直接的用户ID
    // 2. $RCAnonymousID:xxx 格式
    // 3. zhiweijz_user_xxx 格式

    if (appUserId.startsWith('$RCAnonymousID:')) {
      // 匿名用户，需要通过数据库查找对应的用户
      console.log('📨 [ExtractUserId] 处理匿名用户ID:', appUserId);
      return await findUserByRevenueCatId(appUserId);
    }

    if (appUserId.startsWith('zhiweijz_user_')) {
      return appUserId.replace('zhiweijz_user_', '');
    }

    // 直接返回作为用户ID
    return appUserId;
  } catch (error) {
    console.error('📨 [ExtractUserId] 提取用户ID失败:', error);
    return null;
  }
}

/**
 * 通过RevenueCat用户ID查找对应的用户
 */
async function findUserByRevenueCatId(revenueCatUserId: string): Promise<string | null> {
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    const membership = await prisma.userMembership.findFirst({
      where: {
        revenueCatUserId: revenueCatUserId
      },
      select: {
        userId: true
      }
    });

    await prisma.$disconnect();

    if (membership) {
      console.log('📨 [FindUserByRevenueCat] 找到用户:', { revenueCatUserId, userId: membership.userId });
      return membership.userId;
    } else {
      console.warn('📨 [FindUserByRevenueCat] 未找到对应用户:', revenueCatUserId);
      return null;
    }
  } catch (error) {
    console.error('📨 [FindUserByRevenueCat] 查找用户失败:', error);
    return null;
  }
}

/**
 * 处理匿名用户购买
 */
async function handleAnonymousPurchase(event: any): Promise<boolean> {
  try {
    console.log('👤 [AnonymousPurchase] 处理匿名用户购买:', {
      type: event.type,
      appUserId: event.app_user_id,
      productId: event.product_id,
      transactionId: event.transaction_id
    });

    // 处理不同类型的事件
    switch (event.type) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        return await saveAnonymousPurchase(event);

      case 'CANCELLATION':
      case 'EXPIRATION':
        // 对于取消和过期事件，记录日志但不需要保存
        console.log('👤 [AnonymousPurchase] 匿名用户取消/过期事件，无需处理:', event.type);
        return true;

      default:
        console.log('👤 [AnonymousPurchase] 跳过未知事件类型:', event.type);
        return true;
    }

  } catch (error) {
    console.error('❌ [AnonymousPurchase] 处理匿名用户购买失败:', error);
    return false;
  }
}

/**
 * 保存匿名用户购买到待关联表
 */
async function saveAnonymousPurchase(event: any): Promise<boolean> {
  try {
    // 获取产品映射信息
    const { memberType, duration } = mapProductToMembership(event.product_id);
    if (!memberType) {
      console.warn('👤 [SaveAnonymousPurchase] 未知的产品ID:', event.product_id);
      return false;
    }

    // 保存到待关联购买表
    const { PendingMembershipService } = require('../services/pending-membership.service');
    const pendingService = new PendingMembershipService();

    // 检查是否已存在相同的待关联购买（避免重复）
    const existingPurchases = await pendingService.findPendingPurchasesByRevenueCatUserId(event.app_user_id);
    const isDuplicate = existingPurchases.some((p: any) =>
      p.transactionId === event.transaction_id &&
      p.eventType === event.type
    );

    if (isDuplicate) {
      console.log('👤 [SaveAnonymousPurchase] 发现重复的待关联购买，跳过保存');
      return true;
    }

    await pendingService.createPendingPurchase({
      revenueCatUserId: event.app_user_id,
      memberType: memberType,
      duration: duration,
      productId: event.product_id,
      transactionId: event.transaction_id,
      platform: event.store === 'APP_STORE' ? 'ios' : 'android',
      purchasedAt: new Date(event.purchased_at_ms || event.event_timestamp_ms),
      expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : undefined,
      eventType: event.type,
      eventData: event
    });

    console.log('✅ [SaveAnonymousPurchase] 匿名用户购买已保存为待关联记录');
    return true;

  } catch (error) {
    console.error('❌ [SaveAnonymousPurchase] 保存匿名用户购买失败:', error);
    return false;
  }
}

/**
 * 处理初始购买事件
 */
async function handleInitialPurchase(userId: string, event: any): Promise<boolean> {
  console.log('💰 [InitialPurchase] 处理初始购买:', { userId, productId: event.product_id });

  try {
    const { MembershipService } = require('../services/membership.service');
    const membershipService = new MembershipService();

    // 根据产品ID确定会员类型和时长
    const { memberType, duration } = mapProductToMembership(event.product_id);
    if (!memberType) {
      console.warn('💰 [InitialPurchase] 未知的产品ID:', event.product_id);
      return false;
    }

    // 更新会员状态
    await membershipService.updateMembershipFromRevenueCat(userId, memberType, duration, {
      revenueCatUserId: event.app_user_id,
      platform: event.store === 'APP_STORE' ? 'ios' : 'android',
      externalProductId: event.product_id,
      externalTransactionId: event.transaction_id,
      billingPeriod: 'monthly', // 默认月度，可以根据产品ID调整
      hasCharityAttribution: true,
      hasPrioritySupport: true
    });

    console.log('💰 [InitialPurchase] 处理成功:', { userId, memberType, duration });
    return true;
  } catch (error) {
    console.error('💰 [InitialPurchase] 处理失败:', error);
    return false;
  }
}

/**
 * 处理续费事件
 */
async function handleRenewal(userId: string, event: any): Promise<boolean> {
  console.log('🔄 [Renewal] 处理续费:', { userId, productId: event.product_id });

  try {
    const { MembershipService } = require('../services/membership.service');
    const membershipService = new MembershipService();

    // 根据产品ID确定会员类型和时长
    const { memberType, duration } = mapProductToMembership(event.product_id);
    if (!memberType) {
      console.warn('🔄 [Renewal] 未知的产品ID:', event.product_id);
      return false;
    }

    // 更新会员状态（续费）
    await membershipService.updateMembershipFromRevenueCat(userId, memberType, duration, {
      revenueCatUserId: event.app_user_id,
      platform: event.store === 'APP_STORE' ? 'ios' : 'android',
      externalProductId: event.product_id,
      externalTransactionId: event.transaction_id,
      billingPeriod: 'monthly',
      hasCharityAttribution: true,
      hasPrioritySupport: true
    });

    console.log('🔄 [Renewal] 处理成功:', { userId, memberType, duration });
    return true;
  } catch (error) {
    console.error('🔄 [Renewal] 处理失败:', error);
    return false;
  }
}

/**
 * 处理取消事件
 */
async function handleCancellation(userId: string, event: any): Promise<boolean> {
  console.log('❌ [Cancellation] 处理取消:', { userId, productId: event.product_id });

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // 更新会员的自动续费状态为false，但不立即过期
    await prisma.userMembership.update({
      where: { userId },
      data: {
        autoRenewal: false
      }
    });

    await prisma.$disconnect();

    console.log('❌ [Cancellation] 处理成功:', { userId, productId: event.product_id });
    return true;
  } catch (error) {
    console.error('❌ [Cancellation] 处理失败:', error);
    return false;
  }
}

/**
 * 处理恢复订阅事件
 */
async function handleUncancellation(userId: string, event: any): Promise<boolean> {
  console.log('✅ [Uncancellation] 处理恢复订阅:', { userId, productId: event.product_id });

  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();

    // 恢复自动续费状态
    await prisma.userMembership.update({
      where: { userId },
      data: {
        autoRenewal: true
      }
    });

    await prisma.$disconnect();

    console.log('✅ [Uncancellation] 处理成功:', { userId, productId: event.product_id });
    return true;
  } catch (error) {
    console.error('✅ [Uncancellation] 处理失败:', error);
    return false;
  }
}

/**
 * 处理过期事件
 */
async function handleExpiration(userId: string, event: any): Promise<boolean> {
  console.log('⏰ [Expiration] 处理过期:', { userId, productId: event.product_id });

  try {
    const { MembershipService } = require('../services/membership.service');
    const membershipService = new MembershipService();

    // 处理会员过期
    await membershipService.expireMembershipFromRevenueCat(userId);

    console.log('⏰ [Expiration] 处理成功:', { userId, productId: event.product_id });
    return true;
  } catch (error) {
    console.error('⏰ [Expiration] 处理失败:', error);
    return false;
  }
}

/**
 * 处理产品变更事件
 */
async function handleProductChange(userId: string, event: any): Promise<boolean> {
  console.log('🔄 [ProductChange] 处理产品变更:', {
    userId,
    oldProductId: event.product_id,
    newProductId: event.new_product_id
  });

  try {
    const { MembershipService } = require('../services/membership.service');
    const membershipService = new MembershipService();

    // 获取新产品的会员类型和时长
    const newProductId = event.new_product_id || event.product_id;
    const { memberType, duration } = mapProductToMembership(newProductId);

    if (!memberType) {
      console.warn('🔄 [ProductChange] 未知的新产品ID:', newProductId);
      return false;
    }

    // 更新会员状态到新的产品类型
    await membershipService.updateMembershipFromRevenueCat(userId, memberType, duration, {
      revenueCatUserId: event.app_user_id,
      platform: event.store === 'APP_STORE' ? 'ios' : 'android',
      externalProductId: newProductId,
      externalTransactionId: event.transaction_id,
      billingPeriod: 'monthly',
      hasCharityAttribution: true,
      hasPrioritySupport: true
    });

    console.log('🔄 [ProductChange] 处理成功:', { userId, newMemberType: memberType, duration });
    return true;
  } catch (error) {
    console.error('🔄 [ProductChange] 处理失败:', error);
    return false;
  }
}



/**
 * 将RevenueCat产品ID映射到会员类型和时长
 */
function mapProductToMembership(productId: string): { memberType: 'DONATION_ONE' | 'DONATION_TWO' | 'DONATION_THREE' | null, duration: number } {
  // 根据产品ID映射到会员类型
  // 这些产品ID应该与RevenueCat中配置的产品ID一致
  const productMapping: { [key: string]: { memberType: 'DONATION_ONE' | 'DONATION_TWO' | 'DONATION_THREE', duration: number } } = {
    'cn.jacksonz.zhiweijz.donation.one.monthly': { memberType: 'DONATION_ONE', duration: 1 },
    'cn.jacksonz.zhiweijz.donation.one.yearly': { memberType: 'DONATION_ONE', duration: 12 },
    'cn.jacksonz.zhiweijz.donation.two.monthly': { memberType: 'DONATION_TWO', duration: 1 },
    'cn.jacksonz.zhiweijz.donation.two.yearly': { memberType: 'DONATION_TWO', duration: 12 },
    'cn.jacksonz.zhiweijz.donation.three.monthly': { memberType: 'DONATION_THREE', duration: 1 },
    'cn.jacksonz.zhiweijz.donation.three.yearly': { memberType: 'DONATION_THREE', duration: 12 }
  };

  const mapping = productMapping[productId];
  if (mapping) {
    return mapping;
  }

  console.warn('📨 [ProductMapping] 未知的产品ID:', productId);
  return { memberType: null, duration: 0 };
}

export default router;
