'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface FamilyMemberBudget {
  memberId: string;
  memberName: string;
  spent: number;
  percentage: number;
}

interface FamilyBudgetSummaryProps {
  budgetId: string;
  familyId: string;
  totalAmount: number;
}

export function FamilyBudgetSummary({ 
  budgetId, 
  familyId,
  totalAmount 
}: FamilyBudgetSummaryProps) {
  const [memberBudgets, setMemberBudgets] = useState<FamilyMemberBudget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0);
  const [totalPercentage, setTotalPercentage] = useState(0);

  // 获取家庭成员预算使用情况
  useEffect(() => {
    const fetchFamilyBudgetSummary = async () => {
      try {
        setIsLoading(true);
        const response = await apiClient.get<FamilyMemberBudget[]>(
          `/budgets/${budgetId}/family-summary?familyId=${familyId}`
        );
        
        if (response && Array.isArray(response)) {
          setMemberBudgets(response);
          
          // 计算总支出和总百分比
          const spent = response.reduce((sum, item) => sum + item.spent, 0);
          setTotalSpent(spent);
          
          const percentage = totalAmount > 0 ? (spent / totalAmount) * 100 : 0;
          setTotalPercentage(percentage);
        }
      } catch (error) {
        console.error('获取家庭预算汇总失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (budgetId && familyId) {
      fetchFamilyBudgetSummary();
    }
  }, [budgetId, familyId, totalAmount]);

  // 如果正在加载，显示骨架屏
  if (isLoading) {
    return (
      <div className="family-budget-summary mt-4">
        <h3 className="text-lg font-semibold mb-2">家庭成员支出</h3>
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="family-budget-summary mt-4">
      <h3 className="text-lg font-semibold mb-2">家庭成员支出</h3>
      
      {/* 总支出汇总 */}
      <div className="family-budget-total p-3 bg-gray-100 dark:bg-gray-800 rounded-lg mb-3">
        <div className="flex justify-between items-center mb-2">
          <span className="font-medium">总支出</span>
          <span className="font-medium">{formatCurrency(totalSpent)}</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-blue-600 h-2.5 rounded-full" 
            style={{ width: `${Math.min(totalPercentage, 100)}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span>{totalPercentage.toFixed(0)}%</span>
          <span>{formatCurrency(totalAmount)}</span>
        </div>
      </div>
      
      {/* 成员支出列表 */}
      {memberBudgets.length > 0 ? (
        <div className="family-members-spending space-y-3">
          {memberBudgets.map((member) => (
            <div key={member.memberId} className="member-spending">
              <div className="flex justify-between items-center mb-1">
                <span>{member.memberName}</span>
                <span>{formatCurrency(member.spent)}</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${Math.min(member.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="text-right text-xs mt-0.5">
                {member.percentage.toFixed(0)}%
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-gray-500">
          暂无家庭成员支出数据
        </div>
      )}
    </div>
  );
}
