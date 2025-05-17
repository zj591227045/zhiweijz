"use client";

import { useEffect, useState } from "react";
import { useFamilyDetailStore } from "@/lib/stores/family-detail-store";
import { formatCurrency } from "@/lib/utils/format-utils";

interface FamilyStatisticsProps {
  familyId: string;
}

export function FamilyStatistics({ familyId }: FamilyStatisticsProps) {
  const { fetchFamilyStatistics, statistics, isStatisticsLoading } = useFamilyDetailStore();
  const [period, setPeriod] = useState<'all' | 'month' | 'year'>('month');

  useEffect(() => {
    fetchFamilyStatistics(familyId, period);
  }, [familyId, period, fetchFamilyStatistics]);

  // 处理周期切换
  const handlePeriodChange = (newPeriod: 'all' | 'month' | 'year') => {
    setPeriod(newPeriod);
  };

  return (
    <>
      <div className="section-title">家庭财务统计</div>
      
      <div className="stats-card">
        <div className="period-selector">
          <button 
            className={`period-tab ${period === 'all' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('all')}
          >
            全部
          </button>
          <button 
            className={`period-tab ${period === 'month' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('month')}
          >
            本月
          </button>
          <button 
            className={`period-tab ${period === 'year' ? 'active' : ''}`}
            onClick={() => handlePeriodChange('year')}
          >
            本年
          </button>
        </div>
        
        {isStatisticsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : statistics ? (
          <>
            <div className="stats-summary">
              <div className="stat-item">
                <div className="stat-value income-value">
                  {formatCurrency(statistics.totalIncome)}
                </div>
                <div className="stat-label">总收入</div>
              </div>
              <div className="stat-item">
                <div className="stat-value expense-value">
                  {formatCurrency(statistics.totalExpense)}
                </div>
                <div className="stat-label">总支出</div>
              </div>
              <div className="stat-item">
                <div className="stat-value balance-value">
                  {formatCurrency(statistics.balance)}
                </div>
                <div className="stat-label">结余</div>
              </div>
            </div>
            
            <div className="chart-container">
              <div className="chart-card">
                <div className="chart-title">成员消费占比</div>
                {statistics.memberDistribution.length > 0 ? (
                  <div className="chart-placeholder">
                    {/* 这里将来会替换为真实的Chart.js图表 */}
                    {statistics.memberDistribution.map((item, index) => (
                      <div key={index} className="text-left mb-2">
                        <div className="flex justify-between">
                          <span>{item.username}</span>
                          <span>{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chart-placeholder">暂无数据</div>
                )}
              </div>
              <div className="chart-card">
                <div className="chart-title">分类消费占比</div>
                {statistics.categoryDistribution.length > 0 ? (
                  <div className="chart-placeholder">
                    {/* 这里将来会替换为真实的Chart.js图表 */}
                    {statistics.categoryDistribution.map((item, index) => (
                      <div key={index} className="text-left mb-2">
                        <div className="flex justify-between">
                          <span>
                            <i className={`fas fa-${item.categoryIcon}`}></i> {item.categoryName}
                          </span>
                          <span>{item.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full rounded-full" 
                            style={{ width: `${item.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="chart-placeholder">暂无数据</div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            无法加载统计数据
          </div>
        )}
      </div>
    </>
  );
}
