"use client";

import Link from "next/link";
import { useState, memo, useMemo } from "react";
import { formatCurrency, getCategoryIconClass } from "../../lib/utils";

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
export const BudgetProgress = memo(function BudgetProgress({ categories, totalBudget }: BudgetProgressProps) {
  // 状态控制折叠/展开
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 按优先级排序并限制显示数量
  const prioritizeCategories = (cats: BudgetCategory[]) => {
    // 复制数组以避免修改原始数据
    const sortedCats = [...cats];

    // 首先检查是否有总预算（没有分类ID的预算）
    const totalBudget = sortedCats.find(cat =>
      cat.name.includes("总预算") ||
      cat.name.includes("月度预算") ||
      cat.name === "预算" ||
      cat.id === "total"
    );

    // 如果找到总预算，优先显示
    if (totalBudget) {
      return [totalBudget];
    }

    // 过滤掉名称为"未知"或"other"的分类，除非没有其他分类
    let filteredCats = sortedCats.filter(cat =>
      !cat.name.includes("未知") &&
      !cat.name.includes("other") &&
      cat.name !== "未知分类"
    );

    // 如果过滤后没有分类，则使用原始数组
    if (filteredCats.length === 0) {
      filteredCats = sortedCats;
    }

    // 按优先级排序：个人月度预算 > 家庭预算 > 年度预算 > 其他
    filteredCats.sort((a, b) => {
      const getPriority = (cat: BudgetCategory) => {
        // 总预算最高优先级
        if (!cat.categoryId || cat.name.includes("总预算") || cat.name.includes("月度预算")) return 0;
        // 个人月度预算次高优先级
        if (cat.period === "MONTHLY" &&
            !cat.name.includes("家庭") &&
            !cat.name.includes("family")) return 1;
        // 家庭预算第三优先级
        if (cat.name.includes("家庭") || cat.name.includes("family")) return 2;
        // 年度预算第四优先级
        if (cat.period === "YEARLY") return 3;
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

    if (totalBudget && !processedCats.find(cat =>
        cat.name.includes("总预算") ||
        cat.name.includes("月度预算") ||
        cat.name === "预算" ||
        cat.id === "total")) {
      processedCats.unshift({
        id: "total",
        name: "个人预算",
        icon: "money-bill",
        budget: totalBudget.amount,
        spent: totalBudget.spent,
        percentage: totalBudget.percentage,
        period: "MONTHLY"
      });
    }

    // 获取要显示的预算类别
    return prioritizeCategories(processedCats);
  }, [categories, totalBudget]);

  return (
    <section className="budget-progress dashboard-budget-progress">
      <div className="section-header">
        <div className="flex items-center">
          <h2>预算执行情况</h2>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="ml-2 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-primary hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            aria-label={isCollapsed ? "展开预算" : "折叠预算"}
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
                  <div className={`budget-amount dashboard-budget-amount ${category.percentage > 100 ? 'text-red-500' : ''}`}>
                    <span className="current">{formatCurrency(category.spent)}</span>
                    <span className="separator dashboard-separator">/</span>
                    <span className="total">{formatCurrency(category.budget)}</span>
                  </div>
                </div>
                <div className={`progress-bar dashboard-progress-bar ${category.percentage > 100 ? 'border-red-500' : ''}`}>
                  <div
                    className={`progress dashboard-progress ${
                      category.percentage > 100
                        ? 'bg-red-500'
                        : category.percentage > 80
                        ? 'bg-orange-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(category.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <div className="budget-card dashboard-budget-card text-center">
              暂无预算数据
            </div>
          )}
        </div>
      )}
    </section>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，只有当属性真正变化时才重新渲染
  if (prevProps.categories.length !== nextProps.categories.length) return false;

  // 检查totalBudget是否变化
  if (!!prevProps.totalBudget !== !!nextProps.totalBudget) return false;
  if (prevProps.totalBudget && nextProps.totalBudget) {
    if (prevProps.totalBudget.amount !== nextProps.totalBudget.amount ||
        prevProps.totalBudget.spent !== nextProps.totalBudget.spent ||
        prevProps.totalBudget.percentage !== nextProps.totalBudget.percentage) {
      return false;
    }
  }

  // 检查categories数组内容是否变化
  for (let i = 0; i < prevProps.categories.length; i++) {
    const prevCat = prevProps.categories[i];
    const nextCat = nextProps.categories[i];
    if (prevCat.id !== nextCat.id ||
        prevCat.budget !== nextCat.budget ||
        prevCat.spent !== nextCat.spent ||
        prevCat.percentage !== nextCat.percentage) {
      return false;
    }
  }

  return true;
});
