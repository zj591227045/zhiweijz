'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccountBookStore } from '@/store/account-book-store';
import { useGlobalAIStore } from '@/store/global-ai-store';
import { SmartAccountingDialog } from '../transactions/smart-accounting-dialog';
import { toast } from 'sonner';
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

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
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

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();

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

  const navigationContent = (
    <>
      <nav className="bottom-nav" style={{
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
        zIndex: '99998', // 比虚拟键盘低一点，但比其他内容高
        maxWidth: '480px',
        margin: '0 auto',
        // 确保在任何容器之上
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
      }}>
        <Link href="/dashboard" className={`nav-item ${isActive('/dashboard') ? 'active' : ''}`}>
          <i className="fas fa-home"></i>
          <span>首页</span>
        </Link>
        <Link href="/statistics" className={`nav-item ${isActive('/statistics') ? 'active' : ''}`}>
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
        >
          <i className="fas fa-wallet"></i>
          <span>预算</span>
        </Link>
        <Link href="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
          <i className="fas fa-user"></i>
          <span>我的</span>
        </Link>
      </nav>

      {/* 智能记账对话框 */}
      <SmartAccountingDialog
        isOpen={isSmartAccountingOpen}
        onClose={() => setIsSmartAccountingOpen(false)}
        accountBookId={currentAccountBook?.id}
      />
    </>
  );

  // 只在客户端渲染，并使用Portal渲染到body
  if (!mounted) {
    return null;
  }

  return createPortal(navigationContent, document.body);
}
