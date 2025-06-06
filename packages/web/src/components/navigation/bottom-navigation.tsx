"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAccountBookStore } from "../../store/account-book-store";

interface BottomNavigationProps {
  currentPath?: string;
}

export function BottomNavigation({ currentPath }: BottomNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentAccountBook } = useAccountBookStore();

  const isActive = (path: string) => {
    if (currentPath) {
      return currentPath === path;
    }
    return pathname === path;
  };

  return (
    <nav className="bottom-nav">
      <Link href="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
        <i className="fas fa-home"></i>
        <span>首页</span>
      </Link>
      <Link href="/statistics" className={`nav-item ${isActive('/statistics') ? 'active' : ''}`}>
        <i className="fas fa-chart-pie"></i>
        <span>统计</span>
      </Link>
      <Link href="/transactions/new" className="nav-item add-button">
        <div className="add-icon">
          <i className="fas fa-plus"></i>
        </div>
      </Link>
      <Link href="/budgets/statistics" className={`nav-item ${isActive('/budgets') || (pathname && pathname.startsWith('/budgets/')) ? 'active' : ''}`}>
        <i className="fas fa-wallet"></i>
        <span>预算</span>
      </Link>
      <Link href="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
        <i className="fas fa-user"></i>
        <span>我的</span>
      </Link>
    </nav>
  );
}
