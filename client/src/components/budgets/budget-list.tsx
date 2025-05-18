'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useBudgetStore } from '@/store/budget-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { accountBookService, budgetService } from '@/lib/api/budget-service';
import { familyService } from '@/lib/api/budget-service';
import { BudgetTypeSelector } from './budget-type-selector';
import { MonthSelector } from './month-selector';
import { BudgetOverview } from './budget-overview';
import { CategoryBudgets } from './category-budgets';
import { FamilyBudgets } from './family-budgets';
import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from '@/components/layout/page-container';

export function BudgetList() {
  const router = useRouter();
  const { currentAccountBook } = useAccountBookStore();
  const {
    accountBooks,
    selectedAccountBook,
    budgetType,
    currentPeriod,
    activeFilter,
    selectedFamilyMemberId,
    setAccountBooks,
    setSelectedAccountBook,
    setFamilyMembers,
    setTotalBudget,
    setBudgets,
    setFamilyBudgets,
    setIsLoading,
  } = useBudgetStore();

  // 获取账本列表
  const {
    data: accountBooksData,
    isLoading: isLoadingAccountBooks,
    error: accountBooksError,
  } = useQuery({
    queryKey: ['accountBooks'],
    queryFn: async () => {
      console.log('正在获取账本列表...');
      try {
        const result = await accountBookService.getAccountBooks();
        console.log('获取账本列表成功:', result);
        return result;
      } catch (error) {
        console.error('获取账本列表失败:', error);
        throw error;
      }
    },
  });

  // 获取预算列表
  const {
    data: budgetData,
    isLoading: isLoadingBudgets,
    refetch: refetchBudgets,
    error: budgetError,
  } = useQuery({
    queryKey: [
      'budgets',
      selectedAccountBook?.id,
      budgetType,
      currentPeriod.startDate,
      currentPeriod.endDate,
      activeFilter,
      selectedFamilyMemberId,
    ],
    queryFn: async () => {
      // 确保有账本ID
      const accountBookId = selectedAccountBook?.id;

      console.log('正在获取预算列表...', {
        accountBookId,
        period: budgetType,
        startDate: dayjs(currentPeriod.startDate).format('YYYY-MM-DD'),
        endDate: dayjs(currentPeriod.endDate).format('YYYY-MM-DD'),
      });

      if (!accountBookId) {
        console.error('获取预算列表失败: 没有账本ID');
        return {
          totalBudget: {
            amount: 0,
            spent: 0,
            remaining: 0,
            percentage: 0,
            daysRemaining: 0,
            dailyAvailable: 0
          },
          budgets: []
        };
      }

      try {
        const result = await budgetService.getBudgets({
          accountBookId,
          period: budgetType,
          startDate: dayjs(currentPeriod.startDate).format('YYYY-MM-DD'),
          endDate: dayjs(currentPeriod.endDate).format('YYYY-MM-DD'),
          familyMemberId: selectedFamilyMemberId || undefined,
          filter: activeFilter,
        });
        console.log('获取预算列表成功:', result);
        return result;
      } catch (error) {
        console.error('获取预算列表失败:', error);
        throw error;
      }
    },
    enabled: !!selectedAccountBook?.id, // 确保有账本ID才启用查询
  });

  // 获取家庭成员列表（仅家庭账本）
  const {
    data: familyMembersData,
    isLoading: isLoadingFamilyMembers,
  } = useQuery({
    queryKey: ['familyMembers', selectedAccountBook?.familyId],
    queryFn: () => familyService.getFamilyMembers(selectedAccountBook?.familyId as string),
    enabled: !!selectedAccountBook?.familyId,
  });

  // 初始化账本列表
  useEffect(() => {
    console.log('账本数据更新 - 原始数据:', accountBooksData);

    // 确保accountBooksData是有效数据
    if (accountBooksData) {
      console.log('账本数据更新 - 有数据，处理账本列表');

      // 检查数据格式
      let processedData = accountBooksData;

      // 如果数据是嵌套在data字段中的，提取出来
      if (accountBooksData && typeof accountBooksData === 'object' && Array.isArray(accountBooksData.data)) {
        console.log('账本数据更新 - 数据格式为分页格式，提取data字段');
        processedData = accountBooksData.data;
      }

      // 确保processedData是数组
      if (!Array.isArray(processedData)) {
        console.log('账本数据更新 - 处理后的数据不是数组，转换为空数组');
        processedData = [];
      }

      console.log('账本数据更新 - 处理后的数据:', processedData);
      setAccountBooks(processedData);

      // 使用全局账本作为选中的账本
      if (currentAccountBook && !selectedAccountBook) {
        console.log('账本数据更新 - 使用全局账本:', currentAccountBook);
        // 在processedData中查找匹配的账本
        const matchedBook = processedData.find(book => book.id === currentAccountBook.id);
        if (matchedBook) {
          setSelectedAccountBook(matchedBook);
        } else if (processedData.length > 0) {
          // 如果找不到匹配的账本，使用默认账本或第一个账本
          const defaultBook = processedData.find(book => book.isDefault) || processedData[0];
          console.log('账本数据更新 - 使用默认账本:', defaultBook);
          setSelectedAccountBook(defaultBook);
        }
      } else if (!selectedAccountBook && processedData.length > 0) {
        // 如果没有全局账本和选中的账本，选择默认账本或第一个账本
        const defaultBook = processedData.find(book => book.isDefault) || processedData[0];
        console.log('账本数据更新 - 选择默认账本:', defaultBook);
        setSelectedAccountBook(defaultBook);
      }
    } else {
      console.log('账本数据更新 - 没有有效数据');
      setAccountBooks([]);
    }
  }, [accountBooksData, currentAccountBook, selectedAccountBook, setAccountBooks, setSelectedAccountBook]);

  // 初始化家庭成员列表
  useEffect(() => {
    if (familyMembersData && familyMembersData.length > 0) {
      setFamilyMembers(familyMembersData);
    }
  }, [familyMembersData, setFamilyMembers]);

  // 更新预算数据
  useEffect(() => {
    console.log('预算数据更新 - 原始数据:', budgetData);

    if (budgetData) {
      console.log('预算数据更新 - 总预算:', budgetData.totalBudget);
      console.log('预算数据更新 - 预算列表:', budgetData.budgets);
      console.log('预算数据更新 - 家庭预算:', budgetData.familyBudgets);

      // 设置总预算
      if (budgetData.totalBudget) {
        setTotalBudget(budgetData.totalBudget);
      } else {
        console.warn('预算数据更新 - 没有总预算数据');
        setTotalBudget({
          amount: 0,
          spent: 0,
          remaining: 0,
          percentage: 0,
          daysRemaining: calculateDaysRemaining(),
          dailyAvailable: 0
        });
      }

      // 确保预算列表是数组
      const budgetsList = Array.isArray(budgetData.budgets) ? budgetData.budgets : [];

      // 确保每个预算项都有必要的属性
      const processedBudgets = budgetsList.map(budget => ({
        ...budget,
        // 确保分类信息存在
        categoryName: budget.categoryName || budget.name,
        categoryIcon: budget.categoryIcon || 'fa-money-bill',
        // 确保数值属性存在
        amount: budget.amount || 0,
        spent: budget.spent || 0,
        remaining: budget.remaining || 0,
        percentage: budget.percentage || 0,
        // 确保布尔属性存在
        isOverspent: budget.isOverspent || false,
        rollover: budget.rollover || false,
        enableCategoryBudget: budget.enableCategoryBudget !== false
      }));

      console.log('预算数据更新 - 处理后的预算列表:', processedBudgets);
      setBudgets(processedBudgets);

      // 确保家庭预算是对象
      const familyBudgetsList = budgetData.familyBudgets && typeof budgetData.familyBudgets === 'object'
        ? budgetData.familyBudgets
        : {};
      console.log('预算数据更新 - 处理后的家庭预算:', familyBudgetsList);
      setFamilyBudgets(familyBudgetsList);
    } else {
      console.log('预算数据更新 - 没有有效数据');
      // 设置默认空数据
      setTotalBudget({
        amount: 0,
        spent: 0,
        remaining: 0,
        percentage: 0,
        daysRemaining: calculateDaysRemaining(),
        dailyAvailable: 0
      });
      setBudgets([]);
      setFamilyBudgets({});
    }

    // 辅助函数：计算剩余天数
    function calculateDaysRemaining(): number {
      const today = new Date();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const diffTime = endOfMonth.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
  }, [budgetData, setBudgets, setFamilyBudgets, setTotalBudget]);

  // 更新加载状态
  useEffect(() => {
    setIsLoading(isLoadingAccountBooks || isLoadingBudgets || isLoadingFamilyMembers);
  }, [isLoadingAccountBooks, isLoadingBudgets, isLoadingFamilyMembers, setIsLoading]);

  // 监听全局账本变化
  useEffect(() => {
    if (currentAccountBook && accountBooks.length > 0) {
      // 在accountBooks中查找匹配的账本
      const matchedBook = accountBooks.find(book => book.id === currentAccountBook.id);
      if (matchedBook && (!selectedAccountBook || selectedAccountBook.id !== matchedBook.id)) {
        console.log('全局账本变化 - 更新选中的账本:', matchedBook);
        setSelectedAccountBook(matchedBook);
      }
    }
  }, [currentAccountBook, accountBooks, selectedAccountBook, setSelectedAccountBook]);

  // 处理添加预算
  const handleAddBudget = () => {
    router.push('/budgets/new');
  };

  // 右侧操作按钮
  const rightActions = (
    <button
      onClick={handleAddBudget}
      className="icon-button"
    >
      <i className="fas fa-plus"></i>
    </button>
  );

  return (
    <PageContainer title="预算管理" rightActions={rightActions} activeNavItem="budget">
      <BudgetTypeSelector />

      <MonthSelector />

      {isLoadingBudgets ? (
        <BudgetSkeleton />
      ) : (
        <>
          <BudgetOverview />

          <CategoryBudgets />

          {selectedAccountBook?.type === 'FAMILY' && <FamilyBudgets />}
        </>
      )}
    </PageContainer>
  );
}

// 骨架屏组件
function BudgetSkeleton() {
  return (
    <div className="skeleton-container">
      <div className="overview-card skeleton">
        <div className="overview-header skeleton">
          <div className="skeleton-title"></div>
          <div className="skeleton-subtitle"></div>
        </div>
        <div className="overview-amounts skeleton">
          <div className="amount-item skeleton">
            <div className="skeleton-label"></div>
            <div className="skeleton-value"></div>
          </div>
          <div className="amount-item skeleton">
            <div className="skeleton-label"></div>
            <div className="skeleton-value"></div>
          </div>
          <div className="amount-item skeleton">
            <div className="skeleton-label"></div>
            <div className="skeleton-value"></div>
          </div>
        </div>
        <div className="progress-bar skeleton"></div>
        <div className="rollover-info skeleton"></div>
        <div className="daily-budget skeleton"></div>
      </div>

      <div className="budget-list skeleton">
        <div className="section-header skeleton">
          <div className="skeleton-title"></div>
          <div className="skeleton-filters"></div>
        </div>

        {[1, 2, 3].map(i => (
          <div key={i} className="budget-item skeleton">
            <div className="budget-category skeleton">
              <div className="category-icon skeleton"></div>
              <div className="category-name skeleton"></div>
            </div>
            <div className="budget-details skeleton">
              <div className="budget-amounts skeleton"></div>
              <div className="budget-progress skeleton"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
