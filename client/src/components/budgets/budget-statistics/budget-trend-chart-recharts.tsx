import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import './budget-trend-chart.css';

interface BudgetTrendChartProps {
  data: Array<{
    date: string;
    amount: number;
    rolloverAmount?: number;
    total?: number;
  }>;
  showRolloverImpact?: boolean;
  viewMode?: 'daily' | 'weekly' | 'monthly';
  timeRange?: '6months' | '12months';
  isLoading?: boolean;
  onViewModeChange?: (mode: 'daily' | 'weekly' | 'monthly') => void;
  onTimeRangeChange?: (range: '6months' | '12months') => void;
  onRolloverImpactToggle?: () => void;
}

const BudgetTrendChart: React.FC<BudgetTrendChartProps> = ({
  data,
  showRolloverImpact = true,
  timeRange = '6months',
  isLoading = false,
  onTimeRangeChange,
  onRolloverImpactToggle
}) => {
  // 显示加载状态
  if (isLoading) {
    return (
      <section className="budget-trends">
        <div className="section-header">
          <h2>预算趋势</h2>
        </div>
        <div className="chart-container">
          <div className="loading-indicator">加载中...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="budget-trends">
      <div className="section-header">
        <h2>预算趋势</h2>
      </div>

      <div className="chart-options">
        <div className="time-range-selector">
          <button
            className={`time-option ${timeRange === '6months' ? 'active' : ''}`}
            onClick={() => onTimeRangeChange && onTimeRangeChange('6months')}
          >
            最近6个月
          </button>
          <button
            className={`time-option ${timeRange === '12months' ? 'active' : ''}`}
            onClick={() => onTimeRangeChange && onTimeRangeChange('12months')}
          >
            最近12个月
          </button>
        </div>

        {onRolloverImpactToggle && (
          <button
            className={`rollover-toggle ${showRolloverImpact ? 'active' : ''}`}
            onClick={onRolloverImpactToggle}
          >
            <span>{showRolloverImpact ? '显示原始支出' : '显示含结转支出'}</span>
          </button>
        )}
      </div>

      <div className="chart-container">
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 10,
                right: 5,
                left: 0,
                bottom: 10,
              }}
              barGap={0}
              barSize={timeRange === '6months' ? 20 : 12}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-color-secondary)', fontSize: 10 }}
                tickMargin={8}
                axisLine={{ stroke: 'var(--border-color)' }}
              />
              <YAxis
                tickFormatter={(value) => `${value}`}
                tick={{ fill: 'var(--text-color-secondary)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--border-color)' }}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  borderRadius: 'var(--border-radius, 4px)',
                  color: 'var(--text-color)'
                }}
                formatter={(value, name) => {
                  if (name === 'total') {
                    return [`¥${value}`, '总支出(含结转)'];
                  }
                  return [`¥${value}`, '支出'];
                }}
                labelFormatter={(label) => `日期: ${label}`}
              />
              {showRolloverImpact ? (
                <Bar
                  dataKey="total"
                  name="总支出(含结转)"
                  fill="var(--primary-color)"
                  radius={[4, 4, 0, 0]}
                />
              ) : (
                <Bar
                  dataKey="amount"
                  name="支出"
                  fill="var(--primary-color)"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};

export default BudgetTrendChart;