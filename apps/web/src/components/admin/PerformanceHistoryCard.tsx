'use client';

import { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { adminApi, ADMIN_API_ENDPOINTS } from '@/lib/admin-api-client';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
);

interface PerformanceData {
  time: string;
  avgValue: number;
  minValue: number;
  maxValue: number;
  sampleCount: number;
}

interface PerformanceHistoryData {
  metricType: string;
  timeRange: string;
  data: PerformanceData[];
}

interface PerformanceHistoryCardProps {
  metricType: 'disk' | 'cpu' | 'memory';
  title: string;
  color: string;
  unit: string;
  isLoading?: boolean;
}

const TIME_RANGE_OPTIONS = [
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
  { value: 'week', label: '周' },
  { value: '30days', label: '30天' },
];

export function PerformanceHistoryCard({
  metricType,
  title,
  color,
  unit,
  isLoading = false,
}: PerformanceHistoryCardProps) {
  const [timeRange, setTimeRange] = useState<string>('day');
  const [data, setData] = useState<PerformanceHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 获取性能历史数据
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await adminApi.get(
        `${ADMIN_API_ENDPOINTS.DASHBOARD_PERFORMANCE_HISTORY}?metricType=${metricType}&timeRange=${timeRange}`,
      );
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || '获取性能历史数据失败');
      }

      setData(result.data);
    } catch (error) {
      console.error('获取性能历史数据失败:', error);
      setError(error instanceof Error ? error.message : '获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [metricType, timeRange]);

  // 处理图表数据
  const chartData = {
    labels:
      data?.data.map((item) => {
        const date = new Date(item.time);
        switch (timeRange) {
          case 'hour':
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          case 'day':
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
          case 'week':
            return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
          case '30days':
            return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
          default:
            return date.toLocaleString('zh-CN');
        }
      }) || [],
    datasets: [
      {
        label: `平均${title}`,
        data: data?.data.map((item) => item.avgValue) || [],
        borderColor: color,
        backgroundColor: `${color}20`,
        fill: true,
        tension: 0.4,
        pointRadius: 2,
        pointHoverRadius: 4,
      },
    ],
  };

  // 图表配置
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: function (context: any) {
            const dataIndex = context.dataIndex;
            const dataPoint = data?.data[dataIndex];
            if (dataPoint) {
              return [
                `平均值: ${dataPoint.avgValue.toFixed(2)}${unit}`,
                `最小值: ${dataPoint.minValue.toFixed(2)}${unit}`,
                `最大值: ${dataPoint.maxValue.toFixed(2)}${unit}`,
                `样本数: ${dataPoint.sampleCount}`,
              ];
            }
            return `${context.parsed.y.toFixed(2)}${unit}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        ticks: {
          maxTicksLimit: 8,
          font: {
            size: 11,
          },
        },
      },
      y: {
        display: true,
        beginAtZero: true,
        max:
          metricType === 'disk' || metricType === 'cpu' || metricType === 'memory'
            ? 100
            : undefined,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function (value: any) {
            return `${value}${unit}`;
          },
          font: {
            size: 11,
          },
        },
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
    },
  };

  if (isLoading || loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-4 bg-gray-200 rounded animate-pulse mb-4 w-32"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}历史趋势</h3>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {TIME_RANGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            onClick={fetchData}
            className="text-sm text-blue-600 hover:text-blue-800 focus:outline-none"
            title="刷新数据"
          >
            🔄
          </button>
        </div>
      </div>

      {error ? (
        <div className="h-64 flex items-center justify-center text-red-500">
          <div className="text-center">
            <p className="mb-2">加载失败</p>
            <p className="text-sm text-gray-500">{error}</p>
            <button onClick={fetchData} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
              重试
            </button>
          </div>
        </div>
      ) : data && data.data.length > 0 ? (
        <div style={{ height: '300px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      ) : (
        <div className="h-64 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p>暂无数据</p>
            <p className="text-sm mt-1">性能监控数据收集中...</p>
          </div>
        </div>
      )}

      {/* 数据统计信息 */}
      {data && data.data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-gray-500">数据点</div>
              <div className="font-medium">{data.data.length}</div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">平均值</div>
              <div className="font-medium">
                {(
                  data.data.reduce((sum, item) => sum + item.avgValue, 0) / data.data.length
                ).toFixed(2)}
                {unit}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">最小值</div>
              <div className="font-medium">
                {Math.min(...data.data.map((item) => item.minValue)).toFixed(2)}
                {unit}
              </div>
            </div>
            <div className="text-center">
              <div className="text-gray-500">最大值</div>
              <div className="font-medium">
                {Math.max(...data.data.map((item) => item.maxValue)).toFixed(2)}
                {unit}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
