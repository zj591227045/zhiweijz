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
    <section className="budget-progress">
      <div className="section-header">
        <h2>预算执行情况</h2>
        <Link href="/budgets" className="view-all">查看全部</Link>
      </div>

      {categories.length > 0 ? (
        categories.map((category) => (
          <div key={category.id} className="budget-card">
            <div className="budget-info">
              <div className="budget-category">
                <div className="category-icon">
                  <i className={`fas ${getIconClass(category.icon || 'other')}`}></i>
                </div>
                <span>{category.name}</span>
              </div>
              <div className={`budget-amount ${category.percentage > 100 ? 'text-red-500' : ''}`}>
                <span className="current">{formatCurrency(category.spent)}</span>
                <span className="separator">/</span>
                <span className="total">{formatCurrency(category.budget)}</span>
              </div>
            </div>
            <div className={`progress-bar ${category.percentage > 100 ? 'border-red-500' : ''}`}>
              <div
                className={`progress ${
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
        <div className="budget-card text-center">
          暂无预算数据
        </div>
      )}
    </section>
  );
}
