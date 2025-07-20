/**
 * 移动端后退处理Hook
 * 统一处理Android/iOS的后退逻辑
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useNavigationStore, navigationManager, PageLevel } from '@/lib/mobile-navigation';

interface BackHandlerOptions {
  // 是否启用硬件后退按钮处理
  enableHardwareBack?: boolean;
  // 是否启用浏览器历史后退处理
  enableBrowserBack?: boolean;
  // 自定义后退处理函数
  onBack?: () => boolean;
  // 是否阻止默认后退行为
  preventDefault?: boolean;
  // 页面ID（用于识别当前页面）
  pageId?: string;
  // 页面层级
  pageLevel?: PageLevel;
}

export function useMobileBackHandler(options: BackHandlerOptions = {}) {
  const {
    enableHardwareBack = true,
    enableBrowserBack = true,
    onBack,
    preventDefault = true,
    pageId,
    pageLevel = PageLevel.FEATURE,
  } = options;

  const router = useRouter();
  const navigationState = useNavigationStore();
  const backHandlerRef = useRef<(() => boolean) | null>(null);
  const isHandlingBackRef = useRef(false);

  // 注册页面到导航管理器
  useEffect(() => {
    if (pageId && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;

      navigationManager.navigateToPage({
        id: pageId,
        level: pageLevel,
        title: document.title || pageId,
        path: currentPath,
        canGoBack: pageLevel !== PageLevel.DASHBOARD,
      });

      console.log('📱 [BackHandler] 注册页面:', { pageId, pageLevel, path: currentPath });
    }
  }, [pageId, pageLevel]);

  // 统一的后退处理逻辑
  const handleBack = useCallback((): boolean => {
    // 防止重复处理
    if (isHandlingBackRef.current) {
      console.log('📱 [BackHandler] 跳过重复处理');
      return true;
    }

    isHandlingBackRef.current = true;

    try {
      console.log('📱 [BackHandler] 开始处理后退');

      // 1. 优先执行自定义后退处理
      if (onBack) {
        const customResult = onBack();
        console.log('📱 [BackHandler] 自定义处理结果:', customResult);
        if (customResult) {
          return true; // 自定义处理成功，阻止默认行为
        }
      }

      // 2. 使用导航管理器处理后退
      const navigationResult = navigationManager.handleBackAction();
      console.log('📱 [BackHandler] 导航管理器处理结果:', navigationResult);

      if (navigationResult) {
        // 导航管理器成功处理了后退
        const state = navigationManager.getNavigationState();

        // 根据当前状态决定路由跳转
        if (state.modalStack.length > 0) {
          // 还有模态框，不需要路由跳转
          console.log('📱 [BackHandler] 关闭模态框，保持当前路由');
        } else if (state.currentPage) {
          // 跳转到当前页面
          console.log('📱 [BackHandler] 跳转到页面:', state.currentPage.path);
          router.push(state.currentPage.path);
        } else {
          // 返回仪表盘
          console.log('📱 [BackHandler] 返回仪表盘');
          router.push('/dashboard');
        }

        return true;
      }

      // 3. 检查是否可以退出应用
      if (navigationState.canExitApp()) {
        console.log('📱 [BackHandler] 可以退出应用');

        // 在移动端环境中，尝试退出应用
        if (navigationState.isMobile && typeof window !== 'undefined') {
          const capacitor = (window as any).Capacitor;
          if (capacitor?.Plugins?.App) {
            console.log('📱 [BackHandler] 使用Capacitor退出应用');
            capacitor.Plugins.App.exitApp();
            return true;
          }
        }

        // Web环境或无法退出应用时，允许默认行为
        console.log('📱 [BackHandler] 允许默认后退行为');
        return false;
      }

      // 4. 默认情况：阻止后退
      console.log('📱 [BackHandler] 阻止默认后退行为');
      return true;
    } finally {
      // 延迟重置标志，避免快速连续触发
      setTimeout(() => {
        isHandlingBackRef.current = false;
      }, 100);
    }
  }, [onBack, router, navigationState]);

  // 处理硬件后退按钮（Android）
  useEffect(() => {
    if (!enableHardwareBack || typeof window === 'undefined') return;

    const capacitor = (window as any).Capacitor;
    if (!capacitor?.Plugins?.App) return;

    const backButtonListener = capacitor.Plugins.App.addListener('backButton', (data: any) => {
      console.log('📱 [BackHandler] 硬件后退按钮触发:', data);

      const handled = handleBack();
      console.log('📱 [BackHandler] 硬件后退处理结果:', handled);

      // 如果没有处理，允许默认行为
      if (!handled && !preventDefault) {
        console.log('📱 [BackHandler] 执行默认硬件后退');
        // 这里可以添加默认的硬件后退逻辑
      }
    });

    console.log('📱 [BackHandler] 注册硬件后退监听器');

    return () => {
      console.log('📱 [BackHandler] 移除硬件后退监听器');
      backButtonListener?.remove();
    };
  }, [enableHardwareBack, handleBack, preventDefault]);

  // 处理浏览器历史后退
  useEffect(() => {
    if (!enableBrowserBack || typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      console.log('📱 [BackHandler] 浏览器历史后退触发:', event);

      // 检查当前路径，如果是认证相关路径或根路径，不拦截
      const currentPath = window.location.pathname;
      const isAuthPath = currentPath.startsWith('/auth/');
      const isRootPath = currentPath === '/';

      if (isAuthPath || isRootPath) {
        console.log('📱 [BackHandler] 认证/根路径，允许默认历史行为:', currentPath);
        return; // 不阻止默认行为，允许正常的路由跳转
      }

      if (preventDefault) {
        event.preventDefault();

        const handled = handleBack();
        console.log('📱 [BackHandler] 浏览器后退处理结果:', handled);

        if (!handled) {
          // 如果没有处理成功，恢复历史状态
          console.log('📱 [BackHandler] 恢复历史状态');
          window.history.pushState(null, '', window.location.href);
        }
      }
    };

    // 只在非认证页面添加历史状态拦截
    const currentPath = window.location.pathname;
    const isAuthPath = currentPath.startsWith('/auth/');
    const isRootPath = currentPath === '/';

    if (!isAuthPath && !isRootPath) {
      // 添加一个历史状态，用于拦截后退
      window.history.pushState(null, '', window.location.href);
      console.log('📱 [BackHandler] 为非认证页面添加历史状态拦截');
    }

    window.addEventListener('popstate', handlePopState);
    console.log('📱 [BackHandler] 注册浏览器历史监听器');

    return () => {
      console.log('📱 [BackHandler] 移除浏览器历史监听器');
      window.removeEventListener('popstate', handlePopState);
    };
  }, [enableBrowserBack, handleBack, preventDefault]);

  // 存储当前的后退处理函数引用
  backHandlerRef.current = handleBack;

  // 返回手动触发后退的函数
  const triggerBack = useCallback(() => {
    return handleBack();
  }, [handleBack]);

  return {
    // 手动触发后退
    goBack: triggerBack,
    // 当前是否可以后退
    canGoBack: navigationState.canGoBack,
    // 当前页面层级
    currentLevel: navigationState.getCurrentLevel(),
    // 是否可以退出应用
    canExitApp: navigationState.canExitApp(),
    // 导航状态
    navigationState: {
      pageStack: navigationState.pageStack,
      modalStack: navigationState.modalStack,
      currentPage: navigationState.currentPage,
    },
  };
}

// 全局后退处理器（用于没有特定页面上下文的场景）
export function useGlobalBackHandler() {
  return useMobileBackHandler({
    enableHardwareBack: true,
    enableBrowserBack: true,
    preventDefault: true,
  });
}

// 模态框后退处理器
export function useModalBackHandler(modalId: string, onClose?: () => void) {
  const closeModal = useCallback(() => {
    console.log('📱 [ModalBackHandler] 关闭模态框:', modalId);

    // 从导航管理器中移除模态框
    const removedModal = navigationManager.closeModal();

    // 执行关闭回调
    if (onClose) {
      onClose();
    }

    return true; // 表示已处理
  }, [modalId, onClose]);

  // 注册模态框到导航管理器
  useEffect(() => {
    navigationManager.openModal({
      id: modalId,
      level: PageLevel.MODAL,
      title: modalId,
      path: window.location.pathname,
      canGoBack: true,
    });

    console.log('📱 [ModalBackHandler] 注册模态框:', modalId);

    return () => {
      // 组件卸载时自动关闭模态框
      navigationManager.closeModal();
      console.log('📱 [ModalBackHandler] 自动关闭模态框:', modalId);
    };
  }, [modalId]);

  return useMobileBackHandler({
    enableHardwareBack: true,
    enableBrowserBack: true,
    onBack: closeModal,
    preventDefault: true,
    pageId: modalId,
    pageLevel: PageLevel.MODAL,
  });
}
