'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { OnboardingModal } from './onboarding-modal';

// 添加调试工具函数
const debugOnboardingState = () => {
  if (typeof window !== 'undefined') {
    console.log('🔍 [OnboardingDebug] Current localStorage state:', {
      authToken: !!localStorage.getItem('auth-token'),
      user: !!localStorage.getItem('user'),
      onboardingStorage: localStorage.getItem('onboarding-storage'),
      authStorage: localStorage.getItem('auth-storage'),
    });
  }
};

export function OnboardingProvider() {
  const pathname = usePathname();
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const { isCompleted, isVisible, startOnboarding, setAccountType, setCurrentStep } = useOnboardingStore();
  const { currentAccountBook } = useAccountBookStore();

  // 检查是否在不需要显示引导的页面
  const isAdminPage = pathname?.startsWith('/admin');
  const isAuthPage = pathname?.startsWith('/auth/');
  const shouldSkipOnboarding = isAdminPage || isAuthPage;

  // 检查是否需要显示引导
  useEffect(() => {
    // 添加调试信息
    debugOnboardingState();

    console.log('🔍 [OnboardingProvider] Checking onboarding conditions:', {
      pathname,
      isAuthenticated,
      hasUser: !!user,
      isLoading,
      isCompleted,
      isVisible,
      isAdminPage,
      isAuthPage,
      shouldSkipOnboarding
    });

    // 如果认证状态还在加载中，不执行任何操作
    if (isLoading) {
      console.log('⏳ [OnboardingProvider] Auth is loading, waiting...');
      return;
    }

    // 管理员页面和认证页面不显示用户引导
    if (shouldSkipOnboarding) {
      console.log('⏭️ [OnboardingProvider] Skipping onboarding for:', pathname);
      // 如果在认证页面但引导仍然可见，强制隐藏引导
      if (isVisible) {
        console.log('🚫 [OnboardingProvider] Force hiding onboarding on auth page');
        const { skipOnboarding } = useOnboardingStore.getState();
        skipOnboarding();
      }
      return;
    }

    // 只有在认证状态稳定且用户已登录的情况下才显示引导
    if (isAuthenticated && user && !isCompleted && !isVisible) {
      console.log('🚀 [OnboardingProvider] Starting onboarding for authenticated user');
      // 延迟一点时间显示引导，确保页面已经完全加载
      const timer = setTimeout(() => {
        // 始终从第一步开始，让用户选择账本类型
        startOnboarding();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isLoading, isCompleted, isVisible, startOnboarding, shouldSkipOnboarding, pathname]);

  // 管理员页面和认证页面不渲染引导弹窗
  if (shouldSkipOnboarding) {
    console.log('🚫 [OnboardingProvider] Not rendering onboarding modal for:', pathname);
    return null;
  }

  // 如果认证状态还在加载中，不渲染引导弹窗
  if (isLoading) {
    console.log('⏳ [OnboardingProvider] Auth loading, not rendering onboarding modal');
    return null;
  }

  // 如果用户未认证，不渲染引导弹窗
  if (!isAuthenticated || !user) {
    console.log('🔒 [OnboardingProvider] User not authenticated, not rendering onboarding modal');
    return null;
  }

  return <OnboardingModal />;
}
