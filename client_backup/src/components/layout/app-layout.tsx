'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/lib/store/auth-store';
import { useAccountBookStore } from '@/lib/store/account-book-store';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  BarChart3, 
  CreditCard, 
  PieChart, 
  Settings, 
  Plus, 
  Menu, 
  X, 
  LogOut,
  BookOpen
} from 'lucide-react';

// 导航项类型
type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
};

// 导航项列表
const navItems: NavItem[] = [
  {
    name: '仪表盘',
    href: '/dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    name: '交易',
    href: '/transactions',
    icon: <CreditCard className="h-5 w-5" />,
  },
  {
    name: '分类',
    href: '/categories',
    icon: <PieChart className="h-5 w-5" />,
  },
  {
    name: '预算',
    href: '/budget',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    name: '统计',
    href: '/statistics',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    name: '账本',
    href: '/account-books',
    icon: <BookOpen className="h-5 w-5" />,
  },
  {
    name: '设置',
    href: '/settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

// 应用布局组件
export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const { currentAccountBook } = useAccountBookStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 检测是否为移动设备
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => {
      window.removeEventListener('resize', checkIsMobile);
    };
  }, []);

  // 处理登出
  const handleLogout = () => {
    logout();
  };

  // 如果是认证页面，不显示布局
  if (pathname.startsWith('/auth/')) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* 桌面端侧边导航 */}
      {!isMobile && (
        <aside className="w-64 border-r border-border bg-card">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-primary">只为记账</h1>
          </div>
          
          {currentAccountBook && (
            <div className="px-4 py-2 mb-4">
              <div className="text-sm text-muted-foreground">当前账本</div>
              <div className="font-medium">{currentAccountBook.name}</div>
            </div>
          )}

          <nav className="space-y-1 px-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-2 text-sm rounded-md ${
                  pathname === item.href
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </Link>
            ))}
          </nav>

          <div className="absolute bottom-0 w-64 p-4 border-t border-border">
            <div className="flex items-center mb-4">
              <div className="ml-3">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              退出登录
            </Button>
          </div>
        </aside>
      )}

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* 顶部导航栏 */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4">
          {isMobile && (
            <>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-foreground hover:bg-muted"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
              <h1 className="text-xl font-bold text-primary">只为记账</h1>
            </>
          )}
          
          {!isMobile && (
            <div>
              <h2 className="text-lg font-semibold">
                {navItems.find((item) => item.href === pathname)?.name || '仪表盘'}
              </h2>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <ThemeSwitcher />
          </div>
        </header>

        {/* 移动端菜单 */}
        {isMobile && isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
            <div className="fixed inset-y-0 left-0 w-3/4 bg-card shadow-lg">
              <div className="flex h-16 items-center justify-between px-4 border-b border-border">
                <h1 className="text-xl font-bold text-primary">只为记账</h1>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 rounded-md text-foreground hover:bg-muted"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              {currentAccountBook && (
                <div className="px-4 py-2 mb-4 border-b border-border">
                  <div className="text-sm text-muted-foreground">当前账本</div>
                  <div className="font-medium">{currentAccountBook.name}</div>
                </div>
              )}

              <nav className="space-y-1 px-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center px-4 py-3 text-sm rounded-md ${
                      pathname === item.href
                        ? 'bg-primary text-primary-foreground'
                        : 'text-foreground hover:bg-muted'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                ))}
              </nav>

              <div className="absolute bottom-0 w-full p-4 border-t border-border">
                <div className="flex items-center mb-4">
                  <div>
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </div>
                <Button variant="outline" className="w-full" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  退出登录
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 主要内容 */}
        <main className="flex-1 overflow-y-auto p-4">
          {children}
        </main>

        {/* 移动端底部导航 */}
        {isMobile && !isMobileMenuOpen && (
          <div className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around">
            {navItems.slice(0, 4).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center w-16 h-16 ${
                  pathname === item.href
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {item.icon}
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            ))}
            <Link
              href="/transactions/add"
              className="flex flex-col items-center justify-center w-16 h-16 -mt-6"
            >
              <div className="bg-primary text-primary-foreground rounded-full p-3">
                <Plus className="h-6 w-6" />
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
