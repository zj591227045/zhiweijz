'use client';

import React from 'react';
import { useTransactionSelectionStore } from '@/store/transaction-selection-store';
import { TransactionSelectionModal } from './transaction-selection-modal';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useDashboardStore } from '@/store/dashboard-store';
import { useAccountingPointsStore } from '@/store/accounting-points-store';

/**
 * 全局记录选择模态框组件
 * 用于在智能记账模态框关闭后仍能显示记录选择界面
 */
export function GlobalTransactionSelectionModal() {
  const {
    isOpen,
    records,
    isLoading,
    accountBookId,
    imageFileInfo,
    onConfirm,
    hideSelectionModal,
    setLoading,
  } = useTransactionSelectionStore();

  const { refreshDashboardData } = useDashboardStore();
  const { fetchBalance } = useAccountingPointsStore();

  // 处理用户选择的记账记录
  const handleSelectedTransactions = async (selectedRecords: any[]) => {
    if (!accountBookId) {
      toast.error('账本ID缺失');
      return;
    }

    try {
      setLoading(true);

      // 如果有自定义的确认回调，使用它
      if (onConfirm) {
        await onConfirm(selectedRecords, imageFileInfo);
      } else {
        // 默认的记录创建逻辑
        const response = await apiClient.post(
          `/ai/account/${accountBookId}/smart-accounting/create-selected`,
          {
            selectedRecords,
            imageFileInfo // 传递图片文件信息
          },
          { timeout: 60000 }
        );

        if (response && response.success) {
          toast.success(`成功创建 ${response.count} 条记账记录`);

          // 刷新仪表盘数据和记账点余额
          try {
            await refreshDashboardData(accountBookId);
            await fetchBalance();
          } catch (refreshError) {
            console.error('刷新数据失败:', refreshError);
          }
        } else {
          toast.error('创建记账记录失败');
        }
      }

      // 关闭模态框
      hideSelectionModal();
    } catch (error: any) {
      console.error('创建选择记账记录失败:', error);
      toast.error(error.message || '创建记账记录失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理模态框关闭
  const handleClose = () => {
    hideSelectionModal();
  };

  // 如果没有打开，不渲染
  if (!isOpen) {
    return null;
  }

  return (
    <TransactionSelectionModal
      isOpen={isOpen}
      onClose={handleClose}
      records={records}
      onConfirm={handleSelectedTransactions}
      isLoading={isLoading}
    />
  );
}
