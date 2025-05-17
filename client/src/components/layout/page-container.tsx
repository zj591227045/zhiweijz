"use client";

import React from "react";
import { BottomNavigation } from "./bottom-navigation";
import { useThemeStore } from "@/store/theme-store";

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

  return (
    <div className="app-container">
      {/* 顶部导航栏 */}
      {(title || rightActions || showBackButton) && (
        <header className="header">
          <div className="flex items-center">
            {showBackButton && (
              <button
                className="icon-button mr-2"
                onClick={handleBackClick}
                aria-label="返回"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
            )}
            {title && <div className="header-title">{title}</div>}
          </div>
          <div className="header-actions">
            <button
              className="icon-button mr-2"
              onClick={handleToggleTheme}
              aria-label="切换主题"
            >
              <i className={`fas ${theme === "dark" ? "fa-sun" : "fa-moon"}`}></i>
            </button>
            {rightActions}
          </div>
        </header>
      )}

      {/* 主要内容区域 */}
      <main className="main-content">
        {children}
      </main>

      {/* 底部导航栏 */}
      {showBottomNav && <BottomNavigation activeItem={activeNavItem} />}
    </div>
  );
}
