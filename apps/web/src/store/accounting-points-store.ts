import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  AccountingPointsService,
  AccountingPointsBalance,
  AccountingPointsTransaction,
  CheckinStatus,
  CheckinResult,
  CheckinHistory,
} from '../lib/api/accounting-points-service';

interface AccountingPointsState {
  // 状态
  balance: AccountingPointsBalance | null;
  transactions: AccountingPointsTransaction[];
  checkinStatus: CheckinStatus | null;
  checkinHistory: CheckinHistory | null;
  loading: boolean;
  error: string | null;

  // 操作
  fetchBalance: () => Promise<void>;
  fetchTransactions: (limit?: number, offset?: number) => Promise<void>;
  fetchCheckinStatus: () => Promise<void>;
  fetchCheckinHistory: (days?: number) => Promise<void>;
  checkin: () => Promise<CheckinResult>;
  consumePoints: (points: number, description: string) => Promise<void>;
  reset: () => void;
}

export const useAccountingPointsStore = create<AccountingPointsState>()(
  persist(
    (set, get) => ({
      // 初始状态
      balance: null,
      transactions: [],
      checkinStatus: null,
      checkinHistory: null,
      loading: false,
      error: null,

      // 获取记账点余额
      fetchBalance: async () => {
        try {
          console.log('🔍 [AccountingPointsStore] 开始获取余额');
          set({ loading: true, error: null });
          const balance = await AccountingPointsService.getBalance();
          console.log('✅ [AccountingPointsStore] 余额获取成功:', balance);
          set({ balance, loading: false });
        } catch (error) {
          console.error('❌ [AccountingPointsStore] 获取记账点余额失败:', error);
          set({
            error: error instanceof Error ? error.message : '获取记账点余额失败',
            loading: false,
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
            loading: false,
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
            error: error instanceof Error ? error.message : '获取签到状态失败',
          });
        }
      },

      // 获取签到历史
      fetchCheckinHistory: async (days = 30) => {
        try {
          set({ loading: true, error: null });
          const checkinHistory = await AccountingPointsService.getCheckinHistory(days);
          set({ checkinHistory, loading: false });
        } catch (error) {
          console.error('获取签到历史失败:', error);
          set({
            error: error instanceof Error ? error.message : '获取签到历史失败',
            loading: false,
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
          await get().fetchCheckinHistory();

          set({ loading: false });
          return result;
        } catch (error) {
          console.error('签到失败:', error);
          const errorMessage = error instanceof Error ? error.message : '签到失败';
          set({
            error: errorMessage,
            loading: false,
          });
          throw new Error(errorMessage);
        }
      },

      // 消费记账点（同步会员和记账点系统）
      consumePoints: async (points: number, description: string) => {
        try {
          set({ loading: true, error: null });

          // 调用记账点消费API
          await AccountingPointsService.consumePoints(points, description);

          // 刷新本地余额
          await get().fetchBalance();

          // 同步会员系统数据 - 动态导入避免循环依赖
          try {
            const { useMembershipStore } = await import('./membership-store');
            await useMembershipStore.getState().fetchMembershipInfo();
          } catch (syncError) {
            console.warn('同步会员信息失败:', syncError);
          }

          set({ loading: false });
        } catch (error) {
          console.error('消费记账点失败:', error);
          const errorMessage = error instanceof Error ? error.message : '消费记账点失败';
          set({
            error: errorMessage,
            loading: false,
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
          checkinHistory: null,
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: 'accounting-points-store',
      partialize: (state) => ({
        balance: state.balance,
        checkinStatus: state.checkinStatus,
        checkinHistory: state.checkinHistory,
      }),
    },
  ),
);
