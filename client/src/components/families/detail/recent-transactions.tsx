"use client";

import Link from "next/link";
import { useFamilyDetailStore } from "@/lib/stores/family-detail-store";
import { formatCurrency } from "@/lib/utils/format-utils";
import { formatDate } from "@/lib/utils/date-utils";

interface RecentTransactionsProps {
  familyId: string;
}

export function RecentTransactions({ familyId }: RecentTransactionsProps) {
  const { statistics } = useFamilyDetailStore();
  
  // 如果没有交易数据，显示空状态
  if (!statistics || statistics.recentTransactions.length === 0) {
    return (
      <>
        <div className="section-title">
          <span>最近交易</span>
        </div>
        
        <div className="recent-transactions">
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <i className="fas fa-receipt text-gray-400 text-xl"></i>
            </div>
            <p className="text-gray-500 mb-2">暂无交易记录</p>
            <p className="text-xs text-gray-400 mb-4">家庭成员的交易将显示在这里</p>
          </div>
        </div>
      </>
    );
  }

  // 获取交易图标背景色
  const getIconBackground = (categoryIcon: string) => {
    const iconColors: Record<string, string> = {
      'utensils': '#FF5722',
      'shopping-bag': '#2196F3',
      'home': '#9C27B0',
      'car': '#FF9800',
      'money-bill-wave': '#4CAF50',
      'briefcase': '#3F51B5',
      'gift': '#E91E63',
      'plane': '#00BCD4',
    };
    
    return iconColors[categoryIcon] || '#607D8B';
  };

  return (
    <>
      <div className="section-title">
        <span>最近交易</span>
        <Link href="#" className="view-all">查看全部</Link>
      </div>
      
      <div className="recent-transactions">
        {statistics.recentTransactions.map((transaction) => (
          <div key={transaction.id} className="transaction-item">
            <div 
              className="transaction-icon" 
              style={{ backgroundColor: getIconBackground(transaction.categoryIcon) }}
            >
              <i className={`fas fa-${transaction.categoryIcon}`}></i>
            </div>
            <div className="transaction-details">
              <div className="transaction-title">
                {transaction.description}
                <span className="transaction-member">{transaction.memberName}</span>
              </div>
              <div className="transaction-date">
                {formatDate(transaction.date, "MM月DD日 HH:mm")}
              </div>
            </div>
            <div className={`transaction-amount ${transaction.type === 'EXPENSE' ? 'amount-expense' : 'amount-income'}`}>
              {transaction.type === 'EXPENSE' ? '-' : '+'}
              {formatCurrency(transaction.amount)}
            </div>
          </div>
        ))}
        
        <Link href="#" className="view-all-button">
          查看全部交易
        </Link>
      </div>
    </>
  );
}
