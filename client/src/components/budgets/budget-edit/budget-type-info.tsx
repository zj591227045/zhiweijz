'use client';

import { BudgetType } from '@/store/budget-edit-store';

interface BudgetTypeInfoProps {
  type: BudgetType;
}

export function BudgetTypeInfo({ type }: BudgetTypeInfoProps) {
  return (
    <>
      {/* 预算类型信息 */}
      <div className="budget-type-info">
        <div className="type-icon">
          <i className={`fas ${type === 'PERSONAL' ? 'fa-wallet' : 'fa-chart-line'}`}></i>
        </div>
        <div className="type-info">
          <div className="type-name">{type === 'PERSONAL' ? '个人预算' : '通用预算'}</div>
          <div className="type-description">
            {type === 'PERSONAL'
              ? '每月自动刷新的个人预算，用于管理日常支出。'
              : '创建长期或无期限的预算，适用于特定目标或项目。'
            }
          </div>
        </div>
      </div>
    </>
  );
}
