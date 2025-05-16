"use client";

import { useRouter } from "next/navigation";

export function AnalysisNavigation() {
  const router = useRouter();

  // 处理分类分析点击
  const handleCategoryAnalysisClick = () => {
    // 暂时只打印日志，后续可以跳转到分类分析页面
    console.log('跳转到分类分析');
    // router.push('/statistics/categories');
  };

  // 处理预算分析点击
  const handleBudgetAnalysisClick = () => {
    // 暂时只打印日志，后续可以跳转到预算分析页面
    console.log('跳转到预算分析');
    // router.push('/statistics/budgets');
  };

  // 处理趋势分析点击
  const handleTrendAnalysisClick = () => {
    // 暂时只打印日志，后续可以跳转到趋势分析页面
    console.log('跳转到趋势分析');
    // router.push('/statistics/trends');
  };

  return (
    <div className="stats-navigation">
      <button 
        className="stats-nav-button" 
        onClick={handleCategoryAnalysisClick}
      >
        <div className="stats-nav-icon">
          <i className="fas fa-tags"></i>
        </div>
        <div className="stats-nav-label">分类分析</div>
      </button>
      
      <button 
        className="stats-nav-button" 
        onClick={handleBudgetAnalysisClick}
      >
        <div className="stats-nav-icon">
          <i className="fas fa-wallet"></i>
        </div>
        <div className="stats-nav-label">预算分析</div>
      </button>
      
      <button 
        className="stats-nav-button" 
        onClick={handleTrendAnalysisClick}
      >
        <div className="stats-nav-icon">
          <i className="fas fa-chart-line"></i>
        </div>
        <div className="stats-nav-label">趋势分析</div>
      </button>
    </div>
  );
}
