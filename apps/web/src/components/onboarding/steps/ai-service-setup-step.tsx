'use client';

import { useState, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboarding-store';
import { useGlobalAIStore } from '@/store/global-ai-store';
import { useAIServicesStore } from '@/store/ai-services-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { OnboardingStep } from '@zhiweijz/core';
import { toast } from 'sonner';

export function AIServiceSetupStep() {
  const { nextStep, previousStep, setCurrentStep } = useOnboardingStore();
  const { currentAccountBook } = useAccountBookStore();
  const { services, fetchServices } = useAIServicesStore();
  const { 
    globalConfig,
    activeService,
    isLoadingConfig,
    updateGlobalConfig,
    switchServiceType,
    fetchGlobalConfig,
    fetchAccountActiveService
  } = useGlobalAIStore();

  // 向导状态
  const [currentWizardStep, setCurrentWizardStep] = useState<'global-toggle' | 'service-type' | 'custom-service' | 'confirmation'>('global-toggle');
  const [selectedServiceType, setSelectedServiceType] = useState<'official' | 'custom'>('official');
  const [selectedCustomServiceId, setSelectedCustomServiceId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // 初始化数据
  useEffect(() => {
    fetchGlobalConfig();
    fetchServices();
    if (currentAccountBook?.id) {
      fetchAccountActiveService(currentAccountBook.id);
    }
  }, [fetchGlobalConfig, fetchServices, fetchAccountActiveService, currentAccountBook?.id]);

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

  // 处理全局AI服务总开关
  const handleGlobalAIToggle = async (enabled: boolean) => {
    try {
      setIsProcessing(true);
      await updateGlobalConfig({ enabled });
      toast.success(enabled ? 'AI服务已启用' : 'AI服务已禁用');
      
      if (enabled) {
        // 如果启用了AI服务，继续到服务类型选择
        setCurrentWizardStep('service-type');
      } else {
        // 如果禁用了AI服务，直接完成设置
        toast.success('AI服务设置完成');
        goToFeatureIntro();
      }
    } catch (error) {
      console.error('切换全局AI服务状态失败:', error);
      toast.error('设置失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理服务类型选择
  const handleServiceTypeSelect = (type: 'official' | 'custom') => {
    setSelectedServiceType(type);
    if (type === 'official') {
      setCurrentWizardStep('confirmation');
    } else {
      setCurrentWizardStep('custom-service');
    }
  };

  // 处理自定义服务选择
  const handleCustomServiceSelect = (serviceId: string) => {
    setSelectedCustomServiceId(serviceId);
    setCurrentWizardStep('confirmation');
  };

  // 处理返回
  const handleBack = () => {
    if (currentWizardStep === 'service-type') {
      setCurrentWizardStep('global-toggle');
    } else if (currentWizardStep === 'custom-service') {
      setCurrentWizardStep('service-type');
    } else if (currentWizardStep === 'confirmation') {
      if (selectedServiceType === 'custom') {
        setCurrentWizardStep('custom-service');
      } else {
        setCurrentWizardStep('service-type');
      }
    }
  };

  // 处理配置确认
  const handleConfirm = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      if (selectedServiceType === 'official') {
        // 切换到官方服务
        await switchServiceType('official', undefined, currentAccountBook?.id);
        toast.success('已切换到官方AI服务');
      } else {
        // 切换到自定义服务
        if (!selectedCustomServiceId) {
          toast.error('请选择一个自定义AI服务');
          return;
        }
        await switchServiceType('custom', selectedCustomServiceId, currentAccountBook?.id);
        toast.success('已切换到自定义AI服务');
      }

      // 刷新当前账本的激活服务状态
      if (currentAccountBook?.id) {
        await fetchAccountActiveService(currentAccountBook.id);
      }

      toast.success('AI服务设置完成');
      goToFeatureIntro();
    } catch (error) {
      console.error('AI服务配置失败:', error);
      toast.error('配置失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  // 跳过AI服务设置
  const handleSkip = () => {
    toast.info('已跳过AI服务设置，您可以稍后在设置中配置');
    goToFeatureIntro();
  };

  // 获取当前步骤标题
  const getCurrentStepTitle = () => {
    switch (currentWizardStep) {
      case 'global-toggle': return '启用AI服务';
      case 'service-type': return '选择服务类型';
      case 'custom-service': return '选择自定义服务';
      case 'confirmation': return '确认配置';
      default: return '';
    }
  };

  return (
    <div className="onboarding-step">
      <div className="onboarding-step-title">开启AI服务</div>
      <div className="onboarding-step-description">
        启用智能AI服务，享受智能记账、自动分类等便捷功能
      </div>

      {/* 步骤进度指示器 */}
      <div className="ai-wizard-progress">
        <div className="progress-steps">
          {[1, 2, 3, 4].map((step, index) => {
            const stepNames = ['启用AI', '选择类型', '选择服务', '确认配置'];
            const isActive = 
              (currentWizardStep === 'global-toggle' && index === 0) ||
              (currentWizardStep === 'service-type' && index === 1) ||
              (currentWizardStep === 'custom-service' && index === 2) ||
              (currentWizardStep === 'confirmation' && index === 3);
            const isCompleted = 
              (currentWizardStep === 'service-type' && index === 0) ||
              (currentWizardStep === 'custom-service' && index <= 1) ||
              (currentWizardStep === 'confirmation' && index <= 2);
            const isSkipped = selectedServiceType === 'official' && index === 2;

            return (
              <div key={step} style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  backgroundColor: isCompleted ? 'var(--primary-color, rgb(59, 130, 246))' : 
                                  isActive ? 'var(--primary-background, rgba(59, 130, 246, 0.1))' : 
                                  'var(--border-color, #e5e7eb)',
                  color: isCompleted ? 'white' : 
                         isActive ? 'var(--primary-color, rgb(59, 130, 246))' : 
                         'var(--text-secondary, rgb(107, 114, 128))',
                  border: isActive ? '2px solid var(--primary-color, rgb(59, 130, 246))' : 'none',
                  opacity: isSkipped ? 0.5 : 1
                }}>
                  {isCompleted ? <i className="fas fa-check"></i> : step}
                </div>
                {index < 3 && (
                  <div style={{
                    height: '2px',
                    width: '60px',
                    backgroundColor: isCompleted ? 'var(--primary-color, rgb(59, 130, 246))' : 'var(--border-color, #e5e7eb)',
                    marginLeft: '8px',
                    marginRight: '8px',
                    opacity: isSkipped && index === 1 ? 0.5 : 1
                  }}></div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-secondary, rgb(107, 114, 128))',
          margin: '8px 0 0 0',
          textAlign: 'center'
        }}>
          当前步骤：{getCurrentStepTitle()}
        </p>
      </div>

      {/* 全局开关步骤 */}
      {currentWizardStep === 'global-toggle' && (
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
            <div className="toggle-options">
              <button
                className="toggle-option-button primary"
                onClick={() => handleGlobalAIToggle(true)}
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
                onClick={() => handleGlobalAIToggle(false)}
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
      )}

      {/* 服务类型选择步骤 */}
      {currentWizardStep === 'service-type' && (
        <div className="ai-wizard-content">
          <h4>选择AI服务类型</h4>
          <p>请选择您希望使用的AI服务类型：</p>

          <div className="service-type-options">
            <button
              className="service-type-button"
              onClick={() => handleServiceTypeSelect('official')}
              disabled={isProcessing}
            >
              <div className="service-type-icon">
                <i className="fas fa-crown"></i>
              </div>
              <div className="service-type-content">
                <div className="service-type-title">官方AI服务</div>
                <div className="service-type-description">
                  使用只为记账官方提供的AI服务，稳定可靠
                </div>
              </div>
            </button>

            <button
              className="service-type-button"
              onClick={() => handleServiceTypeSelect('custom')}
              disabled={isProcessing}
            >
              <div className="service-type-icon">
                <i className="fas fa-cog"></i>
              </div>
              <div className="service-type-content">
                <div className="service-type-title">自定义AI服务</div>
                <div className="service-type-description">
                  使用您自己配置的AI服务，如OpenAI、Claude等
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* 自定义服务选择步骤 */}
      {currentWizardStep === 'custom-service' && (
        <div className="ai-wizard-content">
          <h4>选择自定义AI服务</h4>
          <p>请从您已配置的自定义AI服务中选择一个：</p>

          {services.length === 0 ? (
            <div className="no-custom-services">
              <i className="fas fa-exclamation-triangle"></i>
              <p>您还没有配置任何自定义AI服务</p>
              <p>请先前往设置页面添加自定义AI服务配置</p>
              <button
                className="onboarding-button onboarding-button-secondary"
                onClick={() => setCurrentWizardStep('service-type')}
              >
                返回选择官方服务
              </button>
            </div>
          ) : (
            <div className="custom-services-list">
              {services.map((service) => (
                <button
                  key={service.id}
                  className={`custom-service-item ${selectedCustomServiceId === service.id ? 'selected' : ''}`}
                  onClick={() => handleCustomServiceSelect(service.id)}
                  disabled={isProcessing}
                >
                  <div className="custom-service-info">
                    <div className="custom-service-name">{service.name}</div>
                    <div className="custom-service-details">
                      {service.provider} · {service.model}
                    </div>
                    {service.description && (
                      <div className="custom-service-description">{service.description}</div>
                    )}
                  </div>
                  {selectedCustomServiceId === service.id && (
                    <div className="custom-service-selected">
                      <i className="fas fa-check-circle"></i>
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 确认配置步骤 */}
      {currentWizardStep === 'confirmation' && (
        <div className="ai-wizard-content">
          <h4>确认AI服务配置</h4>
          <p>请确认您的AI服务配置：</p>

          <div className="configuration-summary">
            <div className="summary-item">
              <div className="summary-label">全局AI服务</div>
              <div className="summary-value enabled">已启用</div>
            </div>
            <div className="summary-item">
              <div className="summary-label">服务类型</div>
              <div className="summary-value">
                {selectedServiceType === 'official' ? '官方AI服务' : '自定义AI服务'}
              </div>
            </div>
            {selectedServiceType === 'custom' && (
              <div className="summary-item">
                <div className="summary-label">选择的服务</div>
                <div className="summary-value">
                  {services.find(s => s.id === selectedCustomServiceId)?.name || '未选择'}
                </div>
              </div>
            )}
          </div>

          <div className="confirmation-actions">
            <button
              className="onboarding-button onboarding-button-primary"
              onClick={handleConfirm}
              disabled={isProcessing || (selectedServiceType === 'custom' && !selectedCustomServiceId)}
            >
              {isProcessing ? (
                <>
                  <span className="loading-spinner"></span>
                  配置中...
                </>
              ) : (
                '确认配置'
              )}
            </button>
          </div>
        </div>
      )}

      {/* 底部按钮组 */}
      <div className="onboarding-button-group">
        <button
          className="onboarding-button onboarding-button-secondary"
          onClick={currentWizardStep === 'global-toggle' ? previousStep : handleBack}
          disabled={isProcessing}
        >
          {currentWizardStep === 'global-toggle' ? '上一步' : '返回'}
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