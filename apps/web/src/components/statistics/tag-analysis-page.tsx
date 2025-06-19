'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { useAuthStore } from '@/store/auth-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { tagApi } from '@/lib/api/tag-api';
import { TagStatisticsResponse, TagResponseDto } from '@/lib/api/types/tag.types';
import { TagDisplay } from '../tags/tag-display';
import { DateRangePicker } from './date-range-picker';
import { getCurrentMonthRange } from '@/lib/utils';
import { formatCurrency } from '@/lib/utils';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface DateRange {
  startDate: string;
  endDate: string;
}

/**
 * 按标签分析页面
 */
export function TagAnalysisPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  
  const [dateRange, setDateRange] = useState<DateRange>(() => getCurrentMonthRange());
  const [statisticsData, setStatisticsData] = useState<TagStatisticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
  const [isClient, setIsClient] = useState(false);

  // 检查认证状态
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 客户端检查
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 获取标签统计数据
  const fetchTagStatistics = async () => {
    if (!currentAccountBook?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await tagApi.getTagStatistics({
        accountBookId: currentAccountBook.id,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      });

      setStatisticsData(response);
    } catch (err) {
      console.error('获取标签统计失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    } finally {
      setIsLoading(false);
    }
  };

  // 初始加载数据
  useEffect(() => {
    if (currentAccountBook?.id && dateRange.startDate && dateRange.endDate) {
      fetchTagStatistics();
    }
  }, [currentAccountBook?.id, dateRange]);

  // 处理日期范围变化
  const handleDateRangeChange = (newDateRange: DateRange) => {
    setDateRange(newDateRange);
  };

  // 准备图表数据
  const chartData = statisticsData?.data?.tagStatistics?.map(item => {
    const value = Math.abs(Number(item.statistics.totalAmount) || 0);
    return {
      name: item.tag.name || '未知标签',
      value: value,
      color: item.tag.color || '#3B82F6',
      count: item.statistics.transactionCount || 0,
    };
  }).filter(item => item.value >= 0) || [];

  // 调试信息
  console.log('=== 标签分析页面调试 ===');
  console.log('isClient:', isClient);
  console.log('chartData:', chartData);
  console.log('chartData.length:', chartData?.length);
  console.log('条件判断:', {
    isClient,
    hasChartData: chartData && chartData.length > 0,
    condition: isClient && chartData && chartData.length > 0
  });

  // 自定义饼图标签
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // 小于5%不显示标签
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  // 自定义工具提示
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <div className="flex items-center space-x-2 mb-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: data.color }}
            />
            <span className="font-medium">{data.name}</span>
          </div>
          <p className="text-sm text-gray-600">
            金额: {formatCurrency(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            交易数: {data.count} 笔
          </p>
        </div>
      );
    }
    return null;
  };

  if (!currentAccountBook) {
    return (
      <PageContainer title="按标签分析" showBackButton={true} activeNavItem="statistics">
        <div className="flex h-40 items-center justify-center">
          <p className="text-gray-500">请先选择账本</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="按标签分析" showBackButton={true} activeNavItem="statistics">

      <div className="tag-analysis-page space-y-4 pb-20">
        {/* 日期选择器 */}
        <DateRangePicker
          startDate={dateRange.startDate}
          endDate={dateRange.endDate}
          onPrevious={() => {
            // 实现上一个时间段逻辑
          }}
          onNext={() => {
            // 实现下一个时间段逻辑
          }}
          onToday={() => {
            setDateRange(getCurrentMonthRange());
          }}
        />

        {isLoading ? (
          <div className="flex h-40 items-center justify-center bg-white rounded-lg border border-gray-200">
            <div className="flex flex-col items-center space-y-3">
              <div className="animate-spin w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-gray-600 font-medium">加载标签统计数据...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-600 mb-4 font-medium">{error}</p>
            <button
              onClick={fetchTagStatistics}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
            >
              重新加载
            </button>
          </div>
        ) : statisticsData && statisticsData.data.tagStatistics.length > 0 ? (
          <>
            {/* 概览统计 */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="text-sm font-bold text-gray-900 mb-1">
                    {formatCurrency(statisticsData.data.overview.totalAmount)}
                  </div>
                  <div className="text-xs text-gray-500">总金额</div>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="text-sm font-bold text-gray-900 mb-1">
                    {statisticsData.data.overview.transactionCount}
                  </div>
                  <div className="text-xs text-gray-500">交易笔数</div>
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                <div className="text-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <div className="text-sm font-bold text-gray-900 mb-1">
                    {statisticsData.data.overview.tagCount}
                  </div>
                  <div className="text-xs text-gray-500">使用标签数</div>
                </div>
              </div>
            </div>

            {/* 图表类型切换 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">标签金额分布</h3>
                <div className="flex bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setChartType('pie')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      chartType === 'pie'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                      <span>饼图</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setChartType('bar')}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                      chartType === 'bar'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      <span>柱状图</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center lg:space-x-6">
                {/* 图表区域 */}
                <div className="chart-container flex-1">
                  {!isClient ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                        <p className="text-gray-500 text-sm">加载图表...</p>
                      </div>
                    </div>
                  ) : (isClient && chartData && chartData.length > 0) ? (
                    <div style={{ width: '100%', height: '100%', background: 'transparent' }}>
                      {/* 调试信息 */}
                      <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000, background: 'rgba(0,0,0,0.7)', color: 'white', padding: '4px 8px', fontSize: '12px', borderRadius: '4px' }}>
                        图表渲染中: {chartType} | 数据: {chartData.length}项
                      </div>
                      <ResponsiveContainer width="100%" height="100%">
                        {chartType === 'pie' ? (
                          <PieChart>
                            <Pie
                              data={chartData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={renderCustomizedLabel}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                          </PieChart>
                        ) : (
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              dataKey="name"
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis tickFormatter={(value) => formatCurrency(value)} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="value" fill="#3B82F6" />
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无数据</h3>
                        <p className="text-gray-500">当前筛选条件下没有标签数据</p>
                      </div>
                    </div>
                  )}

                </div>

                {/* 图例区域 */}
                <div className="lg:w-64 mt-4 lg:mt-0">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">标签图例</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {chartData && chartData.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-gray-700 truncate" title={item.name}>
                              {item.name}
                            </span>
                          </div>
                          <div className="text-right ml-2">
                            <div className="font-medium text-gray-900">
                              {formatCurrency(item.value)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {((item.value / statisticsData.data.overview.totalAmount) * 100).toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 详细列表 */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <h3 className="text-lg font-semibold text-gray-900">标签详细统计</h3>
                </div>
              </div>
              <div className="divide-y divide-gray-100">
                {statisticsData.data.tagStatistics.map((item, index) => (
                  <div key={item.tag.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600">
                          {index + 1}
                        </div>
                        <TagDisplay tags={[item.tag]} size="medium" />
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {formatCurrency(item.statistics.totalAmount)}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center space-x-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          <span>{item.statistics.transactionCount} 笔交易</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* 分类分布 */}
                    {item.statistics.categoryBreakdown.length > 0 && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2 mb-3">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <span className="text-sm font-medium text-gray-700">分类分布</span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {item.statistics.categoryBreakdown.slice(0, 3).map((cat) => (
                            <div
                              key={cat.categoryId}
                              className="flex items-center justify-between p-2 bg-white rounded-md border border-gray-200"
                            >
                              <span className="text-sm text-gray-700 font-medium">{cat.categoryName}</span>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-gray-900">{formatCurrency(cat.amount)}</div>
                                <div className="text-xs text-gray-500">{cat.count} 笔</div>
                              </div>
                            </div>
                          ))}
                          {item.statistics.categoryBreakdown.length > 3 && (
                            <div className="text-xs text-gray-500 text-center py-1">
                              还有 {item.statistics.categoryBreakdown.length - 3} 个分类...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">暂无标签统计数据</h3>
            <p className="text-gray-500 mb-4">
              在选定的时间范围内没有使用标签的交易记录
            </p>
            <div className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-start space-x-2">
                <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-left">
                  <p className="font-medium text-gray-600 mb-1">提示</p>
                  <p>您可以在添加交易时为交易记录添加标签，然后在这里查看标签的使用统计。</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

export default TagAnalysisPage;
