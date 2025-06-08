'use client';

import React, { useState, useEffect } from 'react';
import { EnhancedBottomNavigation } from './enhanced-bottom-navigation';
import { useThemeStore } from '@/store/theme-store';
import { SettingsDialog } from './settings-dialog';
import '@/styles/settings-dialog.css';

// 将 activeNavItem 转换为路径
function getPathFromActiveItem(activeNavItem?: string): string {
  switch (activeNavItem) {
    case 'home':
      return '/dashboard';
    case 'statistics':
      return '/statistics';
    case 'budget':
      return '/budgets';
    case 'profile':
      return '/settings';
    default:
      return '/dashboard';
  }
}

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
  rightActions?: React.ReactNode;
  showBackButton?: boolean;
  onBackClick?: () => void;
  activeNavItem?: string;
  showBottomNav?: boolean;
}

/**
 * 统一的页面容器组件
 *
 * 所有页面都应该使用这个组件作为最外层容器，确保布局一致性
 *
 * @param children 页面内容
 * @param title 页面标题
 * @param rightActions 右侧操作按钮
 * @param showBackButton 是否显示返回按钮
 * @param onBackClick 返回按钮点击事件
 * @param activeNavItem 当前激活的导航项
 * @param showBottomNav 是否显示底部导航栏
 */
export function PageContainer({
  children,
  title,
  rightActions,
  showBackButton = false,
  onBackClick,
  activeNavItem,
  showBottomNav = true,
}: PageContainerProps) {
  const { theme, toggleTheme } = useThemeStore();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIOSApp, setIsIOSApp] = useState(false);

  // 检测iOS Capacitor环境
  useEffect(() => {
    const checkIOSCapacitor = async () => {
      try {
        if (typeof window !== 'undefined') {
          const capacitorModule = await import('@capacitor/core');
          const { Capacitor } = capacitorModule;
          
          const isCapacitor = Capacitor.isNativePlatform();
          const platform = Capacitor.getPlatform();
          
          if (isCapacitor && platform === 'ios') {
            setIsIOSApp(true);
            // 为body添加iOS专用类
            document.body.classList.add('ios-app');
            document.documentElement.classList.add('ios-app');
          }
        }
      } catch (error) {
        // Capacitor不可用，说明在web环境中
        console.log('PageContainer: Not in Capacitor environment');
      }
    };

    checkIOSCapacitor();

    // 清理函数
    return () => {
      if (typeof window !== 'undefined') {
        document.body.classList.remove('ios-app');
        document.documentElement.classList.remove('ios-app');
      }
    };
  }, []);

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      // 默认行为：返回上一页
      window.history.back();
    }
  };

  // 处理主题切换
  const handleToggleTheme = () => {
    toggleTheme();
  };

  // 处理设置按钮点击
  const handleSettingsClick = () => {
    setIsSettingsOpen(true);
  };

  return (
    <div className={`app-container ${isIOSApp ? 'ios-page-container' : ''}`}>
      {/* 顶部导航栏 */}
      {(title || rightActions || showBackButton) && (
        <header className={`header ${isIOSApp ? 'ios-header' : ''}`}>
          <div className="flex items-center">
            {showBackButton && (
              <button className="icon-button mr-2" onClick={handleBackClick} aria-label="返回">
                <i className="fas fa-arrow-left"></i>
              </button>
            )}
            {title && <div className="header-title">{title}</div>}
          </div>
          <div className="header-actions">
            <button className="icon-button mr-2" onClick={handleToggleTheme} aria-label="切换主题">
              <i className={`fas ${theme === 'dark' ? 'fa-sun' : 'fa-moon'}`}></i>
            </button>
            <button className="icon-button mr-2" onClick={handleSettingsClick} aria-label="设置">
              <i className="fas fa-cog"></i>
            </button>
            {rightActions}
          </div>
        </header>
      )}

      {/* 主要内容区域 */}
      <main className="main-content">{children}</main>

      {/* 底部导航栏 */}
      {showBottomNav && (
        <EnhancedBottomNavigation currentPath={getPathFromActiveItem(activeNavItem)} />
      )}

      {/* 设置弹窗 */}
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}
