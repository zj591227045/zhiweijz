'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { smartNavigate } from '@/lib/navigation';
import dayjs from 'dayjs';
import { UnifiedTransactionList, TransactionType } from '../common/unified-transaction-list';
import '../common/unified-transaction-list.css';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
  type: TransactionType;
  category?: {
    id: string;
    name: string;
    icon: string;
  };
  categoryIcon?: string;
}

interface CategoryTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryId?: string;
  filters: {
    startDate: string;
    endDate: string;
    accountBookId?: string;
    transactionType: 'EXPENSE' | 'INCOME';
  };
  onTransactionEdit?: (transactionId: string, transactionData?: any) => void;
}

export function CategoryTransactionsModal({
  isOpen,
  onClose,
  categoryName,
  categoryId,
  filters,
  onTransactionEdit,
}: CategoryTransactionsModalProps) {
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [groupedTransactions, setGroupedTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    totalAmount: 0,
    transactionCount: 0,
  });

  // 获取交易数据
  const fetchTransactions = async () => {
    if (!isOpen) return;

    console.log('开始获取分类交易数据:', {
      categoryName,
      categoryId,
      filters,
    });

    setIsLoading(true);
    setError(null);

    try {
      // 构建查询参数
      // 确保时间范围包含完整的一天
      const startDateTime = dayjs(filters.startDate).startOf('day').toISOString();
      const endDateTime = dayjs(filters.endDate).endOf('day').toISOString();

      const queryParams: Record<string, any> = {
        startDate: startDateTime,
        endDate: endDateTime,
        type: filters.transactionType,
        limit: 100, // 限制数量，避免数据过多
        sort: 'date:desc',
        includeAttachments: true, // 包含附件信息
      };

      if (filters.accountBookId) {
        queryParams.accountBookId = filters.accountBookId;
      }

      if (categoryId) {
        queryParams.categoryIds = categoryId;
      }

      console.log('API请求参数:', queryParams);

      // 获取交易数据
      const response = await apiClient.get('/transactions', {
        params: queryParams,
      });

      console.log('API响应:', response);

      if (response && response.data) {
        const transactionData = response.data;
        setTransactions(transactionData);

        // 计算统计数据
        const totalAmount = transactionData.reduce((sum: number, t: Transaction) => sum + t.amount, 0);
        setStatistics({
          totalAmount,
          transactionCount: transactionData.length,
        });

        // 按日期分组
        const grouped = groupTransactionsByDate(transactionData);
        setGroupedTransactions(grouped);
      }
    } catch (error) {
      console.error('获取交易数据失败:', error);
      setError('获取交易数据失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 按日期分组交易 - 转换为统一组件格式
  const groupTransactionsByDate = (transactions: Transaction[]) => {
    if (!Array.isArray(transactions)) return [];

    const groups: Record<string, Transaction[]> = {};

    transactions.forEach((transaction) => {
      const date = dayjs(transaction.date).format('YYYY-MM-DD');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(transaction);
    });

    return Object.entries(groups)
      .map(([date, transactions]) => ({
        date: dayjs(date).format('MM月DD日'),
        transactions: transactions.map(transaction => ({
          id: transaction.id,
          amount: transaction.amount,
          type: transaction.type,
          categoryName: transaction.category?.name || '未分类',
          categoryIcon: transaction.category?.icon || transaction.categoryIcon,
          description: transaction.description,
          date: dayjs(transaction.date).format('HH:mm'),
          category: transaction.category,
          tags: transaction.tags,
          attachments: transaction.attachments
        }))
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  // 处理交易项点击 - 优先使用传入的编辑函数，否则直接导航
  const handleTransactionClick = (transactionId: string) => {
    if (onTransactionEdit) {
      // 找到对应的交易数据
      const transactionData = transactions.find(t => t.id === transactionId);
      onTransactionEdit(transactionId, transactionData);
    } else {
      // 回退到直接导航
      smartNavigate(router, `/transactions/edit/${transactionId}`);
    }
  };

  // 当模态框打开时获取数据
  useEffect(() => {
    if (isOpen) {
      console.log('模态框打开，开始获取交易数据:', {
        isOpen,
        categoryId,
        filters,
      });
      fetchTransactions();
    }
  }, [
    isOpen,
    categoryId,
    filters.startDate,
    filters.endDate,
    filters.accountBookId,
    filters.transactionType,
  ]);

  // 管理body滚动
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      return () => {
        document.body.classList.remove('modal-open');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 使用 Portal 渲染到 body，确保全屏显示
  return createPortal(
    <div className="category-transactions-modal-overlay" onClick={onClose}>
      <div className="category-transactions-modal" onClick={(e) => e.stopPropagation()}>
        {/* 模态框头部 */}
        <div className="modal-header">
          <div className="modal-title-section">
            <h3 className="modal-title">{categoryName} - 交易记录</h3>
            <div className="modal-subtitle">
              {dayjs(filters.startDate).format('YYYY年MM月DD日')} 至{' '}
              {dayjs(filters.endDate).format('YYYY年MM月DD日')}
            </div>
          </div>
          <button className="modal-close-button" onClick={onClose} aria-label="关闭">
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* 统计摘要 */}
        <div className="modal-summary">
          <div className="summary-item">
            <span className="summary-label">总金额</span>
            <span className="summary-value">{formatCurrency(statistics.totalAmount)}</span>
          </div>
          <div className="summary-divider"></div>
          <div className="summary-item">
            <span className="summary-label">交易笔数</span>
            <span className="summary-value">{statistics.transactionCount}笔</span>
          </div>
        </div>

        {/* 模态框内容 */}
        <div className="modal-content">
          <UnifiedTransactionList
            groupedTransactions={groupedTransactions}
            onTransactionClick={handleTransactionClick}
            showDateHeaders={true}
            emptyMessage="该分类暂无交易记录"
            isLoading={isLoading}
            error={error}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
