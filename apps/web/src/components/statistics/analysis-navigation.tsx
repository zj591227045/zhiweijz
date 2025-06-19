'use client';

import { useRouter } from 'next/navigation';

export function AnalysisNavigation() {
  const router = useRouter();

  const navigateToPage = (path: string) => {
    router.push(path);
  };

  return (
    <div className="stats-navigation">
      <button className="stats-nav-button" onClick={() => navigateToPage('/budgets/statistics')}>
        <div className="stats-nav-icon">
          <i className="fas fa-piggy-bank"></i>
        </div>
        <span className="stats-nav-label">预算分析</span>
      </button>

      {/* 暂时隐藏标签分析入口，等待图表显示问题修复 */}
      {/* <button className="stats-nav-button" onClick={() => navigateToPage('/statistics/tags')}>
        <div className="stats-nav-icon">
          <i className="fas fa-tags"></i>
        </div>
        <span className="stats-nav-label">标签分析</span>
      </button> */}
    </div>
  );
}
