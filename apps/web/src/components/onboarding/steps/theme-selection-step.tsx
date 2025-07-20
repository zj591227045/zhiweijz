'use client';

import { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useThemeStore } from '@/store/theme-store';
import { OnboardingStep } from '@zhiweijz/core';

export function ThemeSelectionStep() {
  console.log('🎨 [ThemeSelection] Component mounted');
  const { nextStep, previousStep, currentStep, setCurrentStep } = useOnboardingStore();
  const { theme, themeColor, setTheme, setThemeColor } = useThemeStore();
  const [selectedTheme, setSelectedTheme] = useState(`${theme}-${themeColor}`);
  const [isNavigating, setIsNavigating] = useState(false);

  // 监听引导状态变化
  useEffect(() => {
    console.log('🎨 [ThemeSelection] Current step changed to:', currentStep);
    if (currentStep !== 'theme-selection') {
      console.log('⚠️ [ThemeSelection] Step changed away from theme-selection unexpectedly!');
    }
  }, [currentStep]);

  // 主题配置
  const themes = [
    {
      id: 'light-blue',
      name: '浅色蓝色',
      description: '经典的浅色蓝色主题，清新简洁',
      preview: {
        primaryColor: '#3B82F6',
        backgroundColor: '#F9FAFB',
        textColor: '#1F2937',
        cardColor: '#FFFFFF',
      },
    },
    {
      id: 'light-green',
      name: '浅色绿色',
      description: '清新的浅色绿色主题，自然舒适',
      preview: {
        primaryColor: '#10B981',
        backgroundColor: '#F9FAFB',
        textColor: '#1F2937',
        cardColor: '#FFFFFF',
      },
    },
    {
      id: 'light-purple',
      name: '浅色紫色',
      description: '优雅的浅色紫色主题，高贵典雅',
      preview: {
        primaryColor: '#8B5CF6',
        backgroundColor: '#F9FAFB',
        textColor: '#1F2937',
        cardColor: '#FFFFFF',
      },
    },
    {
      id: 'light-pink',
      name: '浅色粉色',
      description: '温馨的浅色粉色主题，温暖可爱',
      preview: {
        primaryColor: '#EC4899',
        backgroundColor: '#F9FAFB',
        textColor: '#1F2937',
        cardColor: '#FFFFFF',
      },
    },
    {
      id: 'light-orange-light',
      name: '浅色橘色',
      description: '活力的浅色橘色主题，充满活力',
      preview: {
        primaryColor: '#FB923C',
        backgroundColor: '#F9FAFB',
        textColor: '#1F2937',
        cardColor: '#FFFFFF',
      },
    },
    {
      id: 'dark',
      name: '深色主题',
      description: '护眼的深色主题，适合夜间使用',
      preview: {
        primaryColor: '#3B82F6',
        backgroundColor: '#111827',
        textColor: '#F3F4F6',
        cardColor: '#1F2937',
      },
    },
  ];

  // 处理主题选择
  const handleThemeSelect = (themeId: string) => {
    console.log('🎨 [ThemeSelection] Theme selected:', themeId);
    setSelectedTheme(themeId);

    // 立即应用主题预览
    if (themeId === 'dark') {
      console.log('🎨 [ThemeSelection] Applying dark theme');
      setTheme('dark');
    } else if (themeId.startsWith('light-')) {
      const color = themeId.replace('light-', '');
      console.log('🎨 [ThemeSelection] Applying light theme with color:', color);
      setTheme('light');

      // 映射主题色名称
      const colorMap: Record<string, any> = {
        blue: 'blue',
        green: 'green',
        purple: 'purple',
        pink: 'pink',
        'orange-light': 'orange-light',
      };

      const mappedColor = colorMap[color] || 'blue';
      console.log('🎨 [ThemeSelection] Setting theme color to:', mappedColor);
      setThemeColor(mappedColor);
    }
    console.log('🎨 [ThemeSelection] Theme selection completed');
  };

  // 专门的方法来跳转到AI服务设置步骤
  const goToAIServiceSetup = () => {
    console.log('🎯 [ThemeSelection] Directly going to ai-service-setup step');

    if (isNavigating) {
      console.log('⚠️ [ThemeSelection] Already navigating, ignoring duplicate call');
      return;
    }

    setIsNavigating(true);
    setCurrentStep('ai-service-setup' as OnboardingStep);
    console.log('✅ [ThemeSelection] Successfully set step to ai-service-setup');

    // 滚动到页面顶部
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const onboardingContent = document.querySelector('.onboarding-modal-content');
        if (onboardingContent) {
          onboardingContent.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [ThemeSelection] Scrolled to top');
        } else {
          // 备用方案：滚动整个页面
          window.scrollTo({ top: 0, behavior: 'smooth' });
          console.log('📜 [ThemeSelection] Scrolled page to top');
        }
        setIsNavigating(false);
      }, 100);
    } else {
      setIsNavigating(false);
    }
  };

  // 处理下一步
  const handleNext = () => {
    console.log('🎨 [ThemeSelection] Next button clicked');
    console.log('🎨 [ThemeSelection] Current selected theme:', selectedTheme);
    console.log('🎨 [ThemeSelection] Going to AI service setup');

    // 直接跳转到AI服务设置步骤，参考预算设置的跳转方式
    goToAIServiceSetup();
  };

  // 处理上一步
  const handlePrevious = () => {
    previousStep();
  };

  return (
    <div className="onboarding-step">
      <div className="onboarding-step-title">选择您喜欢的主题</div>
      <div className="onboarding-step-description">
        选择一个您喜欢的主题风格，让记账变得更加愉悦
      </div>

      {/* 主题选择网格 */}
      <div className="theme-selection-grid">
        {themes.map((themeOption) => (
          <div
            key={themeOption.id}
            className={`theme-selection-card ${selectedTheme === themeOption.id ? 'selected' : ''}`}
            onClick={() => handleThemeSelect(themeOption.id)}
          >
            {/* 主题预览 */}
            <div className="theme-preview-container">
              <div
                className="theme-preview-mockup"
                style={{
                  backgroundColor: themeOption.preview.backgroundColor,
                  color: themeOption.preview.textColor,
                }}
              >
                {/* 模拟顶部栏 */}
                <div
                  className="preview-header"
                  style={{
                    backgroundColor: themeOption.preview.primaryColor,
                  }}
                >
                  <div className="preview-header-content">
                    <div className="preview-title">只为记账</div>
                  </div>
                </div>

                {/* 模拟卡片内容 */}
                <div className="preview-content">
                  <div
                    className="preview-card"
                    style={{
                      backgroundColor: themeOption.preview.cardColor,
                      color: themeOption.preview.textColor,
                    }}
                  >
                    <div className="preview-card-header">
                      <div
                        className="preview-amount"
                        style={{ color: themeOption.preview.primaryColor }}
                      >
                        ¥1,234.56
                      </div>
                    </div>
                    <div className="preview-card-content">
                      <div className="preview-item">
                        <div
                          className="preview-dot"
                          style={{ backgroundColor: themeOption.preview.primaryColor }}
                        ></div>
                        <span>餐饮美食</span>
                      </div>
                      <div className="preview-item">
                        <div
                          className="preview-dot"
                          style={{ backgroundColor: themeOption.preview.primaryColor }}
                        ></div>
                        <span>交通出行</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 主题信息 */}
            <div className="theme-info">
              <div className="theme-name">{themeOption.name}</div>
              <div className="theme-description">{themeOption.description}</div>
            </div>

            {/* 选中指示器 */}
            {selectedTheme === themeOption.id && (
              <div className="theme-selected-indicator">
                <i className="fas fa-check-circle"></i>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 按钮组 */}
      <div className="onboarding-button-group">
        <button className="onboarding-button onboarding-button-secondary" onClick={handlePrevious}>
          上一步
        </button>
        <button className="onboarding-button onboarding-button-primary" onClick={handleNext}>
          下一步
        </button>
      </div>
    </div>
  );
}
