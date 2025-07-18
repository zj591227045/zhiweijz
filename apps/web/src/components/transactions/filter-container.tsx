import React, { useState } from 'react';
import { BudgetFilter } from './budget-filter';
import './filter-container.css';

interface FilterContainerProps {
  // 筛选器状态
  filters: {
    startDate: string;
    endDate: string;
    transactionType: string;
    categoryIds: string[];
    accountBookId: string;
    budgetId?: string;
  };
  
  // 筛选器选项
  filterOptions: {
    budgets: any[];
  };

  // 事件处理
  onFilterChange: (key: string, value: any) => void;
  onResetFilters: () => void;
  
  // 显示控制
  isOpen: boolean;
  onToggle: () => void;
  
  // 其他属性
  className?: string;
  budgetId?: string; // 来自URL参数的预算ID
}

export function FilterContainer({
  filters,
  filterOptions,
  onFilterChange,
  onResetFilters,
  isOpen,
  onToggle,
  className = '',
  budgetId
}: FilterContainerProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 切换收起/展开状态
  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  // 处理预算筛选变化
  const handleBudgetChange = (selectedBudgetId: string | null) => {
    onFilterChange('budgetId', selectedBudgetId);
  };

  // 检查是否有活跃的筛选条件
  const hasActiveFilters = () => {
    return (
      filters.startDate ||
      filters.endDate ||
      filters.transactionType !== 'ALL' ||
      filters.categoryIds.length > 0 ||
      filters.budgetId ||
      budgetId
    );
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`filter-container ${className}`}>
      {/* 筛选器头部 */}
      <div className="filter-container-header">
        <div className="filter-container-title">
          <h3>
            <i className="fas fa-filter"></i>
            筛选条件
            {hasActiveFilters() && (
              <span className="active-filters-indicator">
                <i className="fas fa-circle"></i>
              </span>
            )}
          </h3>
        </div>
        
        <div className="filter-container-actions">
          <button
            onClick={toggleCollapse}
            className="collapse-button"
            title={isCollapsed ? '展开筛选器' : '收起筛选器'}
          >
            <i className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
          </button>
          
          <button onClick={onResetFilters} className="reset-button">
            <i className="fas fa-undo"></i>
            重置
          </button>
          
          <button onClick={onToggle} className="close-button">
            <i className="fas fa-times"></i>
            关闭
          </button>
        </div>
      </div>

      {/* 筛选器内容 */}
      {!isCollapsed && (
        <div className="filter-container-content">
          {/* 时间范围筛选 */}
          <div className="filter-section">
            <h4><i className="fas fa-calendar-alt"></i> 时间范围</h4>
            <div className="date-range">
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => onFilterChange('startDate', e.target.value)}
                className="date-input"
                placeholder="开始日期"
              />
              <span>至</span>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => onFilterChange('endDate', e.target.value)}
                className="date-input"
                placeholder="结束日期"
              />
            </div>
          </div>

          {/* 预算筛选 */}
          <div className="filter-section">
            <h4><i className="fas fa-wallet"></i> 预算筛选</h4>
            <BudgetFilter
              selectedBudgetId={filters.budgetId || budgetId}
              onBudgetChange={handleBudgetChange}
              startDate={filters.startDate}
              endDate={filters.endDate}
              className="budget-filter-in-container"
            />
          </div>

          {/* 交易类型筛选 */}
          <div className="filter-section">
            <h4><i className="fas fa-exchange-alt"></i> 交易类型</h4>
            <div className="transaction-type-filter">
              <label>
                <input
                  type="radio"
                  name="transactionType"
                  value="ALL"
                  checked={filters.transactionType === 'ALL'}
                  onChange={(e) => onFilterChange('transactionType', e.target.value)}
                />
                <span>全部</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="transactionType"
                  value="INCOME"
                  checked={filters.transactionType === 'INCOME'}
                  onChange={(e) => onFilterChange('transactionType', e.target.value)}
                />
                <span>收入</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="transactionType"
                  value="EXPENSE"
                  checked={filters.transactionType === 'EXPENSE'}
                  onChange={(e) => onFilterChange('transactionType', e.target.value)}
                />
                <span>支出</span>
              </label>
            </div>
          </div>

          {/* 当前预算信息（如果来自URL参数） */}
          {budgetId && (
            <div className="filter-section">
              <h4><i className="fas fa-info-circle"></i> 当前预算</h4>
              <div className="current-budget-info">
                {filterOptions.budgets.find((budget: any) => budget.id === budgetId)?.name ||
                  '未知预算'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
