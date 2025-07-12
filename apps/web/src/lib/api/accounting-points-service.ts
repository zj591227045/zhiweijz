import { apiClient } from '../api-client';

export interface AccountingPointsBalance {
  giftBalance: number;
  memberBalance: number;
  totalBalance: number;
}

export interface AccountingPointsTransaction {
  id: string;
  type: string;
  operation: string;
  points: number;
  balanceType: string;
  balanceAfter: number;
  description?: string;
  createdAt: string;
}

export interface CheckinStatus {
  hasCheckedIn: boolean;
}

export interface CheckinResult {
  pointsAwarded: number;
  message: string;
}

/**
 * 记账点服务
 */
export class AccountingPointsService {
  /**
   * 获取用户记账点余额
   */
  static async getBalance(): Promise<AccountingPointsBalance> {
    console.log('🔍 [AccountingPointsService] 开始获取余额');
    try {
      const response = await apiClient.get('/accounting-points/balance');
      console.log('📊 [AccountingPointsService] API响应:', response);
      console.log('📊 [AccountingPointsService] 响应数据:', response.data);
      
      // 由于API客户端响应拦截器已经返回了response.data，所以这里直接访问response.data
      const balanceData = response.data;
      if (!balanceData) {
        throw new Error('余额数据为空');
      }
      
      console.log('✅ [AccountingPointsService] 最终余额数据:', balanceData);
      return balanceData;
    } catch (error) {
      console.error('❌ [AccountingPointsService] 获取余额失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户记账点消费记录
   */
  static async getTransactions(limit: number = 50, offset: number = 0): Promise<AccountingPointsTransaction[]> {
    const response = await apiClient.get('/accounting-points/transactions', {
      params: { limit, offset }
    });
    return response.data;
  }

  /**
   * 用户签到
   */
  static async checkin(): Promise<CheckinResult> {
    const response = await apiClient.post('/accounting-points/checkin');
    return response.data;
  }

  /**
   * 检查用户今天是否已签到
   */
  static async getCheckinStatus(): Promise<CheckinStatus> {
    const response = await apiClient.get('/accounting-points/checkin-status');
    return response.data;
  }
}