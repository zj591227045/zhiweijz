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
  onViewModeChange: (mode: 'daily' | 'weekly' | 'monthly') => void;
  onRolloverImpactToggle: () => void;
  isLoading: boolean;
}

export function BudgetTrendChart({
  data,
  showRolloverImpact,
  viewMode,
  onViewModeChange,
  onRolloverImpactToggle,
  isLoading
}: BudgetTrendChartProps) {
  // 图表类型状态
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');

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
          data: data?.map(point => point.total || point.amount) || [],
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
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 11
          },
          color: 'var(--text-secondary)'
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
        <div className="view-options">
          <button
            className={`view-option ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => onViewModeChange('monthly')}
          >
            月
          </button>
        </div>
      </div>

      <div className="chart-actions" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div className="rollover-toggle">
          <span className="rollover-toggle-label">显示结转影响</span>
          <Switch
            checked={showRolloverImpact}
            onCheckedChange={onRolloverImpactToggle}
          />
        </div>

        <div className="chart-type-toggle">
          <button
            className={`view-option ${chartType === 'line' ? 'active' : ''}`}
            onClick={() => setChartType('line')}
            style={{ marginRight: '5px' }}
          >
            <i className="fas fa-chart-line"></i>
          </button>
          <button
            className={`view-option ${chartType === 'bar' ? 'active' : ''}`}
            onClick={() => setChartType('bar')}
          >
            <i className="fas fa-chart-bar"></i>
          </button>
        </div>
      </div>

      <div className="chart-container">
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : data && data.length > 0 ? (
          chartType === 'line' ? (
            <Line data={chartData} options={options} height={200} />
          ) : (
            <Bar data={chartData} options={options} height={200} />
          )
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
