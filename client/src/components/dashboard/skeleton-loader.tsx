"use client";

import React from "react";

/**
 * 仪表盘骨架屏组件
 * 在数据加载过程中显示骨架屏，提高用户体验
 */
export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton">
      {/* 本月概览骨架屏 */}
      <div className="balance-card animate-pulse">
        <div className="balance-header">
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="balance-details">
          <div className="balance-item">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="balance-divider"></div>
          <div className="balance-item">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="balance-divider"></div>
          <div className="balance-item">
            <div className="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>

      {/* 预算执行情况骨架屏 */}
      <div className="budget-progress animate-pulse mt-6">
        <div className="section-header">
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="budget-content">
          {[1, 2, 3].map((i) => (
            <div key={i} className="budget-card">
              <div className="budget-info">
                <div className="budget-category">
                  <div className="category-icon w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                  <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="budget-amount">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
              <div className="progress-bar">
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 最近交易骨架屏 */}
      <div className="recent-transactions animate-pulse mt-6">
        <div className="section-header">
          <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        <div className="transaction-group">
          <div className="transaction-date h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
          <div className="transaction-list">
            {[1, 2, 3].map((i) => (
              <div key={i} className="transaction-item">
                <div className="transaction-icon w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="transaction-details">
                  <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
                <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
