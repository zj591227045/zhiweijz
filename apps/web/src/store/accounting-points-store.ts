import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AccountingPointsService,
  AccountingPointsBalance,
  AccountingPointsTransaction,
  CheckinStatus,
  CheckinResult
} from '../lib/api/accounting-points-service';

interface AccountingPointsState {
  // 状态
  balance: AccountingPointsBalance | null;
  transactions: AccountingPointsTransaction[];
  checkinStatus: CheckinStatus | null;
  loading: boolean;
  error: string | null;

  // 操作
  fetchBalance: () => Promise<void>;
  fetchTransactions: (limit?: number, offset?: number) => Promise<void>;
  fetchCheckinStatus: () => Promise<void>;
  checkin: () => Promise<CheckinResult>;
  reset: () => void;
}

export const useAccountingPointsStore = create<AccountingPointsState>()(
  persist(
    (set, get) => ({
      // 初始状态
      balance: null,
      transactions: [],
      checkinStatus: null,
      loading: false,
      error: null,

      // 获取记账点余额
      fetchBalance: async () => {
        try {
          set({ loading: true, error: null });
          const balance = await AccountingPointsService.getBalance();
          set({ balance, loading: false });
        } catch (error) {
          console.error('获取记账点余额失败:', error);
          set({ 
            error: error instanceof Error ? error.message : '获取记账点余额失败',
            loading: false 
          });
        }
      },

      // 获取消费记录
      fetchTransactions: async (limit = 50, offset = 0) => {
        try {
          set({ loading: true, error: null });
          const transactions = await AccountingPointsService.getTransactions(limit, offset);
          set({ transactions, loading: false });
        } catch (error) {
          console.error('获取消费记录失败:', error);
          set({ 
            error: error instanceof Error ? error.message : '获取消费记录失败',
            loading: false 
          });
        }
      },

      // 获取签到状态
      fetchCheckinStatus: async () => {
        try {
          const checkinStatus = await AccountingPointsService.getCheckinStatus();
          set({ checkinStatus });
        } catch (error) {
          console.error('获取签到状态失败:', error);
          set({ 
            error: error instanceof Error ? error.message : '获取签到状态失败'
          });
        }
      },

      // 签到
      checkin: async () => {
        try {
          set({ loading: true, error: null });
          const result = await AccountingPointsService.checkin();
          
          // 签到成功后刷新余额和签到状态
          await get().fetchBalance();
          await get().fetchCheckinStatus();
          
          set({ loading: false });
          return result;
        } catch (error) {
          console.error('签到失败:', error);
          const errorMessage = error instanceof Error ? error.message : '签到失败';
          set({ 
            error: errorMessage,
            loading: false 
          });
          throw new Error(errorMessage);
        }
      },

      // 重置状态
      reset: () => {
        set({
          balance: null,
          transactions: [],
          checkinStatus: null,
          loading: false,
          error: null
        });
      }
    }),
    {
      name: 'accounting-points-store',
      partialize: (state) => ({
        balance: state.balance,
        checkinStatus: state.checkinStatus
      })
    }
  )
);