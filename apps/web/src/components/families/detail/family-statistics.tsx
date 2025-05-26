'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

interface FamilyStatisticsProps {
  familyId: string;
}

interface StatisticsData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  memberStats: {
    memberId: string;
    memberName: string;
    totalExpense: number;
    percentage: number;
  }[];
  categoryStats: {
    categoryId: string;
    categoryName: string;
    totalExpense: number;
    percentage: number;
  }[];
}

export function FamilyStatistics({ familyId }: FamilyStatisticsProps) {
  const { token } = useAuthStore();
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<'month' | 'last_month' | 'all'>('month');

  // 获取统计数据
  const fetchStatistics = async () => {
    if (!token) {
      console.error('未提供认证令牌');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/families/${familyId}/statistics?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatistics(data);
      } else {
        console.error('获取统计数据失败');
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (familyId && token) {
      fetchStatistics();
    }
  }, [familyId, period, token]);

  // 格式化金额
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // 获取期间标题
  const getPeriodTitle = () => {
    switch (period) {
      case 'month':
        return '本月';
      case 'last_month':
        return '上月';
      case 'all':
        return '全部';
      default:
        return '本月';
    }
  };

  if (isLoading) {
    return (
      <div className="statistics-section">
        <div className="section-header">
          <div className="section-title">
            <i className="fas fa-chart-pie"></i>
            <span>家庭统计</span>
          </div>
        </div>
        <div className="loading-state">
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (!statistics) {
    return (
      <div className="statistics-section">
        <div className="section-header">
          <div className="section-title">
            <i className="fas fa-chart-pie"></i>
            <span>家庭统计</span>
          </div>
        </div>
        <div className="empty-state">
          <i className="fas fa-chart-pie"></i>
          <p>暂无统计数据</p>
        </div>
      </div>
    );
  }

  return (
    <div className="statistics-section">
      <div className="section-header">
        <div className="section-title">
          <i className="fas fa-chart-pie"></i>
          <span>家庭统计</span>
        </div>
      </div>

      {/* 时间范围选择器 */}
      <div className="period-selector">
        <button 
          className={`period-tab ${period === 'month' ? 'active' : ''}`}
          onClick={() => setPeriod('month')}
        >
          本月
        </button>
        <button 
          className={`period-tab ${period === 'last_month' ? 'active' : ''}`}
          onClick={() => setPeriod('last_month')}
        >
          上月
        </button>
        <button 
          className={`period-tab ${period === 'all' ? 'active' : ''}`}
          onClick={() => setPeriod('all')}
        >
          全部
        </button>
      </div>

      {/* 总览统计 */}
      <div className="stats-overview">
        <div className="stats-summary">
          <div className="stat-item income">
            <div className="stat-label">总收入</div>
            <div className="stat-value">{formatCurrency(statistics.totalIncome)}</div>
          </div>
          <div className="stat-item expense">
            <div className="stat-label">总支出</div>
            <div className="stat-value">{formatCurrency(statistics.totalExpense)}</div>
          </div>
          <div className="stat-item balance">
            <div className="stat-label">结余</div>
            <div className={`stat-value ${statistics.balance >= 0 ? 'positive' : 'negative'}`}>
              {formatCurrency(statistics.balance)}
            </div>
          </div>
        </div>
      </div>

      {/* 成员消费排行 */}
      {statistics.memberStats && statistics.memberStats.length > 0 && (
        <div className="member-ranking">
          <h4 className="ranking-title">成员消费排行</h4>
          <div className="ranking-list">
            {statistics.memberStats.slice(0, 5).map((member, index) => (
              <div key={member.memberId} className="ranking-item">
                <div className="rank-number">{index + 1}</div>
                <div className="member-info">
                  <div className="member-name">{member.memberName}</div>
                  <div className="member-percentage">{member.percentage.toFixed(1)}%</div>
                </div>
                <div className="member-amount">{formatCurrency(member.totalExpense)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分类消费排行 */}
      {statistics.categoryStats && statistics.categoryStats.length > 0 && (
        <div className="category-ranking">
          <h4 className="ranking-title">分类消费排行</h4>
          <div className="ranking-list">
            {statistics.categoryStats.slice(0, 5).map((category, index) => (
              <div key={category.categoryId} className="ranking-item">
                <div className="rank-number">{index + 1}</div>
                <div className="category-info">
                  <div className="category-name">{category.categoryName}</div>
                  <div className="category-percentage">{category.percentage.toFixed(1)}%</div>
                </div>
                <div className="category-amount">{formatCurrency(category.totalExpense)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
