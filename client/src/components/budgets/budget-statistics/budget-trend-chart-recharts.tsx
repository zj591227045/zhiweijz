import React, { useState, useEffect } from 'react';
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
  const [chartHeight, setChartHeight] = useState(180);

  // 根据窗口宽度设置图表高度
  useEffect(() => {
    const handleResize = () => {
      setChartHeight(window.innerWidth <= 480 ? 150 : 180);
    };

    // 初始设置
    handleResize();

    // 监听窗口大小变化
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  // 显示加载状态
  if (isLoading) {
    return (
      <section className="budget-trends">
        <div className="section-header">
          <h2>预算趋势</h2>
        </div>
        <div className="chart-container">
          <div className="loading-indicator" style={{ height: chartHeight }}>加载中...</div>
        </div>
      </section>
    );
  }

  return (
    <section className="budget-trends">
      <div className="section-header">
        <h2>预算趋势</h2>

        <div className="time-range-selector">
          <button
            className={`time-option ${timeRange === '6months' ? 'active' : ''}`}
            onClick={() => onTimeRangeChange && onTimeRangeChange('6months')}
          >
            6月
          </button>
          <button
            className={`time-option ${timeRange === '12months' ? 'active' : ''}`}
            onClick={() => onTimeRangeChange && onTimeRangeChange('12months')}
          >
            12月
          </button>
        </div>
      </div>

      <div className="chart-options">
        {onRolloverImpactToggle && (
          <button
            className={`rollover-toggle ${showRolloverImpact ? 'active' : ''}`}
            onClick={onRolloverImpactToggle}
          >
            <span>{showRolloverImpact ? '原始支出' : '含结转支出'}</span>
          </button>
        )}
      </div>

      <div className="chart-container">
        <div style={{ width: '100%', height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{
                top: 5,
                right: 0,
                left: -15, // 减少左侧边距，让图表更宽
                bottom: 0,
              }}
              barGap={0}
              barSize={timeRange === '6months' ? 16 : 10}
              className="budget-trend-chart"
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-color)"
                vertical={false}
                horizontalPoints={[40, 80, 120, 160]} // 减少网格线数量
              />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-color-secondary)', fontSize: 9 }}
                tickMargin={5}
                axisLine={{ stroke: 'var(--border-color)' }}
                height={20} // 减少X轴高度
                tickSize={3} // 减少刻度大小
                interval="preserveStartEnd" // 只显示首尾和部分中间刻度
              />
              <YAxis
                tickFormatter={(value) => `${value}`}
                tick={{ fill: 'var(--text-color-secondary)', fontSize: 9 }}
                axisLine={{ stroke: 'var(--border-color)' }}
                tickSize={3} // 减少刻度大小
                width={25} // 减少Y轴宽度
                tickCount={4} // 减少Y轴刻度数量
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--card-bg)',
                  borderColor: 'var(--border-color)',
                  borderRadius: 'var(--border-radius, 4px)',
                  color: 'var(--text-color)',
                  padding: '6px',
                  fontSize: '12px'
                }}
                formatter={(value, name) => {
                  if (name === 'total') {
                    return [`¥${value}`, '总支出(含结转)'];
                  }
                  return [`¥${value}`, '支出'];
                }}
                labelFormatter={(label) => `日期: ${label}`}
                cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
              />
              {showRolloverImpact ? (
                <Bar
                  dataKey="total"
                  name="总支出(含结转)"
                  fill="var(--primary-color)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={30} // 限制最大柱宽
                />
              ) : (
                <Bar
                  dataKey="amount"
                  name="支出"
                  fill="var(--primary-color)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={30} // 限制最大柱宽
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