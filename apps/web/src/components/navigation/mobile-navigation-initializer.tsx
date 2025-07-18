/**
 * 移动端导航初始化器
 * 负责初始化移动端导航管理系统
 */

'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { navigationManager, PageLevel } from '@/lib/mobile-navigation';
import { initializePlatformGestures } from '@/lib/platform-gesture-handler';
import { initializeCapacitorIntegration } from '@/lib/capacitor-integration';
import { useGlobalBackHandler } from '@/hooks/use-mobile-back-handler';

interface MobileNavigationInitializerProps {
  children: React.ReactNode;
}

export function MobileNavigationInitializer({ children }: MobileNavigationInitializerProps) {
  const pathname = usePathname();
  
  // 使用全局后退处理器
  const { navigationState } = useGlobalBackHandler();

  // 初始化移动端导航系统
  useEffect(() => {
    console.log('🚀 [MobileNavInit] 初始化移动端导航系统');

    // 1. 初始化导航管理器
    navigationManager.initialize();

    // 2. 初始化平台手势处理
    initializePlatformGestures({
      enabled: true,
      sensitivity: 0.3,
      minDistance: 50,
      maxTime: 300,
      edgeWidth: 20,
    });

    // 3. 初始化Capacitor集成
    initializeCapacitorIntegration({
      enabled: true,
      doubleClickExitInterval: 2000,
      exitConfirmation: false,
    });

    console.log('✅ [MobileNavInit] 移动端导航系统初始化完成');

    // 清理函数
    return () => {
      console.log('🧹 [MobileNavInit] 清理移动端导航系统');
    };
  }, []);

  // 监听路径变化，更新当前页面信息
  useEffect(() => {
    if (!pathname) return;

    console.log('🧭 [MobileNavInit] 路径变化:', pathname);

    // 根据路径确定页面层级和信息
    const pageInfo = getPageInfoFromPath(pathname);
    
    if (pageInfo) {
      // 如果是新页面，注册到导航管理器
      const currentPage = navigationState.currentPage;
      if (!currentPage || currentPage.path !== pathname) {
        navigationManager.navigateToPage(pageInfo);
        console.log('📝 [MobileNavInit] 注册新页面:', pageInfo);
      }
    }
  }, [pathname, navigationState.currentPage]);

  // 监听页面可见性变化
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('👁️ [MobileNavInit] 页面变为可见');
        // 页面重新可见时，重新初始化导航状态
        navigationManager.initialize();
      } else {
        console.log('👁️ [MobileNavInit] 页面变为隐藏');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return <>{children}</>;
}

