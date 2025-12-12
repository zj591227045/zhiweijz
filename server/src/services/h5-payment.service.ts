/**
 * H5支付服务
 * 集成第三方H5支付API，支持微信支付和支付宝支付
 * 用于Android客户端的订阅会员购买
 */

import { logger } from '../utils/logger';
import crypto from 'crypto';
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface H5PaymentConfig {
  appId: string;
  appSecret: string;
  notifyUrl: string;
  apiBaseUrl: string;
}

export interface H5PaymentRequest {
  userId: string;
  productId: string;
  amount: number; // 单位：分
  description: string;
  payType: 'wechat' | 'alipay';
  outTradeNo: string;
  attach?: string;
}

export interface H5PaymentResponse {
  success: boolean;
  code: number;
  msg: string;
  data?: {
    tradeNo: string;
    jumpUrl: string;
    expireTime: string;
  };
  error?: string;
}

export interface H5PaymentNotification {
  appId: string;
  outTradeNo: string;
  tradeNo: string;
  amount: number;
  payType: string;
  status: string;
  paidTime: string;
  attach?: string;
  sign: string;
}

/**
 * H5支付服务类
 */
export class H5PaymentService {
  private config: H5PaymentConfig;

  constructor(config: H5PaymentConfig) {
    this.config = config;
  }

  /**
   * 创建H5支付订单
   */
  async createPaymentOrder(request: H5PaymentRequest): Promise<H5PaymentResponse> {
    try {
      logger.info('💰 [H5Payment] 创建支付订单:', request);

      // 生成签名
      const signData = {
        app_id: this.config.appId,
        out_trade_no: request.outTradeNo,
        description: request.description,
        pay_type: request.payType,
        amount: request.amount,
        notify_url: this.config.notifyUrl,
        attach: request.attach || ''
      };

      const sign = this.generateSign(signData);

      // 构建请求数据
      const requestData = {
        ...signData,
        sign
      };

      logger.info('💰 [H5Payment] 请求数据:', {
        ...requestData,
        sign: sign.substring(0, 8) + '...'
      });

      // 发送请求到H5支付API
      const response = await axios.post(
        `${this.config.apiBaseUrl}/api/h5`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36'
          },
          timeout: 30000
        }
      );

      logger.info('💰 [H5Payment] API响应:', response.data);

