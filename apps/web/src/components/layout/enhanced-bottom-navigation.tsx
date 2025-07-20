'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccountBookStore } from '@/store/account-book-store';
import { useGlobalAIStore } from '@/store/global-ai-store';
import EnhancedSmartAccountingDialog from '../transactions/enhanced-smart-accounting-dialog';
import { toast } from 'sonner';
import { hapticPresets } from '@/lib/haptic-feedback';
import '@/styles/smart-accounting-dialog.css';

interface EnhancedBottomNavigationProps {
  currentPath?: string;
}

export function EnhancedBottomNavigation({ currentPath }: EnhancedBottomNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentAccountBook } = useAccountBookStore();
  const { globalConfig, fetchGlobalConfig } = useGlobalAIStore();
  const [isSmartAccountingOpen, setIsSmartAccountingOpen] = useState(false);

  const [mounted, setMounted] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [lastClickTime, setLastClickTime] = useState<Record<string, number>>({});

  // 防抖机制 - 防止快速连续点击
  const isClickAllowed = (itemId: string) => {
    const now = Date.now();
    const lastClick = lastClickTime[itemId] || 0;
    const debounceTime = 300; // 300ms防抖
    
    if (now - lastClick < debounceTime) {
      console.log('🚫 [BottomNav] 跳过快速连续点击:', itemId);
      return false;
    }
    
    setLastClickTime(prev => ({ ...prev, [itemId]: now }));
    return true;
  };

  // 确保只在客户端渲染，并创建安全的Portal容器
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // 创建专用的Portal容器，避免直接使用document.body
    const container = document.createElement('div');
    container.id = 'bottom-navigation-portal';
    container.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 40;
      pointer-events: auto;
    `;
    
    document.body.appendChild(container);
    setPortalContainer(container);
    setMounted(true);

    return () => {
      // 清理Portal容器
      if (container && container.parentNode) {
        container.parentNode.removeChild(container);
      }
      setPortalContainer(null);
      setMounted(false);
    };
  }, []);

  // 获取全局AI配置
  useEffect(() => {
    fetchGlobalConfig();
  }, [fetchGlobalConfig]);

  const isActive = (path: string) => {
    if (currentPath) {
      return currentPath === path;
    }
    return pathname === path;
  };

  const handleNavItemClick = (e: React.MouseEvent, itemId: string) => {
    // 防抖检查 - 但不阻止导航本身，只阻止重复的振动反馈
    const shouldVibrate = isClickAllowed(itemId);

    // 异步执行振动反馈，避免阻塞主线程
    if (shouldVibrate) {
      setTimeout(() => {
        try {
          hapticPresets.navigation();
        } catch (error) {
          console.warn('振动反馈失败:', error);
        }
      }, 0);
    }

    console.log('🧭 [BottomNav] 导航项点击:', itemId);
    // 不阻止默认的Link导航行为
  };

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // 防抖检查
    if (!isClickAllowed('add-button')) {
      return;
    }

    // 异步执行振动反馈，避免阻塞主线程
    setTimeout(() => {
      try {
        hapticPresets.buttonTap();
      } catch (error) {
        console.warn('振动反馈失败:', error);
      }
    }, 0);

    console.log('添加按钮点击，全局AI配置:', globalConfig);

    // 使用全局AI配置的enabled字段来判断是否显示智能记账弹窗
    if (globalConfig?.enabled) {
      console.log('全局AI已启用，打开智能记账对话框');
      setIsSmartAccountingOpen(true);
    } else {
      console.log('全局AI未启用，跳转到手动记账页面');
      router.push('/transactions/new');
    }
  };

  const handleDialogClose = () => {
    setIsSmartAccountingOpen(false);
  };

  const navigationContent = (
    <>
      <nav
        className="bottom-nav"
        style={{
          position: 'fixed',
          bottom: '0',
          left: '0',
          right: '0',
          height: '56px',
          background: 'var(--card-background)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.05)',
          zIndex: '40',
          maxWidth: '480px',
          margin: '0 auto',
          pointerEvents: 'auto', // 确保导航栏可以接收点击事件
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
        }}
      >
        <Link
          href="/dashboard"
          className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}
          onClick={(e) => handleNavItemClick(e, 'dashboard')}
        >
          <i className="fas fa-home"></i>
          <span>首页</span>
        </Link>
        <Link
          href="/statistics"
          className={`nav-item ${isActive('/statistics') ? 'active' : ''}`}
          onClick={(e) => handleNavItemClick(e, 'statistics')}
        >
          <i className="fas fa-chart-pie"></i>
          <span>统计</span>
        </Link>
        <a
          href="#"
          onClick={handleAddButtonClick}
          className="nav-item add-button"
          style={{ zIndex: 101 }}
        >
          <div className="add-icon">
            <i className="fas fa-plus"></i>
          </div>
        </a>
        <Link
          href="/budgets/statistics"
          className={`nav-item ${isActive('/budgets') || (pathname && pathname.startsWith('/budgets/')) ? 'active' : ''}`}
          onClick={(e) => handleNavItemClick(e, 'budgets')}
        >
          <i className="fas fa-wallet"></i>
          <span>预算</span>
        </Link>
        <Link
          href="/settings"
          className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={(e) => handleNavItemClick(e, 'settings')}
        >
          <i className="fas fa-user"></i>
          <span>我的</span>
        </Link>
      </nav>

      {/* 增强版智能记账对话框 */}
      <EnhancedSmartAccountingDialog
        isOpen={isSmartAccountingOpen}
        onClose={handleDialogClose}
        accountBookId={currentAccountBook?.id}
      />
    </>
  );

  // 只在客户端渲染，并使用安全的Portal容器
  if (!mounted || !portalContainer) {
    return null;
  }

  return createPortal(navigationContent, portalContainer);
}
