"use client";

import { BudgetForm } from "@/components/budgets/budget-form";
import "./budget-form.css";

export default function NewBudgetPage() {
  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      <header className="header">
        <button className="icon-button back-button" onClick={() => window.history.back()}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="header-title">添加预算</div>
        <div></div> {/* 占位，保持标题居中 */}
      </header>

      {/* 主要内容区域 */}
      <main className="main-content">
        <BudgetForm mode="create" />
      </main>
    </div>
  );
}