      if (response.data.code === 200) {
        // 保存订单记录
        await this.savePaymentOrder(request, response.data.data.tradeNo);

        return {
          success: true,
          code: response.data.code,
          msg: response.data.msg,
          data: response.data.data
        };
      } else {
        return {
          success: false,
          code: response.data.code,
          msg: response.data.msg,
          error: response.data.msg
        };
      }

    } catch (error) {
      logger.error('💰 [H5Payment] 创建订单失败:', error);
      
      return {
        success: false,
        code: 500,
        msg: '创建支付订单失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 查询支付状态
   */
  async queryPaymentStatus(outTradeNo: string): Promise<H5PaymentResponse> {
    try {
      logger.info('🔍 [H5Payment] 查询支付状态:', outTradeNo);

      // 从数据库查询订单状态
      const order = await prisma.h5PaymentOrder.findUnique({
        where: { outTradeNo }
      });

      if (!order) {
        return {
          success: false,
          code: 404,
          msg: '订单不存在'
        };
      }

      return {
        success: true,
        code: 200,
        msg: 'success',
        data: {
          tradeNo: order.tradeNo || '',
          jumpUrl: '',
          expireTime: order.expireTime?.toISOString() || ''
        }
      };

    } catch (error) {
      logger.error('🔍 [H5Payment] 查询状态失败:', error);
      
      return {
        success: false,
        code: 500,
        msg: '查询支付状态失败',
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 处理支付回调通知
   */
  async handlePaymentNotification(notification: H5PaymentNotification): Promise<boolean> {
    try {
      logger.info('📞 [H5Payment] 处理支付回调:', {
        ...notification,
        sign: notification.sign.substring(0, 8) + '...'
      });

      // 验证签名
      if (!this.verifyNotificationSign(notification)) {
        logger.error('📞 [H5Payment] 签名验证失败');
        return false;
      }

      // 查找订单
      const order = await prisma.h5PaymentOrder.findUnique({
        where: { outTradeNo: notification.outTradeNo }
      });

      if (!order) {
        logger.error('📞 [H5Payment] 订单不存在:', notification.outTradeNo);
        return false;
      }

      // 检查订单状态
      if (order.status === 'PAID') {
        logger.info('📞 [H5Payment] 订单已处理，跳过重复处理');
        return true;
      }

      // 更新订单状态
      await prisma.h5PaymentOrder.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          tradeNo: notification.tradeNo,
          paidAt: new Date(notification.paidTime),
          updatedAt: new Date()
        }
      });

      // 处理会员升级
      await this.processMembershipUpgrade(order);

      logger.info('📞 [H5Payment] 支付回调处理成功');
      return true;

    } catch (error) {
      logger.error('📞 [H5Payment] 处理回调失败:', error);
      return false;
    }
  }

  /**
   * 生成签名
   */
  private generateSign(data: Record<string, any>): string {
    // 按字典序排序参数
    const sortedKeys = Object.keys(data).sort();
    const signString = sortedKeys
      .filter(key => data[key] !== '' && data[key] !== null && data[key] !== undefined)
      .map(key => `${key}=${data[key]}`)
      .join('&') + `&key=${this.config.appSecret}`;

    logger.info('🔐 [H5Payment] 签名字符串:', signString.replace(this.config.appSecret, '***'));

    return crypto.createHash('md5').update(signString).digest('hex').toUpperCase();
  }

  /**
   * 验证回调通知签名
   */
  private verifyNotificationSign(notification: H5PaymentNotification): boolean {
    const { sign, ...data } = notification;
    const expectedSign = this.generateSign(data);
    return sign === expectedSign;
  }

  /**
   * 保存支付订单记录
   */
  private async savePaymentOrder(request: H5PaymentRequest, tradeNo: string): Promise<void> {
    await prisma.h5PaymentOrder.create({
      data: {
        userId: request.userId,
        productId: request.productId,
        outTradeNo: request.outTradeNo,
        tradeNo,
        amount: request.amount,
        payType: request.payType,
        description: request.description,
        attach: request.attach,
        status: 'PENDING',
        expireTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2小时后过期
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  /**
   * 处理会员升级
   */
  private async processMembershipUpgrade(order: any): Promise<void> {
    try {
      // 导入会员服务
      const { MembershipService } = require('./membership.service');
      const membershipService = new MembershipService();

      // 根据产品ID确定会员类型
      const { memberType, duration } = this.mapProductToMembership(order.productId);

      if (!memberType) {
        logger.warn('💰 [H5Payment] 未知的产品ID:', order.productId);
        return;
      }

      // 获取产品配置以获取详细信息
      const { getAndroidH5ProductById } = require('../config/android-h5-products');
      const product = getAndroidH5ProductById(order.productId);

      // 构建H5支付的RevenueCat数据格式
      const h5PaymentData = {
        revenueCatUserId: `h5_${order.userId}`,
        platform: 'android',
        externalProductId: order.productId,
        externalTransactionId: order.tradeNo || order.outTradeNo,
        billingPeriod: product?.duration || 'monthly',
        hasCharityAttribution: product?.hasCharityAttribution || false,
        hasPrioritySupport: product?.hasPrioritySupport || false
      };

      // 使用RevenueCat兼容的会员升级方法
      await membershipService.updateMembershipFromRevenueCat(
        order.userId,
        memberType,
        duration,
        h5PaymentData
      );

      logger.info('💰 [H5Payment] 会员升级成功:', {
        userId: order.userId,
        memberType,
        duration,
        productId: order.productId,
        tradeNo: order.tradeNo || order.outTradeNo
      });

    } catch (error) {
      logger.error('💰 [H5Payment] 会员升级失败:', error);
      throw error;
    }
  }

  /**
   * 产品ID到会员类型的映射
   */
  private mapProductToMembership(productId: string): { memberType: string | null; duration: number } {
    // 使用Android H5产品配置
    const { getAndroidH5ProductById } = require('../config/android-h5-products');
    const product = getAndroidH5ProductById(productId);

    if (!product) {
      logger.warn('💰 [H5Payment] 未找到产品配置:', productId);
      return { memberType: null, duration: 1 };
    }

    const duration = product.duration === 'yearly' ? 12 : 1;

    return {
      memberType: product.membershipTier,
      duration
    };
  }

  /**
   * 生成订单号
   */
  static generateOrderId(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    return `H5_${timestamp}_${random}`;
  }
}
