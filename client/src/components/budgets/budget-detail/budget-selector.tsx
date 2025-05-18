'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Budget } from '@/store/budget-detail-store';
import { Skeleton } from '@/components/ui/skeleton';
import { budgetService } from '@/lib/api/budget-service';
import { useSwipeable } from 'react-swipeable';
import { useAccountBookStore } from '@/store/account-book-store';

interface BudgetSelectorProps {
  currentBudgetId: string;
  onBudgetChange: (budgetId: string) => void;
}

export function BudgetSelector({ currentBudgetId, onBudgetChange }: BudgetSelectorProps) {
  const router = useRouter();
  const [activeBudgets, setActiveBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // 获取全局账本状态
  const { currentAccountBook } = useAccountBookStore();

  // 获取活跃预算
  useEffect(() => {
    const fetchActiveBudgets = async () => {
      try {
        setIsLoading(true);
        const response = await budgetService.getActiveBudgets();
        console.log('获取到的所有活跃预算:', response);
        console.log('当前全局账本:', currentAccountBook);

        // 确保有预算数据
        if (response && Array.isArray(response) && response.length > 0) {
          // 首先根据全局账本过滤预算
          let filteredBudgets = response;

          if (currentAccountBook) {
            console.log(`根据全局账本 ${currentAccountBook.name} (${currentAccountBook.id}) 过滤预算`);

            // 只显示与当前全局账本匹配的预算
            filteredBudgets = response.filter(budget =>
              budget.accountBookId === currentAccountBook.id
            );

            console.log('根据全局账本过滤后的预算:', filteredBudgets);

            // 如果过滤后没有预算，回退到原始行为
            if (filteredBudgets.length === 0) {
              console.log('过滤后没有预算，回退到原始过滤逻辑');

              // 获取当前预算信息
              const currentBudget = response.find(budget => budget.id === currentBudgetId);

              // 使用原始过滤逻辑
              if (currentBudget) {
                if (currentBudget.accountBookType === 'PERSONAL') {
                  filteredBudgets = response.filter(budget => budget.accountBookType === 'PERSONAL');
                } else if (currentBudget.accountBookType === 'FAMILY') {
                  filteredBudgets = response.filter(budget =>
                    budget.accountBookType === 'FAMILY' && budget.familyId === currentBudget.familyId
                  );
                }
              } else {
                filteredBudgets = response;
              }
            }
          } else {
            console.log('没有全局账本，使用原始过滤逻辑');

            // 获取当前预算信息
            const currentBudget = response.find(budget => budget.id === currentBudgetId);

            // 使用原始过滤逻辑
            if (currentBudget) {
              if (currentBudget.accountBookType === 'PERSONAL') {
                filteredBudgets = response.filter(budget => budget.accountBookType === 'PERSONAL');
              } else if (currentBudget.accountBookType === 'FAMILY') {
                filteredBudgets = response.filter(budget =>
                  budget.accountBookType === 'FAMILY' && budget.familyId === currentBudget.familyId
                );
              }
            }
          }

          setActiveBudgets(filteredBudgets);

          // 找到当前预算的索引
          const index = filteredBudgets.findIndex(budget => budget.id === currentBudgetId);
          if (index !== -1) {
            setCurrentIndex(index);
          }
        } else {
          console.warn('没有找到活跃的预算');
        }
      } catch (error) {
        console.error('获取活跃预算失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveBudgets();
  }, [currentBudgetId, currentAccountBook]);

  // 处理滑动
  const handlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('next'),
    onSwipedRight: () => handleSwipe('prev'),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  // 处理滑动切换
  const handleSwipe = (direction: 'prev' | 'next') => {
    if (activeBudgets.length <= 1) return;

    let newIndex = currentIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : activeBudgets.length - 1;
    } else {
      newIndex = currentIndex < activeBudgets.length - 1 ? currentIndex + 1 : 0;
    }

    setCurrentIndex(newIndex);
    onBudgetChange(activeBudgets[newIndex].id);
  };

  // 获取预算类型标签
  const getBudgetTypeLabel = (budget: Budget) => {
    if (budget.accountBookType === 'FAMILY') {
      return '家庭';
    }
    return budget.period === 'MONTHLY' ? '月度' : '年度';
  };

  // 如果正在加载，显示骨架屏
  if (isLoading) {
    return <Skeleton className="h-16 w-full mb-4" />;
  }

  // 如果没有活跃预算，显示创建预算按钮
  if (activeBudgets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-lg p-4 mb-4 shadow">
        <p className="text-gray-500 dark:text-gray-400 mb-2">没有找到活跃的预算</p>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          onClick={() => router.push('/budgets/new')}
        >
          创建预算
        </button>
      </div>
    );
  }

  const currentBudget = activeBudgets[currentIndex];

  return (
    <div
      {...handlers}
      className="budget-selector cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="budget-selector-info">
          <i className={`fas ${currentBudget.accountBookType === 'FAMILY' ? 'fa-users' : 'fa-book'} budget-selector-icon`}></i>
          <div className="budget-selector-text">
            <div className="budget-selector-name">{currentBudget.accountBookName || '我的账本'}</div>
            <div className="budget-selector-type">
              {getBudgetTypeLabel(currentBudget)} {currentBudget.categoryName ? `- ${currentBudget.categoryName}` : '总预算'}
            </div>
          </div>
        </div>

        {activeBudgets.length > 1 && (
          <div className="budget-selector-controls">
            <button
              className="budget-selector-button"
              onClick={(e) => {
                e.stopPropagation();
                handleSwipe('prev');
              }}
            >
              <i className="fas fa-chevron-left"></i>
            </button>
            <div className="budget-selector-count">
              {currentIndex + 1}/{activeBudgets.length}
            </div>
            <button
              className="budget-selector-button"
              onClick={(e) => {
                e.stopPropagation();
                handleSwipe('next');
              }}
            >
              <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
