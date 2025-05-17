'use client';

import { useRouter } from 'next/navigation';
import { useBudgetStore } from '@/store/budget-store';
import { formatCurrency } from '@/lib/utils';
import { BudgetCard } from './budget-card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '@/lib/api/budget-service';
import { toast } from 'sonner';

export function CategoryBudgets() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { budgets, activeFilter, setActiveFilter } = useBudgetStore();

  // 添加调试日志
  console.log('CategoryBudgets 组件渲染 - 预算数据:', budgets);
  console.log('CategoryBudgets 组件渲染 - 当前过滤器:', activeFilter);

  // 删除预算的mutation
  const deleteMutation = useMutation({
    mutationFn: (budgetId: string) => budgetService.deleteBudget(budgetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast.success('预算已删除');
    },
    onError: () => {
      toast.error('删除预算失败');
    },
  });

  // 处理预算点击
  const handleBudgetPress = (budgetId: string) => {
    router.push(`/budgets/${budgetId}`);
  };

  // 处理预算长按
  const handleBudgetLongPress = (budgetId: string) => {
    // 在移动端实现长按可能需要额外的库或自定义hook
    // 这里简化为右键菜单
  };

  // 处理编辑预算
  const handleEditBudget = (budgetId: string) => {
    router.push(`/budgets/${budgetId}/edit`);
  };

  // 处理删除预算
  const handleDeleteBudget = (budgetId: string) => {
    if (confirm('确定要删除这个预算吗？')) {
      deleteMutation.mutate(budgetId);
    }
  };

  // 筛选预算
  console.log('筛选预算前的原始数据:', budgets);

  // 检查预算数据的完整性
  const validBudgets = budgets.filter(budget => {
    if (!budget || typeof budget !== 'object') {
      console.warn('无效的预算项:', budget);
      return false;
    }

    if (!budget.id) {
      console.warn('预算项缺少ID:', budget);
      return false;
    }

    return true;
  });

  console.log('有效的预算数据:', validBudgets);

  const filteredBudgets = validBudgets.filter(budget => {
    if (activeFilter === 'overspent') {
      return budget.isOverspent;
    }
    if (activeFilter === 'rollover') {
      return budget.rollover && budget.rolloverAmount !== 0;
    }
    return true;
  });

  console.log('筛选预算后的数据:', filteredBudgets);

  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">分类预算</h2>
        <div className="view-options">
          <button
            className={`view-option ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            全部
          </button>
          <button
            className={`view-option ${activeFilter === 'overspent' ? 'active' : ''}`}
            onClick={() => setActiveFilter('overspent')}
          >
            超支
          </button>
          <button
            className={`view-option ${activeFilter === 'rollover' ? 'active' : ''}`}
            onClick={() => setActiveFilter('rollover')}
          >
            结转
          </button>
        </div>
      </div>

      <div className="budget-list">
        {Array.isArray(filteredBudgets) && filteredBudgets.length > 0 ? (
          filteredBudgets.map(budget => (
            <div key={budget.id} className="relative">
              <BudgetCard
                budget={budget}
                onClick={() => handleBudgetPress(budget.id)}
              />
              <div className="absolute top-2 right-2 flex space-x-1">
                <button
                  className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 bg-white dark:bg-gray-800 rounded-full shadow-sm"
                  onClick={() => handleEditBudget(budget.id)}
                >
                  <i className="fas fa-edit text-sm"></i>
                </button>
                <button
                  className="w-8 h-8 flex items-center justify-center text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-white dark:bg-gray-800 rounded-full shadow-sm"
                  onClick={() => handleDeleteBudget(budget.id)}
                >
                  <i className="fas fa-trash-alt text-sm"></i>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="overview-card text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {activeFilter === 'all'
                ? '暂无预算数据'
                : activeFilter === 'overspent'
                ? '暂无超支预算'
                : '暂无结转预算'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {Array.isArray(budgets) ? `原始预算数据: ${budgets.length}条` : '预算数据不是数组'}
            </p>
            <div className="mt-4">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                onClick={() => {
                  console.log('手动刷新预算数据');
                  // 强制刷新预算数据
                  window.location.reload();
                }}
              >
                刷新数据
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
