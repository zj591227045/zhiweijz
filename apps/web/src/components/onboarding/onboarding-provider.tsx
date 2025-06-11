'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { OnboardingModal } from './onboarding-modal';

export function OnboardingProvider() {
  const { isAuthenticated, user } = useAuthStore();
  const { isCompleted, isVisible, startOnboarding, setAccountType, setCurrentStep } = useOnboardingStore();
  const { currentAccountBook } = useAccountBookStore();

  // 检查是否需要显示引导
  useEffect(() => {
    if (isAuthenticated && user && !isCompleted && !isVisible) {
      // 延迟一点时间显示引导，确保页面已经完全加载
      const timer = setTimeout(() => {
        // 始终从第一步开始，让用户选择账本类型
        startOnboarding();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, isCompleted, isVisible, startOnboarding]);

  return <OnboardingModal />;
}
