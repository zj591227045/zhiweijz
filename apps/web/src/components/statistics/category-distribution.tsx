'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { CategoryStatistics } from '@/types';
import { useStatisticsStore } from '@/store/statistics-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { CategoryTransactionsModal } from './category-transactions-modal';
import './category-transactions-modal.css';

// 注册Chart.js组件
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

interface CategoryDistributionProps {
  expenseCategories: CategoryStatistics[];
  incomeCategories: CategoryStatistics[];
  onTransactionEdit?: (transactionId: string, transactionData?: any) => void;
}

export function CategoryDistribution({
  expenseCategories,
  incomeCategories,
  onTransactionEdit,
}: CategoryDistributionProps) {
  const {
    categoryChartType,
    setCategoryChartType,
    selectedCategoryType,
    setSelectedCategoryType,
    dateRange,
  } = useStatisticsStore();
  const { currentAccountBook } = useAccountBookStore();

  const chartRef = useRef<any>(null);

  // 模态框状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<{
    name: string;
    id?: string;
  } | null>(null);
  const [chartData, setChartData] = useState({
    labels: [] as string[],
    datasets: [
      {
        data: [] as number[],
        backgroundColor: [] as string[],
        borderWidth: 0,
      },
    ],
  });

  // 获取当前选中类型的分类数据
  const categories = selectedCategoryType === 'expense' ? expenseCategories : incomeCategories;

  // 更新图表数据
  useEffect(() => {
    console.log('CategoryDistribution 组件收到的分类数据:', {
      selectedCategoryType,
      categories,
      expenseCategories,
      incomeCategories,
    });

    if (!categories || categories.length === 0) {
      console.log('没有分类数据，显示暂无数据');
      setChartData({
        labels: ['暂无数据'],
        datasets: [
          {
            data: [1],
            backgroundColor: ['#e5e7eb'],
            borderWidth: 0,
          },
        ],
      });
      return;
    }

    // 颜色映射
    const colorMap: Record<number, string> = {
      0: '#3B82F6', // 蓝色
      1: '#10B981', // 绿色
      2: '#F59E0B', // 橙色
      3: '#EF4444', // 红色
      4: '#8B5CF6', // 紫色
      5: '#EC4899', // 粉色
      6: '#14B8A6', // 青色
      7: '#F97316', // 深橙色
      8: '#6366F1', // 靛蓝色
      9: '#84CC16', // 青柠色
    };

    const newChartData = {
      labels: categories.map((cat) => cat.categoryName),
      datasets: [
        {
          data: categories.map((cat) => cat.amount),
          backgroundColor: categories.map((_, index) => colorMap[index % 10] || '#6B7280'),
          borderWidth: 0,
        },
      ],
    };

    console.log('设置图表数据:', newChartData);
    setChartData(newChartData);
  }, [expenseCategories, incomeCategories, selectedCategoryType, categories]);

  // 处理图例点击
  const handleLegendClick = (categoryName: string, index: number) => {
    // 查找对应的分类数据
    const categoryData = categories.find((cat) => cat.categoryName === categoryName);

    setSelectedCategory({
      name: categoryName,
      id: categoryData?.categoryId,
    });
    setIsModalOpen(true);
  };

  // 关闭模态框
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCategory(null);
  };

  // 生成随机颜色（用于分类列表显示）
  const getRandomColor = (index: number) => {
    const colors = [
      '#3B82F6',
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#EC4899',
      '#14B8A6',
      '#F97316',
      '#6366F1',
      '#84CC16',
    ];
    return colors[index % colors.length];
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
        callbacks: {
          label: function (context: any) {
            const label = context.label || '';
            const value = context.raw;
            const total = context.chart.data.datasets[0].data.reduce(
              (a: number, b: number) => a + b,
              0,
            );
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${formatCurrency(value)} (${percentage}%)`;
          },
        },
      },
    },
    scales:
      categoryChartType === 'bar'
        ? {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value: any) {
                  return formatCurrency(value);
                },
              },
            },
          }
        : undefined,
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title">
          {selectedCategoryType === 'expense' ? '支出' : '收入'}分类分布
        </div>
        <div className="chart-actions">
          <button
            className={`chart-action ${selectedCategoryType === 'expense' ? 'active' : ''}`}
            onClick={() => setSelectedCategoryType('expense')}
          >
            支出
          </button>
          <button
            className={`chart-action ${selectedCategoryType === 'income' ? 'active' : ''}`}
            onClick={() => setSelectedCategoryType('income')}
          >
            收入
          </button>
        </div>
      </div>

      <div className="chart-actions" style={{ marginBottom: '16px' }}>
        <button
          className={`chart-action ${categoryChartType === 'pie' ? 'active' : ''}`}
          onClick={() => setCategoryChartType('pie')}
        >
          饼图
        </button>
        <button
          className={`chart-action ${categoryChartType === 'bar' ? 'active' : ''}`}
          onClick={() => setCategoryChartType('bar')}
        >
          柱状图
        </button>
      </div>

      <div className="chart-container">
        {categories.length === 0 ? (
          <div className="empty-chart">
            <p>暂无{selectedCategoryType === 'expense' ? '支出' : '收入'}数据</p>
          </div>
        ) : categoryChartType === 'pie' ? (
          <Pie ref={chartRef} data={chartData} options={chartOptions} />
        ) : (
          <Bar ref={chartRef} data={chartData} options={chartOptions} />
        )}
      </div>

      <div className="legend-container">
        {chartData.labels.map((label, index) => {
          if (label === '暂无数据') return null;

          const value = chartData.datasets[0].data[index];
          const color = chartData.datasets[0].backgroundColor[index];
          const total = chartData.datasets[0].data.reduce((a, b) => a + b, 0);
          const percentage = Math.round((value / total) * 100);

          return (
            <div
              key={index}
              className="legend-item legend-item-clickable"
              onClick={() => handleLegendClick(label, index)}
              title={`点击查看 ${label} 的记账记录`}
            >
              <div className="legend-color" style={{ backgroundColor: color as string }}></div>
              <div className="legend-label">{label}</div>
              <div className="legend-value">
                {formatCurrency(value)} ({percentage}%)
              </div>
              <div className="legend-arrow">
                <i className="fas fa-chevron-right"></i>
              </div>
            </div>
          );
        })}
      </div>

      {/* 分类记账记录模态框 */}
      {selectedCategory && (
        <CategoryTransactionsModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          categoryName={selectedCategory.name}
          categoryId={selectedCategory.id}
          filters={{
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            accountBookId: currentAccountBook?.id,
            transactionType: selectedCategoryType === 'expense' ? 'EXPENSE' : 'INCOME',
          }}
          onTransactionEdit={onTransactionEdit}
        />
      )}
    </div>
  );
}
