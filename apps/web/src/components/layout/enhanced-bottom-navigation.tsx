'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAccountBookStore } from '@/store/account-book-store';
import { useLLMCacheStore } from '@/store/llm-cache-store';
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
  const { getLLMSettings, llmCache } = useLLMCacheStore();
  const [isSmartAccountingOpen, setIsSmartAccountingOpen] = useState(false);
  const [hasLLMService, setHasLLMService] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  // 确保只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  // 使用缓存store直接检查LLM设置
  React.useEffect(() => {
    const checkLLMService = async () => {
      if (!currentAccountBook?.id) {
        setHasLLMService(false);
        return;
      }

      // 首先检查账本对象是否有userLLMSettingId字段
      if (currentAccountBook.userLLMSettingId) {
        setHasLLMService(true);
        return;
      }

      // 检查缓存 - 只监听当前账本的缓存
      const cachedSettings = llmCache[currentAccountBook.id];
      if (cachedSettings) {
        setHasLLMService(cachedSettings.bound);
        return;
      }

      // 使用缓存store获取LLM设置
      try {
        const settings = await getLLMSettings(currentAccountBook.id, null);
        setHasLLMService(settings.bound);
      } catch (error) {
        console.error('获取LLM设置失败:', error);
        setHasLLMService(false);
      }
    };

    checkLLMService();
  }, [currentAccountBook?.id, currentAccountBook?.userLLMSettingId, getLLMSettings, llmCache[currentAccountBook?.id]]);

  const isActive = (path: string) => {
    if (currentPath) {
      return currentPath === path;
    }
    return pathname === path;
  };

  const handleAddButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();

    console.log('添加按钮点击，当前LLM服务绑定状态:', hasLLMService);

    // 如果明确知道账本未绑定LLM服务，直接跳转到手动记账页面
    if (hasLLMService === false) {
      console.log('账本未绑定LLM服务，跳转到手动记账页面');
      router.push('/transactions/new');
      return;
    }

    // 如果账本已绑定LLM服务或状态未知，打开智能记账对话框
    console.log('账本已绑定LLM服务或状态未知，打开智能记账对话框');
    setIsSmartAccountingOpen(true);
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
