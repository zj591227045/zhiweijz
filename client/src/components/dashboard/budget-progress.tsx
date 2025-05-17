"use client";

import Link from "next/link";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface BudgetCategory {
  id: string;
  name: string;
  icon?: string;
  budget: number;
  spent: number;
  percentage: number;
  period?: string; // 添加预算周期字段
}

interface BudgetProgressProps {
  categories: BudgetCategory[];
}

export function BudgetProgress({ categories }: BudgetProgressProps) {
  // 状态控制折叠/展开
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 获取图标类名
  const getIconClass = (iconName: string) => {
    // 这里可以根据后端返回的图标名称映射到Font Awesome图标
    const iconMap: Record<string, string> = {
      food: "fa-utensils",
      shopping: "fa-shopping-bag",
      transport: "fa-bus",
      entertainment: "fa-film",
      home: "fa-home",
      health: "fa-heartbeat",
      education: "fa-graduation-cap",
      travel: "fa-plane",
      other: "fa-ellipsis-h",
    };

    return iconMap[iconName] || "fa-tag";
  };

  // 按优先级排序并限制显示数量
  const prioritizeCategories = (cats: BudgetCategory[]) => {
    // 复制数组以避免修改原始数据
    const sortedCats = [...cats];

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
        // 个人月度预算最高优先级
        if (cat.period === "MONTHLY" &&
            !cat.name.includes("家庭") &&
            !cat.name.includes("family")) return 1;
        // 家庭预算第二优先级
        if (cat.name.includes("家庭") || cat.name.includes("family")) return 2;
        // 年度预算第三优先级
        if (cat.period === "YEARLY") return 3;
        // 其他预算最低优先级
        return 4;
      };

      return getPriority(a) - getPriority(b);
    });

    // 最多显示3个
    return filteredCats.slice(0, 3);
  };

  // 获取要显示的预算类别
  const displayCategories = prioritizeCategories(categories);

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
          <Link href="/budgets" className="view-all">
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
                      <i className={`fas ${getIconClass(category.icon || 'other')}`}></i>
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
}
