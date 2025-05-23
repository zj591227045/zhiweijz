'use client';

import { useState } from 'react';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { CategoryStatistics } from '@/types';

interface CategoryDistributionProps {
  expenseCategories: CategoryStatistics[];
  incomeCategories: CategoryStatistics[];
}

export function CategoryDistribution({
  expenseCategories,
  incomeCategories
}: CategoryDistributionProps) {
  const [selectedType, setSelectedType] = useState<'expense' | 'income'>('expense');
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  
  // 获取当前选中类型的分类数据
  const categories = selectedType === 'expense' ? expenseCategories : incomeCategories;
  
  // 生成随机颜色（实际应用中应该使用固定的颜色映射）
  const getRandomColor = (index: number) => {
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2 className="chart-title">分类分布</h2>
        <div className="chart-actions">
          <button
            className={`chart-action ${selectedType === 'expense' ? 'active' : ''}`}
            onClick={() => setSelectedType('expense')}
          >
            支出
          </button>
          <button
            className={`chart-action ${selectedType === 'income' ? 'active' : ''}`}
            onClick={() => setSelectedType('income')}
          >
            收入
          </button>
          <button
            className={`chart-action ${chartType === 'pie' ? 'active' : ''}`}
            onClick={() => setChartType('pie')}
          >
            <i className="fas fa-chart-pie"></i>
          </button>
          <button
            className={`chart-action ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
          >
            <i className="fas fa-chart-bar"></i>
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        {/* 这里应该渲染实际的图表，例如使用Chart.js或Recharts */}
        <div className="placeholder-chart">
          {categories.length === 0 ? (
            <div className="empty-chart">
              <p>暂无{selectedType === 'expense' ? '支出' : '收入'}数据</p>
            </div>
          ) : (
            <div className="chart-placeholder">
              {/* 图表占位符 */}
              <div className="chart-placeholder-text">
                {chartType === 'pie' ? '饼图' : '柱状图'}将在这里显示
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="category-list">
        {categories.map((category, index) => (
          <div key={category.categoryId || index} className="category-item">
            <div 
              className="category-icon"
              style={{ backgroundColor: `${getRandomColor(index)}20` }}
            >
              <i 
                className="fas fa-shopping-bag"
                style={{ color: getRandomColor(index) }}
              ></i>
            </div>
            <div className="category-info">
              <div className="category-name">{category.categoryName || '未分类'}</div>
              <div className="category-bar">
                <div 
                  className="category-progress"
                  style={{ 
                    width: `${category.percentage}%`,
                    backgroundColor: getRandomColor(index)
                  }}
                ></div>
              </div>
              <div className="category-details">
                <span>{formatPercentage(category.percentage)}%</span>
                <span>{formatCurrency(category.amount)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
