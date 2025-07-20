'use client';

import { useEffect, useRef } from 'react';
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
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface ChartCardProps {
  title: string;
  data: Array<{ date: string | Date; count?: number; value?: number; [key: string]: any }>;
  isLoading?: boolean;
  type?: 'line' | 'bar';
  dataKey?: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
}

export function ChartCard({
  title,
  data,
  isLoading = false,
  type = 'line',
  dataKey = 'count',
  xAxisKey = 'date',
  color = '#3B82F6',
  height = 300,
}: ChartCardProps) {
  // 处理数据格式
  const processedData = data.map((item) => ({
    ...item,
    date:
      typeof item[xAxisKey] === 'string'
        ? new Date(item[xAxisKey]).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
        : item[xAxisKey],
    value: item[dataKey] || item.value || item.count || 0,
  }));

  // Chart.js数据格式
  const chartData = {
    labels: processedData.map((item) => item.date),
    datasets: [
      {
        label: title,
        data: processedData.map((item) => item.value),
        borderColor: color,
        backgroundColor: type === 'line' ? `${color}20` : color,
        borderWidth: 2,
        fill: type === 'line',
        tension: 0.3,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
    ],
  };

  // Chart.js配置选项
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#1f2937',
        titleColor: '#f9fafb',
        bodyColor: '#f9fafb',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          label: (context: any) => {
            return `${title}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 12,
          },
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#f3f4f6',
          drawBorder: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: '#9ca3af',
          font: {
            size: 12,
          },
          callback: (value: any) => {
            if (value >= 1000) {
              return (value / 1000).toFixed(1) + 'K';
            }
            return value;
          },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    elements: {
      line: {
        borderJoinStyle: 'round' as const,
      },
      point: {
        hoverBorderWidth: 3,
      },
    },
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <div className="text-4xl mb-2">📊</div>
            <p>暂无数据</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <div className="text-sm text-gray-500">最近{data.length}天</div>
      </div>

      <div style={{ height: `${height}px` }}>
        {type === 'line' ? (
          <Line data={chartData} options={options} />
        ) : (
          <Bar data={chartData} options={options} />
        )}
      </div>

      {/* 数据摘要 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-sm text-gray-600">
          <span>总计</span>
          <span className="font-medium">
            {processedData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>平均</span>
          <span className="font-medium">
            {Math.round(
              processedData.reduce((sum, item) => sum + item.value, 0) / processedData.length,
            ).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
