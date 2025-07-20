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
import { useAuthStore } from '@/store/auth-store';

interface MobileNavigationInitializerProps {
  children: React.ReactNode;
}

export function MobileNavigationInitializer({ children }: MobileNavigationInitializerProps) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuthStore();

  // 使用全局后退处理器
  const { navigationState } = useGlobalBackHandler();

  // 防抖控制
  const [lastPathname, setLastPathname] = React.useState<string>('');
  const [isInitializing, setIsInitializing] = React.useState(false);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // 初始化移动端导航系统 - 只初始化一次
  useEffect(() => {
    if (isInitializing) return;
    
    setIsInitializing(true);
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
      setIsInitializing(false);
    };
  }, []); // 只在组件挂载时初始化一次

  // 监听路径变化，更新当前页面信息 - 实现防抖机制
  useEffect(() => {
    if (!pathname || pathname === lastPathname) return;

    console.log('🧭 [MobileNavInit] 路径变化:', pathname, { isAuthenticated, isLoading });

    // 清除之前的定时器
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // 如果认证状态正在加载，等待加载完成
    if (isLoading) {
      console.log('🧭 [MobileNavInit] 认证状态加载中，跳过页面注册');
      return;
    }

    // 防抖处理 - 300ms内的重复路径变化会被忽略
    timeoutRef.current = setTimeout(() => {
      const currentPathname = window.location.pathname;
      
      // 路径已经变化了，跳过这次处理
      if (currentPathname !== pathname) {
        console.log('🧭 [MobileNavInit] 路径已变化，跳过处理:', pathname, '->', currentPathname);
        return;
      }

      // 检查是否在认证相关的路径变化过程中
      const isAuthPath = pathname.startsWith('/auth/');
      const isRootPath = pathname === '/';

      // 对于需要认证的页面，检查认证状态
      const requiresAuth = !isAuthPath && pathname !== '/';
      if (requiresAuth && !isAuthenticated) {
        console.log('🧭 [MobileNavInit] 需要认证的页面但未登录，跳过页面注册:', pathname);
        return;
      }

      // 处理页面注册
      const pageInfo = getPageInfoFromPath(pathname);
      if (pageInfo) {
        // 检查是否需要注册新页面
        const currentPage = navigationState.currentPage;
        const shouldRegister = !currentPage || 
          currentPage.path !== pathname || 
          currentPage.id !== pageInfo.id;

        if (shouldRegister) {
          navigationManager.navigateToPage(pageInfo);
          console.log('📝 [MobileNavInit] 注册页面:', pageInfo);
        } else {
          console.log('📝 [MobileNavInit] 页面已存在，跳过注册:', pageInfo.id);
        }
      }

      // 更新最后处理的路径
      setLastPathname(pathname);
    }, 300); // 300ms防抖

    // 清理定时器
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [pathname, lastPathname, navigationState.currentPage, isAuthenticated, isLoading]);

  // 监听页面可见性变化 - 减少重复初始化
  useEffect(() => {
    let visibilityChangeCount = 0;
    const maxReinitCount = 3; // 限制重新初始化次数

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        visibilityChangeCount++;
        console.log(`👁️ [MobileNavInit] 页面变为可见 (第${visibilityChangeCount}次)`);
        
        // 只在前几次可见性变化时重新初始化，避免过度初始化
        if (visibilityChangeCount <= maxReinitCount) {
          // 延迟一下再初始化，避免与其他初始化冲突
          setTimeout(() => {
            if (document.visibilityState === 'visible') {
              navigationManager.initialize();
            }
          }, 100);
        } else {
          console.log('👁️ [MobileNavInit] 跳过重复初始化，已达到最大次数');
        }
      } else {
        console.log('👁️ [MobileNavInit] 页面变为隐藏');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange, { passive: true });

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
