'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@zhiweijz/web';
import { PageContainer } from '@/components/layout/page-container';
import { useTransactionStore } from '@/store/transaction-store';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatCurrency, formatDate, getIconClass } from '@/lib/utils';
import { TransactionType } from '@/types';
import './transaction-detail.css';

export default function TransactionDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { transaction, isLoading, error, fetchTransaction, deleteTransaction } = useTransactionStore();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 获取交易详情
  useEffect(() => {
    if (params.id) {
      fetchTransaction(params.id);
    }
  }, [params.id, fetchTransaction]);

  // 处理编辑交易
  const handleEdit = () => {
    router.push(`/transactions/edit/${params.id}`);
  };

  // 处理删除交易
  const handleDelete = async () => {
    if (!transaction) return;

    setIsDeleting(true);
    const success = await deleteTransaction(transaction.id);
    setIsDeleting(false);

    if (success) {
      router.push('/transactions');
    }
  };

  // 返回上一页
  const handleBack = () => {
    router.back();
  };

  return (
    <PageContainer title="交易详情" showBackButton={true} onBackClick={handleBack} showBottomNav={false}>
        {isLoading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <div className="loading-text">加载中...</div>
          </div>
        ) : error ? (
          <div className="error-state">
            <div className="error-icon">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="error-message">{error}</div>
            <button
              className="retry-button"
              onClick={() => fetchTransaction(params.id)}
            >
              重试
            </button>
          </div>
        ) : transaction ? (
          <div className="transaction-detail-card">
            <div className={`transaction-detail-amount ${transaction.type === TransactionType.INCOME ? 'income' : 'expense'}`}>
              {transaction.type === TransactionType.INCOME ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </div>

            <div className="transaction-info-list">
              <div className="info-item">
                <div className="info-label">类型</div>
                <div className="info-value">
                  {transaction.type === TransactionType.INCOME ? '收入' : '支出'}
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">分类</div>
                <div className="info-value">
                  <div className="category-icon">
                    <div className="icon-circle">
                      <i className={getIconClass(transaction.category?.icon)}></i>
                    </div>
                    <span>{transaction.category?.name || '未分类'}</span>
                  </div>
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">日期</div>
                <div className="info-value">
                  {formatDate(transaction.date, 'YYYY年MM月DD日')}
                </div>
              </div>

              <div className="info-item">
                <div className="info-label">账本</div>
                <div className="info-value">
                  {transaction.accountBook?.name || '默认账本'}
                </div>
              </div>

              {transaction.budget && (
                <div className="info-item">
                  <div className="info-label">预算</div>
                  <div className="info-value">
                    {transaction.budget.name}
                  </div>
                </div>
              )}

              {transaction.description && (
                <div className="info-item">
                  <div className="info-label">备注</div>
                  <div className="info-value">
                    {transaction.description}
                  </div>
                </div>
              )}

              <div className="info-item">
                <div className="info-label">创建时间</div>
                <div className="info-value">
                  {formatDate(transaction.createdAt, 'YYYY-MM-DD HH:mm')}
                </div>
              </div>

              {transaction.updatedAt && transaction.updatedAt !== transaction.createdAt && (
                <div className="info-item">
                  <div className="info-label">更新时间</div>
                  <div className="info-value">
                    {formatDate(transaction.updatedAt, 'YYYY-MM-DD HH:mm')}
                  </div>
                </div>
              )}
            </div>

            <div className="action-buttons">
              <button className="btn-edit" onClick={handleEdit}>
                <i className="fas fa-edit"></i>
                编辑
              </button>
              <button className="btn-delete" onClick={() => setShowDeleteDialog(true)}>
                <i className="fas fa-trash-alt"></i>
                删除
              </button>
            </div>
          </div>
        ) : (
          <div className="error-state">
            <div className="error-icon">
              <i className="fas fa-exclamation-circle"></i>
            </div>
            <div className="error-message">未找到交易记录</div>
            <button
              className="retry-button"
              onClick={() => router.push('/transactions')}
            >
              返回交易列表
            </button>
          </div>
        )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="删除交易"
        message="确定要删除这笔交易吗？此操作无法撤销。"
        confirmText={isDeleting ? "删除中..." : "删除"}
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        isDangerous
      />
    </PageContainer>
  );
}
