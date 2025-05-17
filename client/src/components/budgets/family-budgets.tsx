'use client';

import { useRouter } from 'next/navigation';
import { useBudgetStore } from '@/store/budget-store';
import { BudgetCard } from './budget-card';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetService } from '@/lib/api/budget-service';
import { toast } from 'sonner';

export function FamilyBudgets() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    familyMembers,
    familyBudgets,
    expandedFamilyMembers,
    toggleFamilyMemberExpanded,
    activeFilter
  } = useBudgetStore();

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

  // 如果没有家庭成员或家庭预算，不显示此区块
  if (!familyMembers.length || !Object.keys(familyBudgets).length) {
    return null;
  }

  return (
    <section className="family-budgets">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">家庭成员预算</h2>
        <div className="view-options">
          <button className="view-option active">
            全部
          </button>
          <button className="view-option">
            超支
          </button>
        </div>
      </div>

      <div className="budget-list">
        {familyMembers.map(member => {
          const memberBudgets = familyBudgets[member.id] || [];

          // 根据筛选条件过滤预算
          const filteredBudgets = memberBudgets.filter(budget => {
            if (activeFilter === 'overspent') {
              return budget.isOverspent;
            }
            if (activeFilter === 'rollover') {
              return budget.rollover && budget.rolloverAmount !== 0;
            }
            return true;
          });

          // 如果该成员没有符合条件的预算，不显示
          if (filteredBudgets.length === 0) {
            return null;
          }

          const isExpanded = expandedFamilyMembers[member.id] || false;

          return (
            <div
              key={member.id}
              className="family-member-section"
            >
              <div
                className="family-member-header"
                onClick={() => toggleFamilyMemberExpanded(member.id)}
              >
                <div className="family-member-info">
                  <div className="member-icon">
                    <i className="fas fa-user"></i>
                  </div>
                  <span className="font-medium">{member.name}</span>
                </div>
                <button className="toggle-button">
                  <i className={`fas fa-chevron-${isExpanded ? 'down' : 'right'}`}></i>
                </button>
              </div>

              {isExpanded && (
                <div className="family-member-budgets">
                  {filteredBudgets.map(budget => (
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
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
