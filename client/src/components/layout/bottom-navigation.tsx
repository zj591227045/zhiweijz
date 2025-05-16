"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function BottomNavigation() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  return (
    <nav className="bottom-nav fixed bottom-0 left-0 right-0 h-14 bg-white shadow-md flex justify-around items-center z-50 max-w-screen-md mx-auto">
      <Link href="/dashboard" className={`nav-item flex flex-col items-center justify-center text-xs ${isActive('/dashboard') ? 'active text-blue-600' : 'text-gray-500'}`}>
        <i className="fas fa-home text-xl mb-1"></i>
        <span>首页</span>
      </Link>
      <Link href="/statistics" className={`nav-item flex flex-col items-center justify-center text-xs ${isActive('/statistics') ? 'active text-blue-600' : 'text-gray-500'}`}>
        <i className="fas fa-chart-pie text-xl mb-1"></i>
        <span>统计</span>
      </Link>
      <Link href="/transactions/new" className="nav-item add-button flex flex-col items-center justify-center text-xs">
        <div className="add-icon w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg -mt-5">
          <i className="fas fa-plus"></i>
        </div>
      </Link>
      <Link href="/budgets" className={`nav-item flex flex-col items-center justify-center text-xs ${isActive('/budgets') ? 'active text-blue-600' : 'text-gray-500'}`}>
        <i className="fas fa-wallet text-xl mb-1"></i>
        <span>预算</span>
      </Link>
      <Link href="/settings" className={`nav-item flex flex-col items-center justify-center text-xs ${isActive('/settings') ? 'active text-blue-600' : 'text-gray-500'}`}>
        <i className="fas fa-user text-xl mb-1"></i>
        <span>我的</span>
      </Link>
    </nav>
  );
}
