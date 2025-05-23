'use client';

import { useState } from 'react';
import { DailyStatistics } from '@/types';

interface TrendChartProps {
  dailyStatistics: DailyStatistics[];
}

export function TrendChart({ dailyStatistics }: TrendChartProps) {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  
  // 根据选择的周期处理数据
  const processData = () => {
    if (!dailyStatistics || dailyStatistics.length === 0) {
      return [];
    }
    
    // 对于日视图，直接返回原始数据
    if (period === 'day') {
      return dailyStatistics;
    }
    
    // 对于周视图或月视图，需要聚合数据
    // 这里只是一个简化的示例，实际应用中应该更复杂
    if (period === 'week') {
      // 按周聚合
      const weeklyData: Record<string, { income: number; expense: number }> = {};
      
      dailyStatistics.forEach(day => {
        const date = new Date(day.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // 设置为周日
        
        const weekKey = weekStart.toISOString().split('T')[0];
        
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { income: 0, expense: 0 };
        }
        
        weeklyData[weekKey].income += day.income;
        weeklyData[weekKey].expense += day.expense;
      });
      
      return Object.entries(weeklyData).map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense
      }));
    }
    
    // 按月聚合
    if (period === 'month') {
      const monthlyData: Record<string, { income: number; expense: number }> = {};
      
      dailyStatistics.forEach(day => {
        const monthKey = day.date.substring(0, 7); // YYYY-MM
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { income: 0, expense: 0 };
        }
        
        monthlyData[monthKey].income += day.income;
        monthlyData[monthKey].expense += day.expense;
      });
      
      return Object.entries(monthlyData).map(([date, data]) => ({
        date,
        income: data.income,
        expense: data.expense
      }));
    }
    
    return [];
  };
  
  const chartData = processData();

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2 className="chart-title">收支趋势</h2>
        <div className="chart-actions">
          <button
            className={`chart-action ${period === 'day' ? 'active' : ''}`}
            onClick={() => setPeriod('day')}
          >
            日
          </button>
          <button
            className={`chart-action ${period === 'week' ? 'active' : ''}`}
            onClick={() => setPeriod('week')}
          >
            周
          </button>
          <button
            className={`chart-action ${period === 'month' ? 'active' : ''}`}
            onClick={() => setPeriod('month')}
          >
            月
          </button>
        </div>
      </div>
      
      <div className="chart-container">
        {/* 这里应该渲染实际的图表，例如使用Chart.js或Recharts */}
        <div className="placeholder-chart">
          {chartData.length === 0 ? (
            <div className="empty-chart">
              <p>暂无趋势数据</p>
            </div>
          ) : (
            <div className="chart-placeholder">
              {/* 图表占位符 */}
              <div className="chart-placeholder-text">
                趋势图将在这里显示
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="chart-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#22C55E' }}></div>
          <span>收入</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#EF4444' }}></div>
          <span>支出</span>
        </div>
      </div>
    </div>
  );
}
