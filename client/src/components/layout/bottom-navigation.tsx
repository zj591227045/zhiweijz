"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavigationProps {
  activeItem?: 'home' | 'statistics' | 'add' | 'budget' | 'profile';
}

export function BottomNavigation({ activeItem }: BottomNavigationProps = {}) {
  const pathname = usePathname();

  const isActive = (item: string, path: string) => {
    if (activeItem) {
      return activeItem === item;
    }
    return pathname === path;
  };

  return (
    <nav className="bottom-nav">
      <Link href="/dashboard" className={`nav-item ${isActive('home', '/dashboard') ? 'active' : ''}`}>
        <i className="fas fa-home"></i>
        <span>首页</span>
      </Link>
      <Link href="/statistics" className={`nav-item ${isActive('statistics', '/statistics') ? 'active' : ''}`}>
        <i className="fas fa-chart-pie"></i>
        <span>统计</span>
      </Link>
      <Link href="/transactions/new" className="nav-item add-button">
        <div className="add-icon">
          <i className="fas fa-plus"></i>
        </div>
      </Link>
      <Link href="/budgets/list" className={`nav-item ${isActive('budget', '/budgets') || (pathname && pathname.startsWith('/budgets/')) ? 'active' : ''}`}>
        <i className="fas fa-wallet"></i>
        <span>预算</span>
      </Link>
      <Link href="/settings" className={`nav-item ${isActive('profile', '/settings') ? 'active' : ''}`}>
        <i className="fas fa-user"></i>
        <span>我的</span>
      </Link>
    </nav>
  );
}
