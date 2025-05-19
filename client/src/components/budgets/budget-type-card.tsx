'use client';

export function BudgetTypeCard() {
  return (
    <div className="budget-type-card">
      <div className="type-icon">
        <i className="fas fa-chart-line"></i>
      </div>
      <div className="type-info">
        <div className="type-name">通用预算</div>
        <div className="type-description">创建长期或无期限的预算，适用于特定目标或项目。</div>
      </div>
    </div>
  );
}
