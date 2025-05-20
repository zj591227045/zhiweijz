'use client';

import { useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { Switch } from '@/components/ui/switch';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Skeleton } from '@/components/ui/skeleton';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface TrendPoint {
  date: string;
  amount: number;
  total?: number;
}

interface BudgetTrendChartProps {
  data: TrendPoint[];
  showRolloverImpact: boolean;
  viewMode: 'daily' | 'weekly' | 'monthly';
  timeRange: '6months' | '12months';
  onViewModeChange: (mode: 'daily' | 'weekly' | 'monthly') => void;
  onTimeRangeChange: (range: '6months' | '12months') => void;
  onRolloverImpactToggle: () => void;
  isLoading: boolean;
}

export function BudgetTrendChart({
  data,
  showRolloverImpact,
  viewMode,
  timeRange,
  onViewModeChange,
  onTimeRangeChange,
  onRolloverImpactToggle,
  isLoading
}: BudgetTrendChartProps) {
  // 图表类型状态 - 默认使用柱状图
  const [chartType, setChartType] = useState<'line' | 'bar'>('bar');

  // 图表数据
  const chartData = {
    labels: data?.map(point => point.date) || [],
    datasets: [
      {
        label: '支出',
        data: data?.map(point => point.amount) || [],
        borderColor: 'var(--primary-color)',
        backgroundColor: chartType === 'line'
          ? 'rgba(59, 130, 246, 0.5)'
          : 'rgba(59, 130, 246, 0.7)',
        tension: 0.3,
        borderWidth: 2,
      },
      ...(showRolloverImpact && data?.some(point => point.total !== undefined) ? [
        {
          label: '结转影响',
          data: data?.map(point => point.total) || [],
          borderColor: 'hsl(var(--secondary))',
          backgroundColor: chartType === 'line'
            ? 'rgba(100, 116, 139, 0.5)'
            : 'rgba(100, 116, 139, 0.7)',
          borderDash: chartType === 'line' ? [5, 5] : undefined,
          tension: 0.3,
          borderWidth: 2,
        }
      ] : [])
    ]
  };

  // 图表选项
  const options: ChartOptions<'line' | 'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'start',
        labels: {
          boxWidth: 15,
          padding: 15,
          color: 'var(--text-primary)',
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: 'var(--text-primary)',
        bodyColor: 'var(--text-primary)',
        borderColor: 'var(--border-color)',
        borderWidth: 1,
        padding: 10,
        cornerRadius: 4,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += `¥${context.parsed.y.toLocaleString()}`;
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'var(--border-color)',
        },
        ticks: {
          font: {
            size: 11
          },
          color: 'var(--text-secondary)',
          callback: function(value) {
            return `¥${value}`;
          }
        },
        title: {
          display: true,
          color: 'var(--text-secondary)',
          font: {
            size: 12
          }
        }
      },
      x: {
        grid: {
          display: false,
          color: 'var(--border-color)'
        },
        ticks: {
          font: {
            size: 11
          },
          color: 'var(--text-secondary)'
        },
        title: {
          display: true,
          color: 'var(--text-secondary)',
          font: {
            size: 12
          }
        }
      }
    }
  };

  // 切换图表类型
  const toggleChartType = () => {
    setChartType(prev => prev === 'line' ? 'bar' : 'line');
  };

  return (
    <section className="budget-trends">
      <div className="section-header">
        <h2>预算趋势</h2>
      </div>

      <div className="chart-actions">
        <div className="chart-controls">
          <div className="rollover-toggle">
            <span className="rollover-toggle-label">显示结转影响</span>
            <Switch
              checked={showRolloverImpact}
              onCheckedChange={onRolloverImpactToggle}
            />
          </div>

          <div className="time-range-selector">
            <button
              className={`time-range-option ${timeRange === '6months' ? 'active' : ''}`}
              onClick={() => onTimeRangeChange('6months')}
            >
              最近6个月
            </button>
            <button
              className={`time-range-option ${timeRange === '12months' ? 'active' : ''}`}
              onClick={() => onTimeRangeChange('12months')}
            >
              最近1年
            </button>
          </div>
        </div>
      </div>

      <div className="chart-container">
        {isLoading ? (
          <Skeleton className="h-[250px] w-full" />
        ) : data && data.length > 0 ? (
          // 始终使用柱状图
          <Bar data={chartData} options={options} height={250} />
        ) : (
          <div className="empty-chart">
            <p>暂无趋势数据</p>
          </div>
        )}

        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-color primary"></div>
            <span>支出</span>
          </div>
          {showRolloverImpact && (
            <div className="legend-item">
              <div className="legend-color secondary"></div>
              <span>结转影响</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}