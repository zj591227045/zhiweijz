"use client";

import { Category } from "@/types";
import { cn } from "@/lib/utils";

interface CategoryItemProps {
  category: Category;
  isActive: boolean;
  onClick: () => void;
}

export function CategoryItem({ category, isActive, onClick }: CategoryItemProps) {
  // 获取图标类名
  const getIconClass = (iconName: string | undefined) => {
    if (!iconName) return "fas fa-question";
    
    // 如果图标名称已经包含完整的类名，则直接返回
    if (iconName.startsWith("fa-")) {
      return `fas ${iconName}`;
    }
    
    // 根据图标名称映射到Font Awesome图标
    const iconMap: Record<string, string> = {
      restaurant: "fa-utensils",
      shopping: "fa-shopping-bag",
      transport: "fa-bus",
      home: "fa-home",
      clothing: "fa-tshirt",
      entertainment: "fa-gamepad",
      medical: "fa-heartbeat",
      education: "fa-graduation-cap",
      gift: "fa-gift",
      travel: "fa-plane",
      communication: "fa-mobile-alt",
      daily: "fa-shopping-basket",
      sports: "fa-running",
      beauty: "fa-spa",
      child: "fa-baby",
      elder: "fa-user-friends",
      social: "fa-users",
      digital: "fa-laptop",
      car: "fa-car",
      repayment: "fa-hand-holding-usd",
      insurance: "fa-shield-alt",
      office: "fa-briefcase",
      repair: "fa-tools",
      interest: "fa-percentage",
      salary: "fa-money-bill-wave",
      "part-time": "fa-coins",
      investment: "fa-chart-line",
      bonus: "fa-gift",
      commission: "fa-hand-holding-usd",
      other: "fa-ellipsis-h",
    };
    
    return `fas ${iconMap[iconName] || "fa-question"}`;
  };

  return (
    <div
      className={cn("category-item", isActive && "active")}
      onClick={onClick}
    >
      <div className="category-icon-wrapper">
        <i className={getIconClass(category.icon)}></i>
      </div>
      <span>{category.name}</span>
    </div>
  );
}
