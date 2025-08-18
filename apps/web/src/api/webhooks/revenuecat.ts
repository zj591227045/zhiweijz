/**
 * RevenueCat Webhook处理API
 * 处理来自RevenueCat的webhook事件，包括购买、订阅更新、取消等
 */

import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

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
  SUBSCRIPTION_RESUMED = 'SUBSCRIPTION_RESUMED'
}

interface WebhookEvent {
  api_version: string;
  event: {
    type: WebhookEventType;
    id: string;
    event_timestamp_ms: number;
    app_user_id: string;
    aliases: string[];
    original_app_user_id: string;
    product_id: string;
    period_type: 'NORMAL' | 'TRIAL' | 'INTRO';
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
    store: 'APP_STORE' | 'PLAY_STORE' | 'STRIPE' | 'PROMOTIONAL';
    takehome_percentage: number;
    commission_percentage: number;
  };
}

interface ApiResponse {
  success: boolean;
  message: string;
  processed?: boolean;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  // 只允许POST请求
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
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

  } catch (error) {
    console.error('📨 [RevenueCatWebhook] 处理失败:', error);
    
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Webhook processing failed'
    });
  }
}

/**
 * 验证RevenueCat webhook签名
 */
async function verifyWebhookSignature(req: NextApiRequest): Promise<boolean> {
  try {
    const signature = req.headers['authorization'];
    const webhookSecret = process.env.REVENUECAT_WEBHOOK_SECRET;

    // 记录请求信息用于调试
    console.log('🔒 [WebhookSignature] 验证请求:', {
      hasSignature: !!signature,
      hasSecret: !!webhookSecret,
      userAgent: req.headers['user-agent'],
      environment: process.env.NODE_ENV
    });

    if (!signature || !webhookSecret) {
      console.warn('🔒 [WebhookSignature] 缺少签名或密钥');

      // 在开发环境中，如果没有配置密钥，跳过验证
      if (process.env.NODE_ENV === 'development') {
        console.warn('🔒 [WebhookSignature] 开发环境，跳过签名验证');
        return true;
      }

      // 生产环境下的安全策略
      if (!webhookSecret) {
        // 检查请求是否来自RevenueCat的已知User-Agent
        const userAgent = req.headers['user-agent'] || '';
        const isRevenueCatRequest = userAgent.includes('RevenueCat') || userAgent.includes('revenuecat');

        if (isRevenueCatRequest) {
          console.warn('🔒 [WebhookSignature] 未配置webhook secret，但请求来自RevenueCat，允许通过');
          console.warn('🔒 [WebhookSignature] 强烈建议配置webhook secret以增强安全性');
          return true;
        }
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
    const userId = extractUserIdFromAppUserId(event.app_user_id);
    if (!userId) {
      console.warn('📨 [ProcessWebhook] 无法提取用户ID:', event.app_user_id);
      return false;
    }

    // 根据事件类型处理
    switch (event.type) {
      case WebhookEventType.INITIAL_PURCHASE:
        return await handleInitialPurchase(userId, event);
      
      case WebhookEventType.RENEWAL:
        return await handleRenewal(userId, event);
      
      case WebhookEventType.CANCELLATION:
        return await handleCancellation(userId, event);
      
      case WebhookEventType.UNCANCELLATION:
        return await handleUncancellation(userId, event);
      
      case WebhookEventType.EXPIRATION:
        return await handleExpiration(userId, event);
      
      case WebhookEventType.PRODUCT_CHANGE:
        return await handleProductChange(userId, event);
      
      case WebhookEventType.BILLING_ISSUE:
        return await handleBillingIssue(userId, event);
      
      case WebhookEventType.NON_RENEWING_PURCHASE:
        return await handleNonRenewingPurchase(userId, event);
      
      default:
        console.log('📨 [ProcessWebhook] 未处理的事件类型:', event.type);
        return true; // 返回true表示已处理（即使是跳过）
    }

  } catch (error) {
    console.error('📨 [ProcessWebhook] 处理事件失败:', error);
    return false;
  }
}

/**
 * 处理首次购买
 */
async function handleInitialPurchase(userId: number, event: any): Promise<boolean> {
  console.log('💰 [InitialPurchase] 处理首次购买:', { userId, productId: event.product_id });
  
  try {
    // 确定会员级别
    const membershipLevel = determineMembershipLevel(event.product_id);
    
    // 更新用户会员状态
    await updateUserMembership(userId, {
      level: membershipLevel,
      isActive: true,
      expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
      platform: event.store === 'APP_STORE' ? 'ios' : 'android',
      externalUserId: event.app_user_id,
      productId: event.product_id,
      transactionId: event.transaction_id
    });

    // 记录购买历史
    await recordPurchaseEvent(userId, event, 'initial_purchase');

    // 发送欢迎邮件或通知
    await sendPurchaseNotification(userId, 'welcome', membershipLevel);

    return true;
  } catch (error) {
    console.error('💰 [InitialPurchase] 处理失败:', error);
    return false;
  }
}

/**
 * 处理订阅续费
 */
async function handleRenewal(userId: number, event: any): Promise<boolean> {
  console.log('🔄 [Renewal] 处理订阅续费:', { userId, productId: event.product_id });
  
  try {
    // 更新订阅到期时间
    await updateSubscriptionExpiration(userId, {
      expiresAt: new Date(event.expiration_at_ms),
      transactionId: event.transaction_id
    });

    // 记录续费历史
    await recordPurchaseEvent(userId, event, 'renewal');

    return true;
  } catch (error) {
    console.error('🔄 [Renewal] 处理失败:', error);
    return false;
  }
}

/**
 * 处理订阅取消
 */
async function handleCancellation(userId: number, event: any): Promise<boolean> {
  console.log('❌ [Cancellation] 处理订阅取消:', { userId, productId: event.product_id });
  
  try {
    // 标记订阅为已取消（但可能还未到期）
    await updateSubscriptionStatus(userId, {
      isCancelled: true,
      cancelledAt: new Date(event.event_timestamp_ms),
      expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null
    });

    // 记录取消事件
    await recordPurchaseEvent(userId, event, 'cancellation');

    // 发送取消确认邮件
    await sendPurchaseNotification(userId, 'cancellation_confirmation');

    return true;
  } catch (error) {
    console.error('❌ [Cancellation] 处理失败:', error);
    return false;
  }
}

/**
 * 处理订阅恢复
 */
async function handleUncancellation(userId: number, event: any): Promise<boolean> {
  console.log('✅ [Uncancellation] 处理订阅恢复:', { userId, productId: event.product_id });
  
  try {
    // 恢复订阅状态
    await updateSubscriptionStatus(userId, {
      isCancelled: false,
      cancelledAt: null,
      expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null
    });

    // 记录恢复事件
    await recordPurchaseEvent(userId, event, 'uncancellation');

    return true;
  } catch (error) {
    console.error('✅ [Uncancellation] 处理失败:', error);
    return false;
  }
}

/**
 * 处理订阅过期
 */
async function handleExpiration(userId: number, event: any): Promise<boolean> {
  console.log('⏰ [Expiration] 处理订阅过期:', { userId, productId: event.product_id });

  try {
    // 导入会员服务
    const { MembershipService } = require('../../../../server/src/services/membership.service');
    const membershipService = new MembershipService();

    // 处理订阅过期
    await membershipService.expireMembershipFromRevenueCat(userId.toString());

    // 记录过期事件
    await recordPurchaseEvent(userId, event, 'expiration');

    // 发送过期通知
    await sendPurchaseNotification(userId, 'subscription_expired');

    return true;
  } catch (error) {
    console.error('⏰ [Expiration] 处理失败:', error);
    return false;
  }
}

/**
 * 处理产品变更（升级/降级）
 */
async function handleProductChange(userId: number, event: any): Promise<boolean> {
  console.log('🔄 [ProductChange] 处理产品变更:', { userId, productId: event.product_id });
  
  try {
    const newMembershipLevel = determineMembershipLevel(event.product_id);
    
    // 更新会员级别
    await updateUserMembership(userId, {
      level: newMembershipLevel,
      expiresAt: event.expiration_at_ms ? new Date(event.expiration_at_ms) : null,
      productId: event.product_id
    });

    // 记录变更事件
    await recordPurchaseEvent(userId, event, 'product_change');

    return true;
  } catch (error) {
    console.error('🔄 [ProductChange] 处理失败:', error);
    return false;
  }
}

/**
 * 处理账单问题
 */
async function handleBillingIssue(userId: number, event: any): Promise<boolean> {
  console.log('⚠️ [BillingIssue] 处理账单问题:', { userId, productId: event.product_id });
  
  try {
    // 标记账单问题
    await updateSubscriptionStatus(userId, {
      hasBillingIssue: true,
      billingIssueDetectedAt: new Date(event.event_timestamp_ms)
    });

    // 发送账单问题通知
    await sendPurchaseNotification(userId, 'billing_issue');

    return true;
  } catch (error) {
    console.error('⚠️ [BillingIssue] 处理失败:', error);
    return false;
  }
}

/**
 * 处理非续费购买（一次性购买）
 */
async function handleNonRenewingPurchase(userId: number, event: any): Promise<boolean> {
  console.log('💎 [NonRenewingPurchase] 处理一次性购买:', { userId, productId: event.product_id });
  
  try {
    const membershipLevel = determineMembershipLevel(event.product_id);
    
    // 更新用户会员状态（终身会员）
    await updateUserMembership(userId, {
      level: membershipLevel,
      isActive: true,
      isLifetime: true,
      expiresAt: null, // 终身会员无过期时间
      productId: event.product_id,
      transactionId: event.transaction_id
    });

    // 记录购买历史
    await recordPurchaseEvent(userId, event, 'non_renewing_purchase');

    return true;
  } catch (error) {
    console.error('💎 [NonRenewingPurchase] 处理失败:', error);
    return false;
  }
}

// 辅助函数（这些需要根据您的数据库结构实现）

function extractUserIdFromAppUserId(appUserId: string): number | null {
  // 使用RevenueCat映射服务解析用户ID
  const { RevenueCatMappingService } = require('../../../../server/src/services/revenuecat-mapping.service');
  const userId = RevenueCatMappingService.parseRevenueCatUserId(appUserId);
  return userId ? parseInt(userId, 10) : null;
}

function determineMembershipLevel(productId: string): string {
  // 使用RevenueCat映射服务确定会员级别
  const { RevenueCatMappingService } = require('../../../../server/src/services/revenuecat-mapping.service');
  return RevenueCatMappingService.determineMembershipLevel(productId) || 'REGULAR';
}

async function updateUserMembership(userId: number, data: any): Promise<void> {
  try {
    // 导入会员服务
    const { MembershipService } = require('../../../../server/src/services/membership.service');
    const { RevenueCatMappingService } = require('../../../../server/src/services/revenuecat-mapping.service');

    const membershipService = new MembershipService();

    // 生成会员更新数据
    const membershipUpdate = RevenueCatMappingService.generateMembershipUpdate(
      data.productId,
      data.platform || 'ios',
      data.transactionId
    );

    if (!membershipUpdate) {
      console.error('❌ [UpdateMembership] 无法识别的产品ID:', data.productId);
      return;
    }

    // 更新会员状态
    await membershipService.updateMembershipFromRevenueCat(
      userId.toString(),
      membershipUpdate.memberType,
      membershipUpdate.duration,
      {
        revenueCatUserId: data.externalUserId || `zhiweijz_user_${userId}`,
        platform: membershipUpdate.platform,
        externalProductId: membershipUpdate.externalProductId,
        externalTransactionId: membershipUpdate.externalTransactionId,
        billingPeriod: membershipUpdate.billingPeriod,
        hasCharityAttribution: membershipUpdate.hasCharityAttribution,
        hasPrioritySupport: membershipUpdate.hasPrioritySupport
      }
    );

    console.log('✅ [UpdateMembership] 会员状态更新成功:', {
      userId,
      memberType: membershipUpdate.memberType,
      productId: data.productId
    });

  } catch (error) {
    console.error('❌ [UpdateMembership] 更新会员状态失败:', error);
    throw error;
  }
}

async function updateSubscriptionExpiration(userId: number, data: any): Promise<void> {
  // 实现订阅到期时间更新逻辑
  console.log('📝 [UpdateExpiration] 更新到期时间:', { userId, data });
}

async function updateSubscriptionStatus(userId: number, data: any): Promise<void> {
  // 实现订阅状态更新逻辑
  console.log('📝 [UpdateStatus] 更新订阅状态:', { userId, data });
}

async function recordPurchaseEvent(userId: number, event: any, eventType: string): Promise<void> {
  // 实现购买事件记录逻辑
  console.log('📝 [RecordEvent] 记录购买事件:', { userId, eventType, productId: event.product_id });
}

async function sendPurchaseNotification(userId: number, type: string, data?: any): Promise<void> {
  // 实现通知发送逻辑
  console.log('📧 [SendNotification] 发送通知:', { userId, type, data });
}
