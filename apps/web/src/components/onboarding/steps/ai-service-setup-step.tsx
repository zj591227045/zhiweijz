'use client';

import { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useGlobalAIStore } from '@/store/global-ai-store';
import { OnboardingStep } from '@zhiweijz/core';
import { toast } from 'sonner';

export function AIServiceSetupStep() {
  const { nextStep, previousStep, setCurrentStep } = useOnboardingStore();
  const { userAIEnabled, isLoadingUserAI, toggleUserAIService, fetchUserAIEnabled } =
    useGlobalAIStore();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // 初始化数据
  useEffect(() => {
    fetchUserAIEnabled();
  }, [fetchUserAIEnabled]);

  // 专门的方法来跳转到功能介绍步骤
  const goToFeatureIntro = () => {
    console.log('🎯 [AIServiceSetup] Directly going to feature-intro step');

    if (isNavigating) {
      console.log('⚠️ [AIServiceSetup] Already navigating, ignoring duplicate call');
      return;
    }

    setIsNavigating(true);
    setCurrentStep('feature-intro' as OnboardingStep);
    console.log('✅ [AIServiceSetup] Successfully set step to feature-intro');

    // 滚动到页面顶部
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const onboardingContent = document.querySelector('.onboarding-modal-content');
        if (onboardingContent) {
          onboardingContent.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [AIServiceSetup] Scrolled to top');
        } else {
          // 备用方案：滚动整个页面
          window.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [AIServiceSetup] Scrolled page to top');
        }
        setIsNavigating(false);
      }, 100);
    } else {
      setIsNavigating(false);
    }
  };

  // 处理用户级别AI服务开关
  const handleUserAIToggle = async (enabled: boolean) => {
    try {
      setIsProcessing(true);
      await toggleUserAIService(enabled);

      if (enabled) {
        toast.success('AI服务已开启，您可以使用智能记账功能了！');
      } else {
        toast.success('AI服务已关闭');
      }

      // 无论开启还是关闭，都直接完成设置并进入下一步
      setTimeout(() => {
        goToFeatureIntro();
      }, 500);
    } catch (error) {
      console.error('切换用户AI服务状态失败:', error);
      toast.error('设置失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 跳过AI服务设置
  const handleSkip = () => {
    toast.info('已跳过AI服务设置，您可以稍后在设置中配置');
    goToFeatureIntro();
  };

  return (
    <div className="onboarding-step">
      <div className="onboarding-step-title">开启AI服务</div>
      <div className="onboarding-step-description">
        启用官方AI服务，享受智能记账、自动分类等便捷功能
      </div>

      <div className="ai-wizard-content">
        <div className="ai-service-benefits">
          <h4>AI服务为您带来：</h4>
          <div className="benefits-grid">
            <div className="benefit-item">
              <i className="fas fa-magic"></i>
              <span>智能记账助手</span>
            </div>
            <div className="benefit-item">
              <i className="fas fa-tags"></i>
              <span>自动分类标记</span>
            </div>
            <div className="benefit-item">
              <i className="fas fa-chart-line"></i>
              <span>智能财务分析</span>
            </div>
            <div className="benefit-item">
              <i className="fas fa-lightbulb"></i>
              <span>个性化建议</span>
            </div>
          </div>
        </div>

        <div className="ai-service-toggle-section">
          <h4>是否启用AI服务？</h4>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            使用官方AI服务，无需额外配置，开箱即用
          </p>

          <div className="toggle-options">
            <button
              className="toggle-option-button primary"
              onClick={() => handleUserAIToggle(true)}
              disabled={isProcessing}
            >
              <div className="toggle-option-icon">
                <i className="fas fa-robot"></i>
              </div>
              <div className="toggle-option-content">
                <div className="toggle-option-title">启用AI服务</div>
                <div className="toggle-option-description">开启智能功能，提升记账体验</div>
              </div>
            </button>

            <button
              className="toggle-option-button secondary"
              onClick={() => handleUserAIToggle(false)}
              disabled={isProcessing}
            >
              <div className="toggle-option-icon">
                <i className="fas fa-times-circle"></i>
              </div>
              <div className="toggle-option-content">
                <div className="toggle-option-title">暂不启用</div>
                <div className="toggle-option-description">稍后可在设置中开启</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* 底部按钮组 */}
      <div className="onboarding-button-group">
        <button
          className="onboarding-button onboarding-button-secondary"
          onClick={previousStep}
          disabled={isProcessing}
        >
          上一步
        </button>

        <button
          className="onboarding-button onboarding-button-secondary"
          onClick={handleSkip}
          disabled={isProcessing}
        >
          跳过设置
        </button>
      </div>
    </div>
  );
}
