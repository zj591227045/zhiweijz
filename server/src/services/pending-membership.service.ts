/**
 * 待关联会员购买服务
 * 处理匿名用户购买后的延迟关联逻辑
 */

import { PrismaClient, MemberType } from '@prisma/client';
import { MembershipService } from './membership.service';
import { RevenueCatMappingService } from './revenuecat-mapping.service';

export interface PendingPurchaseData {
  revenueCatUserId: string;
  memberType: MemberType;
  duration: number;
  productId: string;
  transactionId: string;
  platform: string;
  purchasedAt: Date;
  expiresAt?: Date;
  eventType: string;
  eventData: any;
}

export class PendingMembershipService {
  private prisma: PrismaClient;
  private membershipService: MembershipService;

  constructor() {
    this.prisma = new PrismaClient();
    this.membershipService = new MembershipService();
  }

  /**
   * 创建待关联的会员购买记录
   */
  async createPendingPurchase(data: PendingPurchaseData): Promise<string> {
    try {
      console.log('📝 [PendingMembership] 创建待关联购买记录:', {
        revenueCatUserId: data.revenueCatUserId,
        memberType: data.memberType,
        productId: data.productId
      });

      const pendingPurchase = await this.prisma.pendingMembershipPurchase.create({
        data: {
          revenueCatUserId: data.revenueCatUserId,
          memberType: data.memberType,
          duration: data.duration,
          productId: data.productId,
          transactionId: data.transactionId,
          platform: data.platform,
          purchasedAt: data.purchasedAt,
          expiresAt: data.expiresAt,
          eventType: data.eventType,
          eventData: JSON.stringify(data.eventData)
        }
      });

      console.log('✅ [PendingMembership] 待关联购买记录创建成功:', pendingPurchase.id);
      return pendingPurchase.id;

    } catch (error) {
      console.error('❌ [PendingMembership] 创建待关联购买记录失败:', error);
      throw error;
    }
  }

  /**
   * 查找用户的待关联购买记录
   */
  async findPendingPurchasesByRevenueCatUserId(revenueCatUserId: string) {
    try {
      const pendingPurchases = await this.prisma.pendingMembershipPurchase.findMany({
        where: {
          revenueCatUserId: revenueCatUserId,
          processedAt: null // 只查找未处理的记录
        },
        orderBy: {
          purchasedAt: 'desc'
        }
      });

      console.log('🔍 [PendingMembership] 找到待关联购买记录:', {
        revenueCatUserId,
        count: pendingPurchases.length
      });

      return pendingPurchases;

    } catch (error) {
      console.error('❌ [PendingMembership] 查找待关联购买记录失败:', error);
      throw error;
    }
  }

  /**
   * 处理用户登录后的待关联购买
   */
  async processPendingPurchasesForUser(userId: string, revenueCatUserId: string): Promise<boolean> {
    try {
      console.log('🔄 [PendingMembership] 开始处理用户待关联购买:', {
        userId,
        revenueCatUserId
      });

      // 查找该RevenueCat用户ID的所有待处理购买
      const pendingPurchases = await this.findPendingPurchasesByRevenueCatUserId(revenueCatUserId);

      if (pendingPurchases.length === 0) {
        console.log('📝 [PendingMembership] 没有找到待关联的购买记录');
        return true;
      }

      // 处理每个待关联的购买
      for (const purchase of pendingPurchases) {
        try {
          await this.activatePendingPurchase(userId, purchase);
        } catch (error) {
          console.error('❌ [PendingMembership] 激活待关联购买失败:', {
            purchaseId: purchase.id,
            error
          });
          // 继续处理其他购买，不中断整个流程
        }
      }

      console.log('✅ [PendingMembership] 用户待关联购买处理完成');
      return true;

    } catch (error) {
      console.error('❌ [PendingMembership] 处理用户待关联购买失败:', error);
      return false;
    }
  }

  /**
   * 激活单个待关联购买
   */
  private async activatePendingPurchase(userId: string, purchase: any): Promise<void> {
    try {
      console.log('🎯 [PendingMembership] 激活待关联购买:', {
        userId,
        purchaseId: purchase.id,
        memberType: purchase.memberType
      });

      // 获取产品映射信息
      const productMapping = RevenueCatMappingService.getProductMapping(purchase.productId);
      if (!productMapping) {
        throw new Error(`未知的产品ID: ${purchase.productId}`);
      }

      // 激活会员（这个方法内部会调用resetMemberPoints）
      await this.membershipService.updateMembershipFromRevenueCat(
        userId,
        purchase.memberType,
        purchase.duration,
        {
          revenueCatUserId: purchase.revenueCatUserId,
          platform: purchase.platform,
          externalProductId: purchase.productId,
          externalTransactionId: purchase.transactionId,
          billingPeriod: productMapping.billingPeriod,
          hasCharityAttribution: productMapping.hasCharityAttribution,
          hasPrioritySupport: productMapping.hasPrioritySupport
        }
      );

      // 标记为已处理
      await this.prisma.pendingMembershipPurchase.update({
        where: { id: purchase.id },
        data: {
          processedAt: new Date(),
          associatedUserId: userId
        }
      });

      console.log('✅ [PendingMembership] 待关联购买激活成功:', {
        purchaseId: purchase.id,
        userId,
        memberType: purchase.memberType
      });

    } catch (error) {
      console.error('❌ [PendingMembership] 激活待关联购买失败:', error);
      throw error;
    }
  }

  /**
   * 清理过期的待关联购买记录
   */
  async cleanupExpiredPendingPurchases(): Promise<number> {
    try {
      console.log('🧹 [PendingMembership] 开始清理过期的待关联购买记录');

      // 删除30天前的未处理记录
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const result = await this.prisma.pendingMembershipPurchase.deleteMany({
        where: {
          purchasedAt: {
            lt: thirtyDaysAgo
          },
          processedAt: null
        }
      });

      console.log('✅ [PendingMembership] 清理完成，删除记录数:', result.count);
      return result.count;

    } catch (error) {
      console.error('❌ [PendingMembership] 清理过期记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取待关联购买统计信息
   */
  async getPendingPurchaseStats(): Promise<{
    totalPending: number;
    totalProcessed: number;
    recentPending: number;
  }> {
    try {
      const [totalPending, totalProcessed, recentPending] = await Promise.all([
        this.prisma.pendingMembershipPurchase.count({
          where: { processedAt: null }
        }),
        this.prisma.pendingMembershipPurchase.count({
          where: { processedAt: { not: null } }
        }),
        this.prisma.pendingMembershipPurchase.count({
          where: {
            processedAt: null,
            purchasedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // 最近24小时
            }
          }
        })
      ]);

      return {
        totalPending,
        totalProcessed,
        recentPending
      };

    } catch (error) {
      console.error('❌ [PendingMembership] 获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
