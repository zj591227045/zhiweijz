'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useThemeStore } from '@/store/theme-store';

interface SettingsPageHeaderProps {
  title: string;
  backUrl?: string;
  onBackClick?: () => void;
  rightActions?: React.ReactNode;
  className?: string;
}

/**
 * 设置页面统一的顶部工具栏组件
 *
 * @param title 页面标题
 * @param backUrl 返回按钮的目标URL，默认为 /settings
 * @param onBackClick 自定义返回按钮点击事件
 * @param rightActions 右侧操作按钮
 * @param className 自定义CSS类名
 */
export function SettingsPageHeader({
  title,
  backUrl = '/settings',
  onBackClick,
  rightActions,
  className = '',
}: SettingsPageHeaderProps) {
  const router = useRouter();
  const { theme } = useThemeStore();

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick();
    } else {
      router.push(backUrl);
    }
  };

  return (
    <header
      className={`settings-page-header ${className}`}
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        background: 'var(--card-background)',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 1000,
        maxWidth: '480px',
        margin: '0 auto',
        // 确保在移动端正确显示
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* 左侧返回按钮 */}
      <button
        onClick={handleBackClick}
        className="back-button"
        style={{
          background: 'none',
          border: 'none',
          padding: '8px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          transition: 'background-color 0.2s ease',
          minWidth: '40px',
          height: '40px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--hover-background, rgba(0, 0, 0, 0.05))';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
        // 移动端触摸反馈
        onTouchStart={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--hover-background, rgba(0, 0, 0, 0.05))';
        }}
        onTouchEnd={(e) => {
          setTimeout(() => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }, 150);
        }}
      >
        <i
          className="fas fa-arrow-left"
          style={{
            fontSize: '18px',
          }}
        />
      </button>

      {/* 中间标题 */}
      <h1
        className="page-title"
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          margin: 0,
          flex: 1,
          textAlign: 'center',
          // 确保标题不会被左右按钮挤压
          paddingLeft: '8px',
          paddingRight: '8px',
          // 文本溢出处理
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </h1>

      {/* 右侧操作按钮 */}
      <div
        className="right-actions"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          minWidth: '40px',
          justifyContent: 'flex-end',
        }}
      >
        {rightActions}
      </div>
    </header>
  );
}

/**
 * 设置页面容器组件，包含统一的顶部工具栏
 */
interface SettingsPageContainerProps {
  title: string;
  backUrl?: string;
  onBackClick?: () => void;
  rightActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function SettingsPageContainer({
  title,
  backUrl,
  onBackClick,
  rightActions,
  children,
  className = '',
}: SettingsPageContainerProps) {
  return (
    <div
      className={`settings-page-container ${className}`}
      style={{
        minHeight: '100vh',
        background: 'var(--background)',
        maxWidth: '480px',
        margin: '0 auto',
        position: 'relative',
      }}
    >
      <SettingsPageHeader
        title={title}
        backUrl={backUrl}
        onBackClick={onBackClick}
        rightActions={rightActions}
      />
      <main
        className="settings-page-content"
        style={{
          padding: '16px',
          paddingBottom: '80px', // 为底部导航留出空间
        }}
      >
        {children}
      </main>
    </div>
  );
}
