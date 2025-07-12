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
    const response = await apiClient.get('/accounting-points/balance');
    return response.data.data;
  }

  /**
   * 获取用户记账点消费记录
   */
  static async getTransactions(limit: number = 50, offset: number = 0): Promise<AccountingPointsTransaction[]> {
    const response = await apiClient.get('/accounting-points/transactions', {
      params: { limit, offset }
    });
    return response.data.data;
  }

  /**
   * 用户签到
   */
  static async checkin(): Promise<CheckinResult> {
    const response = await apiClient.post('/accounting-points/checkin');
    return response.data.data;
  }

  /**
   * 检查用户今天是否已签到
   */
  static async getCheckinStatus(): Promise<CheckinStatus> {
    const response = await apiClient.get('/accounting-points/checkin-status');
    return response.data.data;
  }
}