// 根据路径获取页面信息
function getPageInfoFromPath(pathname: string): {
  id: string;
  level: PageLevel;
  title: string;
  path: string;
  canGoBack: boolean;
} | null {
  // 移除查询参数和哈希
  const cleanPath = pathname.split('?')[0].split('#')[0];

  // 路径映射配置
  const pathMappings = [
    // 0级页面（仪表盘）
    {
      pattern: /^\/dashboard\/?$/,
      level: PageLevel.DASHBOARD,
      title: '仪表盘',
      canGoBack: false,
    },
    {
      pattern: /^\/?\/?$/,
      level: PageLevel.DASHBOARD,
      title: '仪表盘',
      canGoBack: false,
    },

    // 1级页面（功能页面）
    {
      pattern: /^\/transactions\/?$/,
      level: PageLevel.FEATURE,
      title: '记账记录',
      canGoBack: true,
    },
    {
      pattern: /^\/transactions\/new\/?$/,
      level: PageLevel.FEATURE,
      title: '新增记账',
      canGoBack: true,
    },
    {
      pattern: /^\/budgets\/?$/,
      level: PageLevel.FEATURE,
      title: '预算管理',
      canGoBack: true,
    },
    {
      pattern: /^\/statistics\/?$/,
      level: PageLevel.FEATURE,
      title: '统计分析',
      canGoBack: true,
    },
    {
      pattern: /^\/settings\/?$/,
      level: PageLevel.FEATURE,
      title: '设置',
      canGoBack: true,
    },
    {
      pattern: /^\/settings\/profile\/?$/,
      level: PageLevel.FEATURE,
      title: '个人资料',
      canGoBack: true,
    },
    {
      pattern: /^\/settings\/account-books\/?$/,
      level: PageLevel.FEATURE,
      title: '账本管理',
      canGoBack: true,
    },
    {
      pattern: /^\/settings\/categories\/?$/,
      level: PageLevel.FEATURE,
      title: '分类管理',
      canGoBack: true,
    },
    {
      pattern: /^\/settings\/backup\/?$/,
      level: PageLevel.FEATURE,
      title: '备份恢复',
      canGoBack: true,
    },
    {
      pattern: /^\/settings\/theme\/?$/,
      level: PageLevel.FEATURE,
      title: '主题设置',
      canGoBack: true,
    },
    {
      pattern: /^\/settings\/ai\/?$/,
      level: PageLevel.FEATURE,
      title: 'AI设置',
      canGoBack: true,
    },

    // 认证页面
    {
      pattern: /^\/auth\/login\/?$/,
      level: PageLevel.FEATURE,
      title: '登录',
      canGoBack: false,
    },
    {
      pattern: /^\/auth\/register\/?$/,
      level: PageLevel.FEATURE,
      title: '注册',
      canGoBack: true,
    },
    {
      pattern: /^\/auth\/forgot-password\/?$/,
      level: PageLevel.FEATURE,
      title: '忘记密码',
      canGoBack: true,
    },

    // 2级页面（详情页面，在移动端通常作为模态框处理）
    {
      pattern: /^\/transactions\/edit\/[^\/]+\/?$/,
      level: PageLevel.MODAL,
      title: '编辑记账',
      canGoBack: true,
    },
    {
      pattern: /^\/transactions\/[^\/]+\/?$/,
      level: PageLevel.MODAL,
      title: '记账详情',
      canGoBack: true,
    },
    {
      pattern: /^\/budgets\/[^\/]+\/?$/,
      level: PageLevel.MODAL,
      title: '预算详情',
      canGoBack: true,
    },
  ];

  // 查找匹配的路径配置
  for (const mapping of pathMappings) {
    if (mapping.pattern.test(cleanPath)) {
      return {
        id: generatePageId(cleanPath),
        level: mapping.level,
        title: mapping.title,
        path: pathname,
        canGoBack: mapping.canGoBack,
      };
    }
  }

  // 默认处理：未知路径作为功能页面
  console.warn('🤷 [MobileNavInit] 未知路径，使用默认配置:', cleanPath);
  
  return {
    id: generatePageId(cleanPath),
    level: PageLevel.FEATURE,
    title: getPageTitleFromPath(cleanPath),
    path: pathname,
    canGoBack: true,
  };
}

// 生成页面ID
function generatePageId(path: string): string {
  // 移除开头的斜杠并替换其他斜杠为下划线
  return path.replace(/^\//, '').replace(/\//g, '_') || 'dashboard';
}

// 从路径获取页面标题
function getPageTitleFromPath(path: string): string {
  const segments = path.split('/').filter(Boolean);
  
  if (segments.length === 0) {
    return '仪表盘';
  }

  // 简单的路径到标题映射
  const titleMap: Record<string, string> = {
    dashboard: '仪表盘',
    transactions: '记账记录',
    budgets: '预算管理',
    statistics: '统计分析',
    settings: '设置',
    auth: '认证',
    login: '登录',
    register: '注册',
    profile: '个人资料',
    categories: '分类管理',
    backup: '备份恢复',
    theme: '主题设置',
    ai: 'AI设置',
  };

  const lastSegment = segments[segments.length - 1];
  return titleMap[lastSegment] || lastSegment;
}
