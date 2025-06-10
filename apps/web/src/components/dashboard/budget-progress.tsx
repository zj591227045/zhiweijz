'use client';

import Link from 'next/link';
import { useState, memo, useMemo } from 'react';
import { formatCurrency, getCategoryIconClass } from '../../lib/utils';
import './budget-progress.css';

interface BudgetCategory {
  id: string;
  name: string;
  icon?: string;
  budget: number;
  spent: number;
  percentage: number;
  period?: string; // 添加预算周期字段
  categoryId?: string; // 添加分类ID字段，用于区分总预算和分类预算
}

interface BudgetProgressProps {
  categories: BudgetCategory[];
  totalBudget?: {
    amount: number;
    spent: number;
    percentage: number;
  };
}

// 使用React.memo优化渲染性能
export const BudgetProgress = memo(
  function BudgetProgress({ categories, totalBudget }: BudgetProgressProps) {
    // 状态控制折叠/展开
    const [isCollapsed, setIsCollapsed] = useState(false);

    // 按优先级排序并限制显示数量
    const prioritizeCategories = (cats: BudgetCategory[]) => {
      // 复制数组以避免修改原始数据
      const sortedCats = [...cats];

      // 首先检查是否有总预算（没有分类ID的预算）
      const totalBudgetItem = sortedCats.find(
        (cat) =>
          cat.name.includes('总预算') ||
          cat.name.includes('月度预算') ||
          cat.name === '预算' ||
          cat.id === 'total',
      );

      // 如果找到总预算，优先显示
      if (totalBudgetItem) {
        return [totalBudgetItem];
      }

      // 过滤掉名称为"未知"或"other"的分类，除非没有其他分类
      let filteredCats = sortedCats.filter(
        (cat) =>
          !cat.name.includes('未知') && !cat.name.includes('other') && cat.name !== '未知分类',
      );

      // 如果过滤后没有分类，则使用原始数组
      if (filteredCats.length === 0) {
        filteredCats = sortedCats;
      }

      // 按优先级排序：个人月度预算 > 家庭预算 > 年度预算 > 其他
      filteredCats.sort((a, b) => {
        const getPriority = (cat: BudgetCategory) => {
          // 总预算最高优先级
          if (!cat.categoryId || cat.name.includes('总预算') || cat.name.includes('月度预算'))
            return 0;
          // 个人月度预算次高优先级
          if (
            cat.period === 'MONTHLY' &&
            !cat.name.includes('家庭') &&
            !cat.name.includes('family')
          )
            return 1;
          // 家庭预算第三优先级
          if (cat.name.includes('家庭') || cat.name.includes('family')) return 2;
          // 年度预算第四优先级
          if (cat.period === 'YEARLY') return 3;
          // 其他预算最低优先级
          return 4;
        };

        return getPriority(a) - getPriority(b);
      });

      // 最多显示3个
      return filteredCats.slice(0, 3);
    };

    // 使用useMemo优化计算，避免不必要的重新计算
    const displayCategories = useMemo(() => {
      // 如果有总预算信息但分类列表中没有总预算，添加一个总预算项
      const processedCats = [...categories];

      if (
        totalBudget &&
        !processedCats.find(
          (cat) =>
            cat.name.includes('总预算') ||
            cat.name.includes('月度预算') ||
            cat.name === '预算' ||
            cat.id === 'total',
        )
      ) {
        processedCats.unshift({
          id: 'total',
          name: '个人预算',
          icon: 'money-bill',
          budget: totalBudget.amount, // 这里已经是包含结转金额的总可用预算
          spent: totalBudget.spent,
          percentage: totalBudget.percentage, // 直接使用后端计算的百分比
          period: 'MONTHLY',
        });
      }

      // 获取要显示的预算类别
      return prioritizeCategories(processedCats);
    }, [categories, totalBudget]);

    return (
      <section className="dashboard-budget-section">
        <div className="section-header">
          <div className="flex items-center">
            <h2>预算执行情况</h2>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="ml-2 w-6 h-6 flex items-center justify-center rounded-full transition-colors"
              style={{
                backgroundColor: 'var(--background-color)',
                color: 'var(--primary-color)',
                border: '1px solid var(--border-color)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--hover-background)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--background-color)';
              }}
              aria-label={isCollapsed ? '展开预算' : '折叠预算'}
            >
              <i className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'} text-xs`}></i>
            </button>
          </div>
          <div className="flex items-center">
            <Link href="/budgets/list" className="view-all">
              查看全部
            </Link>
          </div>
        </div>

        {!isCollapsed && (
          <div className="budget-content">
            {displayCategories.length > 0 ? (
              displayCategories.map((category) => (
                <div key={category.id} className="budget-card dashboard-budget-card">
                  <div className="budget-info">
                    <div className="budget-category dashboard-budget-category">
                      <div className="category-icon dashboard-category-icon">
                        <i className={`fas ${getCategoryIconClass(category.icon || 'other')}`}></i>
                      </div>
                      <span className="dashboard-category-name">{category.name}</span>
                    </div>
                    <div className="budget-amount dashboard-budget-amount">
                      {/* 显示百分比 */}
                      <div
                        className="percentage-display"
                        style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color:
                            category.percentage > 100
                              ? 'var(--error-color)'
                              : category.percentage > 80
                                ? 'var(--warning-color)'
                                : 'var(--primary-color)',
                          marginBottom: '2px',
                        }}
                      >
                        {category.percentage.toFixed(1)}%
                      </div>
                      {/* 显示金额，字体更小，不换行 */}
                      <div
                        className="amount-display"
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        <span className="current">{formatCurrency(category.spent)}</span>
                        <span className="separator" style={{ margin: '0 2px' }}>
                          /
                        </span>
                        <span className="total">{formatCurrency(category.budget)}</span>
                      </div>
                    </div>
                  </div>
                  <div
                    className="dashboard-progress-bar-custom"
                    style={{
                      height: '8px',
                      backgroundColor: '#e5e7eb', // 明显的灰色背景
                      border: `1px solid ${category.percentage > 100 ? 'var(--error-color)' : '#d1d5db'}`,
                      borderRadius: '4px',
                      overflow: 'hidden',
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    <div
                      className="dashboard-progress-custom"
                      style={{
                        height: '100%',
                        width: `${Math.min(category.percentage, 100)}%`,
                        backgroundColor:
                          category.percentage > 100
                            ? 'var(--error-color)'
                            : category.percentage > 80
                              ? 'var(--warning-color)'
                              : 'var(--primary-color)',
                        borderRadius: '3px',
                        transition: 'width 0.3s ease',
                      }}
                    ></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="budget-card dashboard-budget-card text-center">暂无预算数据</div>
            )}
          </div>
        )}
      </section>
    );
  },
  (prevProps, nextProps) => {
    // 自定义比较函数，只有当属性真正变化时才重新渲染
    if (prevProps.categories.length !== nextProps.categories.length) return false;

    // 检查totalBudget是否变化
    if (!!prevProps.totalBudget !== !!nextProps.totalBudget) return false;
    if (prevProps.totalBudget && nextProps.totalBudget) {
      if (
        prevProps.totalBudget.amount !== nextProps.totalBudget.amount ||
        prevProps.totalBudget.spent !== nextProps.totalBudget.spent ||
        prevProps.totalBudget.percentage !== nextProps.totalBudget.percentage
      ) {
        return false;
      }
    }

    // 检查categories数组内容是否变化
    for (let i = 0; i < prevProps.categories.length; i++) {
      const prevCat = prevProps.categories[i];
      const nextCat = nextProps.categories[i];
      if (
        prevCat.id !== nextCat.id ||
        prevCat.budget !== nextCat.budget ||
        prevCat.spent !== nextCat.spent ||
        prevCat.percentage !== nextCat.percentage
      ) {
        return false;
      }
    }

    return true;
  },
);
