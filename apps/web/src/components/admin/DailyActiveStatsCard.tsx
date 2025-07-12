'use client';

import { useMemo } from 'react';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
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
  Legend
);

interface DailyActiveStats {
  date: string;
  activeUsers: number;
  totalPointsGiven: number;
}

interface DailyActiveStatsCardProps {
  data: DailyActiveStats[] | null;
  isLoading: boolean;
  onPeriodChange?: (days: number) => void;
  selectedDays?: number;
}

const PERIOD_OPTIONS = [
  { value: 7, label: '7天' },
  { value: 14, label: '14天' },
  { value: 30, label: '30天' },
];

export function DailyActiveStatsCard({ 
  data, 
  isLoading, 
  onPeriodChange,
  selectedDays = 7 
}: DailyActiveStatsCardProps) {
  // 处理图表数据
  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const labels = sortedData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: '日活跃用户数',
          data: sortedData.map(item => item.activeUsers),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.1,
          fill: true,
        },
      ],
    };
  }, [data]);

  const pointsChartData = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const labels = sortedData.map(item => {
      const date = new Date(item.date);
      return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    });

    return {
      labels,
      datasets: [
        {
          label: '赠送记账点数',
          data: sortedData.map(item => item.totalPointsGiven),
          backgroundColor: '#10B981',
          borderColor: '#10B981',
          borderWidth: 1,
        },
      ],
    };
  }, [data]);

  // 图表配置
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        callbacks: {
          title: function(context: any) {
            const dataIndex = context[0]?.dataIndex;
            if (data && dataIndex !== undefined) {
              const item = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[dataIndex];
              return new Date(item.date).toLocaleDateString('zh-CN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              });
            }
            return '';
          },
          label: function(context: any) {
            const value = context.parsed.y;
            return `${context.dataset.label}: ${value}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
          fontSize: 12,
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: '#F3F4F6',
        },
        ticks: {
          color: '#6B7280',
          fontSize: 12,
        },
      },
    },
  };

  // 计算统计数据
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return null;
    }

    const totalActiveUsers = data.reduce((sum, item) => sum + item.activeUsers, 0);
    const totalPointsGiven = data.reduce((sum, item) => sum + item.totalPointsGiven, 0);
    const avgActiveUsers = Math.round(totalActiveUsers / data.length);
    const maxActiveUsers = Math.max(...data.map(item => item.activeUsers));

    // 计算趋势（最后3天vs前面的平均）
    const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const recent3Days = sortedData.slice(-3);
    const earlier = sortedData.slice(0, -3);
    
    let trend = 'stable';
    if (recent3Days.length >= 3 && earlier.length > 0) {
      const recentAvg = recent3Days.reduce((sum, item) => sum + item.activeUsers, 0) / recent3Days.length;
      const earlierAvg = earlier.reduce((sum, item) => sum + item.activeUsers, 0) / earlier.length;
      
      if (recentAvg > earlierAvg * 1.1) {
        trend = 'up';
      } else if (recentAvg < earlierAvg * 0.9) {
        trend = 'down';
      }
    }

    return {
      totalActiveUsers,
      totalPointsGiven,
      avgActiveUsers,
      maxActiveUsers,
      trend,
    };
  }, [data]);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 标题和控制器 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">日活跃用户统计</h3>
          <p className="text-sm text-gray-600 mt-1">基于每日首次访问用户的精确统计</p>
        </div>
        {onPeriodChange && (
          <div className="flex space-x-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onPeriodChange(option.value)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  selectedDays === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {/* 统计卡片骨架 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
          {/* 图表骨架 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
            <div className="animate-pulse">
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ) : data && data.length > 0 ? (
        <div className="space-y-6">
          {/* 统计卡片 */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">平均日活</p>
                    <p className="text-2xl font-bold text-blue-900">{stats.avgActiveUsers}</p>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${
                    stats.trend === 'up' ? 'bg-green-500' : 
                    stats.trend === 'down' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></div>
                </div>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-sm font-medium text-green-600">峰值日活</p>
                <p className="text-2xl font-bold text-green-900">{stats.maxActiveUsers}</p>
              </div>
              
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-600">总活跃用户</p>
                <p className="text-2xl font-bold text-purple-900">{stats.totalActiveUsers}</p>
              </div>
              
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-600">总赠送点数</p>
                <p className="text-2xl font-bold text-orange-900">{stats.totalPointsGiven}</p>
              </div>
            </div>
          )}

          {/* 图表区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 日活跃用户趋势图 */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">日活跃用户趋势</h4>
              <div className="h-64">
                {chartData && <Line data={chartData} options={chartOptions} />}
              </div>
            </div>

            {/* 记账点赠送量图表 */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">每日记账点赠送量</h4>
              <div className="h-64">
                {pointsChartData && <Bar data={pointsChartData} options={chartOptions} />}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg mb-2">📊</div>
          <p className="text-gray-500 text-sm">暂无日活跃数据</p>
          <p className="text-gray-400 text-xs mt-1">用户开始使用应用后将显示统计数据</p>
        </div>
      )}
    </div>
  );
}