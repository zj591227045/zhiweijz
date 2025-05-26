'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';

interface RecentTransactionsProps {
  familyId: string;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  categoryName: string;
  categoryIcon: string;
  memberName: string;
  createdAt: string;
  type: 'INCOME' | 'EXPENSE';
}

export function RecentTransactions({ familyId }: RecentTransactionsProps) {
  const { token } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 获取最近交易
  const fetchRecentTransactions = async () => {
    if (!token) {
      console.error('未提供认证令牌');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/families/${familyId}/transactions/recent?limit=5`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setTransactions(data || []);
      } else {
        console.error('获取最近交易失败');
      }
    } catch (error) {
      console.error('获取最近交易失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (familyId && token) {
      fetchRecentTransactions();
    }
  }, [familyId, token]);

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return '刚刚';
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    } else if (diffInHours < 48) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // 获取分类图标类名
  const getCategoryIconClass = (icon: string) => {
    if (icon && icon.startsWith('fas ')) {
      return icon;
    }
    return `fas fa-${icon || 'tag'}`;
  };

  if (isLoading) {
    return (
      <div className="transactions-section">
        <div className="section-header">
          <div className="section-title">
            <i className="fas fa-history"></i>
            <span>最近交易</span>
          </div>
        </div>
        <div className="loading-state">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="transactions-section">
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-history"></i>
          <span>最近交易</span>
        </div>
        <Link href={`/families/${familyId}/transactions`} className="view-all-link">
          查看全部
          <i className="fas fa-chevron-right"></i>
        </Link>
      </div>

      {transactions.length > 0 ? (
        <div className="transactions-list">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="transaction-item">
              <div className="transaction-icon">
                <i className={getCategoryIconClass(transaction.categoryIcon)}></i>
              </div>
              <div className="transaction-details">
                <div className="transaction-category">{transaction.categoryName}</div>
                <div className="transaction-description">{transaction.description}</div>
                <div className="transaction-meta">
                  <span className="transaction-member">{transaction.memberName}</span>
                  <span className="transaction-time">{formatTime(transaction.createdAt)}</span>
                </div>
              </div>
              <div className={`transaction-amount ${transaction.type.toLowerCase()}`}>
                {transaction.type === 'INCOME' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <i className="fas fa-history"></i>
          <p>暂无交易记录</p>
          <Link href="/transactions/new" className="btn-primary">
            添加交易
          </Link>
        </div>
      )}
    </div>
  );
}
