'use client';

import { useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';
import { AccountTypeStep } from './steps/account-type-step';
import { ThemeSelectionStep } from './steps/theme-selection-step';
import { BudgetSetupStep } from './steps/budget-setup-step';
import { FeatureIntroStep } from './steps/feature-intro-step';
import { SkipConfirmDialog } from './skip-confirm-dialog';
import { useState } from 'react';
import './onboarding-modal.css';

export function OnboardingModal() {
  const {
    isVisible,
    currentStep,
    completeOnboarding,
    skipOnboarding,
  } = useOnboardingStore();
  
  const [showSkipDialog, setShowSkipDialog] = useState(false);

  // 隐藏页面头部和导航
  useEffect(() => {
    if (isVisible) {
      const appContainer = document.querySelector('.app-container');
      const pageHeader = appContainer?.querySelector('.header');
      // 尝试多种选择器来找到底部导航栏
      const bottomNav = document.querySelector('.bottom-nav') ||
                       document.querySelector('nav[class*="bottom"]') ||
                       document.querySelector('[class*="bottom-nav"]');

      console.log('🔍 [OnboardingModal] Found elements:', {
        pageHeader: !!pageHeader,
        bottomNav: !!bottomNav,
        bottomNavClass: bottomNav?.className
      });

      if (pageHeader) {
        (pageHeader as HTMLElement).style.display = 'none';
      }
      if (bottomNav) {
        (bottomNav as HTMLElement).style.display = 'none';
        console.log('✅ [OnboardingModal] Hidden bottom navigation');
      }

      // 添加body类来标识引导模式
      document.body.classList.add('onboarding-active');

      return () => {
        // 恢复显示
        if (pageHeader) {
          (pageHeader as HTMLElement).style.display = '';
        }
        if (bottomNav) {
          (bottomNav as HTMLElement).style.display = '';
          console.log('🔄 [OnboardingModal] Restored bottom navigation');
        }

        // 移除body类
        document.body.classList.remove('onboarding-active');
      };
    }
  }, [isVisible]);

  // 处理跳过按钮点击
  const handleSkipClick = () => {
    setShowSkipDialog(true);
  };

  // 确认跳过
  const handleConfirmSkip = () => {
    skipOnboarding();
    setShowSkipDialog(false);
  };

  // 取消跳过
  const handleCancelSkip = () => {
    setShowSkipDialog(false);
  };

  // 渲染当前步骤
  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'account-type':
        return <AccountTypeStep />;
      case 'budget-setup':
        return <BudgetSetupStep />;
      case 'theme-selection':
        return <ThemeSelectionStep />;
      case 'feature-intro':
        return <FeatureIntroStep />;
      default:
        return null;
    }
  };

  // 获取步骤标题
  const getStepTitle = () => {
    switch (currentStep) {
      case 'account-type':
        return '选择账本类型';
      case 'budget-setup':
        return '预算控制设置';
      case 'theme-selection':
        return '主题选择';
      case 'feature-intro':
        return '功能介绍';
      default:
        return '引导设置';
    }
  };

  // 获取步骤进度
  const getStepProgress = () => {
    const steps = ['account-type', 'budget-setup', 'theme-selection', 'feature-intro'];
    const currentIndex = steps.indexOf(currentStep);
    return {
      current: currentIndex + 1,
      total: steps.length,
    };
  };

  if (!isVisible) return null;

  const progress = getStepProgress();

  return (
    <>
      <div className="onboarding-modal-overlay">
        <div className="onboarding-modal-container">
          {/* 头部 */}
          <div className="onboarding-modal-header">
            <div className="onboarding-header-content">
              <h2 className="onboarding-title">{getStepTitle()}</h2>
              <button 
                className="onboarding-skip-button"
                onClick={handleSkipClick}
              >
                跳过
              </button>
            </div>
            
            {/* 进度指示器 */}
            <div className="onboarding-progress">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
              <span className="progress-text">
                {progress.current} / {progress.total}
              </span>
            </div>
          </div>

          {/* 内容区域 */}
          <div className="onboarding-modal-content">
            {renderCurrentStep()}
          </div>
        </div>
      </div>

      {/* 跳过确认对话框 */}
      <SkipConfirmDialog
        isOpen={showSkipDialog}
        onConfirm={handleConfirmSkip}
        onCancel={handleCancelSkip}
      />
    </>
  );
}
