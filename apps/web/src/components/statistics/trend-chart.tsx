'use client';

import { useEffect, useRef } from 'react';
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
import { Line } from 'react-chartjs-2';
import { useStatisticsStore } from '@/store/statistics-store';
import { formatCurrency } from '@/lib/utils';
import { DailyStatistics } from '@/types';
import dayjs from 'dayjs';

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

interface TrendChartProps {
  dailyStatistics: DailyStatistics[];
}

export function TrendChart({ dailyStatistics }: TrendChartProps) {
  const { trendChartPeriod, setTrendChartPeriod } = useStatisticsStore();
  const chartRef = useRef<any>(null);

  // 处理数据分组
  const processData = () => {
    console.log('TrendChart 组件收到的每日统计数据:', dailyStatistics);

    if (!dailyStatistics || dailyStatistics.length === 0) {
      console.log('没有每日统计数据，显示暂无数据');
      return {
        labels: ['暂无数据'],
        income: [0],
        expense: [0],
      };
    }

    // 按日期排序
    const sortedData = [...dailyStatistics].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    console.log('排序后的每日统计数据:', sortedData);

    if (trendChartPeriod === 'day') {
      // 日视图：直接使用每日数据
      const result = {
        labels: sortedData.map((item) => dayjs(item.date).format('MM-DD')),
        income: sortedData.map((item) => item.income),
        expense: sortedData.map((item) => item.expense),
      };
      console.log('日视图数据:', result);
      return result;
    } else if (trendChartPeriod === 'week') {
      // 周视图：按周分组
      const weekData: Record<string, { income: number; expense: number }> = {};

      sortedData.forEach((item) => {
        const date = dayjs(item.date);
        const weekStart = date.startOf('week').format('YYYY-MM-DD');

        if (!weekData[weekStart]) {
          weekData[weekStart] = { income: 0, expense: 0 };
        }

        weekData[weekStart].income += item.income;
        weekData[weekStart].expense += item.expense;
      });

      const weeks = Object.keys(weekData).sort();

      const result = {
        labels: weeks.map((week) => `${dayjs(week).format('MM-DD')}周`),
        income: weeks.map((week) => weekData[week].income),
        expense: weeks.map((week) => weekData[week].expense),
      };
      console.log('周视图数据:', result);
      return result;
    } else {
      // 月视图：按月分组
      const monthData: Record<string, { income: number; expense: number }> = {};

      sortedData.forEach((item) => {
        const month = dayjs(item.date).format('YYYY-MM');

        if (!monthData[month]) {
          monthData[month] = { income: 0, expense: 0 };
        }

        monthData[month].income += item.income;
        monthData[month].expense += item.expense;
      });

      const months = Object.keys(monthData).sort();

      const result = {
        labels: months.map((month) => dayjs(month).format('MM月')),
        income: months.map((month) => monthData[month].income),
        expense: months.map((month) => monthData[month].expense),
      };
      console.log('月视图数据:', result);
      return result;
    }
  };

  const { labels, income, expense } = processData();

  // 图表数据
  const chartData = {
    labels,
    datasets: [
      {
        label: '收入',
        data: income,
        borderColor: '#22C55E',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: '支出',
        data: expense,
        borderColor: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // 图表配置
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          boxWidth: 6,
        },
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const label = context.dataset.label || '';
            const value = context.raw;
            return `${label}: ${formatCurrency(value)}`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function (value: any) {
            return formatCurrency(value);
          },
        },
      },
    },
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">收支趋势</div>
        <div className="chart-actions">
          <button
            className={`chart-action ${trendChartPeriod === 'day' ? 'active' : ''}`}
            onClick={() => setTrendChartPeriod('day')}
          >
            日
          </button>
          <button
            className={`chart-action ${trendChartPeriod === 'week' ? 'active' : ''}`}
            onClick={() => setTrendChartPeriod('week')}
          >
            周
          </button>
          <button
            className={`chart-action ${trendChartPeriod === 'month' ? 'active' : ''}`}
            onClick={() => setTrendChartPeriod('month')}
          >
            月
          </button>
        </div>
      </div>

      <div className="chart-container">
        {dailyStatistics && dailyStatistics.length > 0 ? (
          <Line ref={chartRef} data={chartData} options={chartOptions} />
        ) : (
          <div className="empty-chart">
            <p>暂无趋势数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
