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

      <button className="stats-nav-button" onClick={() => navigateToPage('/statistics/monthly')}>
        <div className="stats-nav-icon">
          <i className="fas fa-calendar-alt"></i>
        </div>
        <span className="stats-nav-label">月度报告</span>
      </button>

      <button className="stats-nav-button" onClick={() => navigateToPage('/statistics/yearly')}>
        <div className="stats-nav-icon">
          <i className="fas fa-chart-line"></i>
        </div>
        <span className="stats-nav-label">年度报告</span>
      </button>
    </div>
  );
}
