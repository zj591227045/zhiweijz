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
    </div>
  );
}
