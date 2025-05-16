"use client";

import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface BudgetCategory {
  id: string;
  name: string;
  icon?: string;
  budget: number;
  spent: number;
  percentage: number;
}

interface BudgetProgressProps {
  categories: BudgetCategory[];
}

export function BudgetProgress({ categories }: BudgetProgressProps) {
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

  return (
    <section className="budget-progress flex flex-col gap-3">
      <div className="section-header flex justify-between items-center mb-3">
        <h2 className="text-base font-semibold">预算执行情况</h2>
        <Link href="/budgets" className="view-all text-blue-600 text-sm">查看全部</Link>
      </div>

      {categories.length > 0 ? (
        categories.map((category) => (
          <div key={category.id} className="budget-card bg-white rounded-lg p-4 shadow-sm">
            <div className="budget-info flex justify-between items-center mb-2">
              <div className="budget-category flex items-center gap-2">
                <div className="category-icon w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                  <i className={`fas ${getIconClass(category.icon || 'other')}`}></i>
                </div>
                <span>{category.name}</span>
              </div>
              <div className="budget-amount text-sm">
                <span className="current font-semibold">{formatCurrency(category.spent)}</span>
                <span className="separator text-gray-500 mx-0.5">/</span>
                <span className="total text-gray-500">{formatCurrency(category.budget)}</span>
              </div>
            </div>
            <div className={`progress-bar h-2 bg-gray-200 rounded-full overflow-hidden ${category.percentage > 100 ? 'warning' : ''}`}>
              <div
                className={`progress h-full ${category.percentage > 100 ? 'bg-amber-500' : 'bg-blue-600'}`}
                style={{ width: `${Math.min(category.percentage, 100)}%` }}
              ></div>
            </div>
          </div>
        ))
      ) : (
        <div className="budget-card bg-white rounded-lg p-4 shadow-sm text-center text-gray-500">
          暂无预算数据
        </div>
      )}
    </section>
  );
}
