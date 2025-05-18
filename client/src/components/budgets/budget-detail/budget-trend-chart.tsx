'use client';

import { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Switch } from '@/components/ui/switch';
import { TrendPoint } from '@/store/budget-detail-store';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface BudgetTrendChartProps {
  data: TrendPoint[];
  showRolloverImpact: boolean;
  viewMode: 'daily' | 'weekly' | 'monthly';
  onViewModeChange: (mode: 'daily' | 'weekly' | 'monthly') => void;
  onRolloverImpactToggle: () => void;
}

export function BudgetTrendChart({
  data,
  showRolloverImpact,
  viewMode,
  onViewModeChange,
  onRolloverImpactToggle
}: BudgetTrendChartProps) {
  // 图表数据
  const chartData = {
    labels: data?.map(point => point.date) || [],
    datasets: [
      {
        label: '支出',
        data: data?.map(point => point.amount) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
        borderWidth: 2,
      },
      ...(showRolloverImpact && data?.some(point => point.total !== undefined) ? [
        {
          label: '结转影响',
          data: data?.map(point => point.total || point.amount) || [],
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.5)',
          borderDash: [5, 5],
          tension: 0.3,
          borderWidth: 2,
        }
      ] : [])
    ]
  };

  // 图表选项
  const options: ChartOptions<'line'> = {
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
        titleColor: '#1f2937',
        bodyColor: '#1f2937',
        borderColor: '#e5e7eb',
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
          color: '#f3f4f6',
        },
        ticks: {
          font: {
            size: 11
          },
          color: '#6b7280',
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
          color: '#6b7280'
        }
      }
    }
  };

  return (
    <div className="trend-chart-container">
      <h2 className="section-title">预算使用趋势</h2>

      <div className="flex justify-between items-center mb-4">
        <div className="chart-tabs">
          <button
            className={`chart-tab ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => onViewModeChange('daily')}
          >
            日
          </button>
          <button
            className={`chart-tab ${viewMode === 'weekly' ? 'active' : ''}`}
            onClick={() => onViewModeChange('weekly')}
          >
            周
          </button>
          <button
            className={`chart-tab ${viewMode === 'monthly' ? 'active' : ''}`}
            onClick={() => onViewModeChange('monthly')}
          >
            月
          </button>
        </div>

        <div className="rollover-toggle">
          <span className="rollover-toggle-label">显示结转影响</span>
          <Switch
            checked={showRolloverImpact}
            onCheckedChange={onRolloverImpactToggle}
            className="data-[state=checked]:bg-blue-500"
          />
        </div>
      </div>

      <div className="chart-title">
        图表区域 - 显示预算使用趋势 {showRolloverImpact ? '(含结转影响)' : ''}
      </div>

      <div className="trend-chart">
        {data && data.length > 0 ? (
          <Line data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            暂无趋势数据
          </div>
        )}
      </div>
    </div>
  );
}
