'use client';

import { useState, useEffect } from 'react';
import { useGlobalAIStore } from '@/store/global-ai-store';
import { useAIServicesStore } from '@/store/ai-services-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { toast } from 'sonner';

interface AIServiceWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type WizardStep = 'service-type' | 'custom-service' | 'confirmation';

export function AIServiceWizard({ isOpen, onClose, onComplete }: AIServiceWizardProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('service-type');
  const [selectedServiceType, setSelectedServiceType] = useState<'official' | 'custom'>('official');
  const [selectedCustomServiceId, setSelectedCustomServiceId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const { currentAccountBook } = useAccountBookStore();
  const { services } = useAIServicesStore();
  const { 
    globalConfig,
    activeService,
    updateGlobalConfig,
    switchServiceType,
    fetchAccountActiveService
  } = useGlobalAIStore();

  // 初始化当前配置
  useEffect(() => {
    if (isOpen && globalConfig && activeService) {
      if (globalConfig.enabled && activeService.type === 'official') {
        setSelectedServiceType('official');
      } else if (activeService.type === 'custom') {
        setSelectedServiceType('custom');
        // 从服务列表中找到匹配的自定义服务
        const matchedService = services.find(service => 
          service.provider === activeService.provider && 
          service.model === activeService.model &&
          service.name === activeService.name
        );
        if (matchedService) {
          setSelectedCustomServiceId(matchedService.id);
        }
      }
    }
  }, [isOpen, globalConfig, activeService, services]);

  const handleServiceTypeSelect = (type: 'official' | 'custom') => {
    setSelectedServiceType(type);
    if (type === 'official') {
      setCurrentStep('confirmation');
    } else {
      setCurrentStep('custom-service');
    }
  };

  const handleCustomServiceSelect = (serviceId: string) => {
    setSelectedCustomServiceId(serviceId);
    setCurrentStep('confirmation');
  };

  const handleBack = () => {
    if (currentStep === 'custom-service') {
      setCurrentStep('service-type');
    } else if (currentStep === 'confirmation') {
      if (selectedServiceType === 'custom') {
        setCurrentStep('custom-service');
      } else {
        setCurrentStep('service-type');
      }
    }
  };

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

      onComplete();
      onClose();
    } catch (error) {
      console.error('AI服务配置失败:', error);
      toast.error('AI服务配置失败');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentStepName = () => {
    switch (currentStep) {
      case 'service-type': return '选择服务类型';
      case 'custom-service': return '选择自定义服务';
      case 'confirmation': return '确认配置';
      default: return '';
    }
  };

  const getCurrentServiceName = () => {
    if (selectedServiceType === 'official') {
      return '只为记账官方AI服务';
    } else {
      const service = services.find(s => s.id === selectedCustomServiceId);
      return service ? service.name : '未选择';
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'var(--card-background, white)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)'
      }}>
        {/* 头部 */}
        <div style={{
          padding: '24px 24px 16px 24px',
          borderBottom: '1px solid var(--border-color, #e5e7eb)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '8px'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text-primary, rgb(31, 41, 55))',
              margin: 0
            }}>
              AI服务设置向导
            </h2>
            <button
              onClick={onClose}
              disabled={isProcessing}
              style={{
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'none',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                cursor: 'pointer',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px'
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          {/* 步骤指示器 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '16px'
          }}>
            {[1, 2, 3].map((step, index) => {
              const stepTypes: WizardStep[] = ['service-type', 'custom-service', 'confirmation'];
              const isActive = stepTypes[index] === currentStep;
              const isCompleted = stepTypes.indexOf(currentStep) > index;
              const isSkipped = selectedServiceType === 'official' && stepTypes[index] === 'custom-service';
              
              return (
                <div key={step} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: isCompleted ? 'var(--primary-color, rgb(59, 130, 246))' : 
                                   isActive ? 'var(--primary-color, rgb(59, 130, 246))' : 
                                   isSkipped ? 'var(--border-color, #e5e7eb)' : 'var(--border-color, #e5e7eb)',
                    color: (isCompleted || isActive) ? 'white' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    fontWeight: '500',
                    opacity: isSkipped ? 0.5 : 1
                  }}>
                    {isCompleted ? <i className="fas fa-check"></i> : step}
                  </div>
                  {index < 2 && (
                    <div style={{
                      height: '2px',
                      flex: 1,
                      backgroundColor: isCompleted ? 'var(--primary-color, rgb(59, 130, 246))' : 'var(--border-color, #e5e7eb)',
                      marginLeft: '8px',
                      marginRight: '8px',
                      opacity: isSkipped && index === 0 ? 0.5 : 1
                    }}></div>
                  )}
                </div>
              );
            })}
          </div>
          
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary, rgb(107, 114, 128))',
            margin: '8px 0 0 0'
          }}>
            当前步骤：{getCurrentStepName()}
          </p>
        </div>

        {/* 内容区域 */}
        <div style={{
          padding: '24px',
          maxHeight: 'calc(90vh - 200px)',
          overflowY: 'auto'
        }}>
          {/* 步骤1：选择服务类型 */}
          {currentStep === 'service-type' && (
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-primary, rgb(31, 41, 55))',
                margin: '0 0 16px 0'
              }}>
                选择AI服务类型
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                margin: '0 0 24px 0'
              }}>
                请选择您要使用的AI服务类型：
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button
                  onClick={() => handleServiceTypeSelect('official')}
                  style={{
                    padding: '16px',
                    border: `2px solid ${selectedServiceType === 'official' ? 'var(--primary-color, rgb(59, 130, 246))' : 'var(--border-color, #e5e7eb)'}`,
                    borderRadius: '12px',
                    backgroundColor: selectedServiceType === 'official' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <i className="fas fa-cloud" style={{
                      fontSize: '20px',
                      color: 'var(--primary-color, rgb(59, 130, 246))',
                      marginTop: '2px'
                    }}></i>
                    <div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'var(--text-primary, rgb(31, 41, 55))',
                        margin: '0 0 4px 0'
                      }}>
                        官方AI服务
                      </h4>
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary, rgb(107, 114, 128))',
                        margin: 0
                      }}>
                        使用只为记账提供的官方AI服务，开箱即用，无需配置
                      </p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => handleServiceTypeSelect('custom')}
                  style={{
                    padding: '16px',
                    border: `2px solid ${selectedServiceType === 'custom' ? 'var(--primary-color, rgb(59, 130, 246))' : 'var(--border-color, #e5e7eb)'}`,
                    borderRadius: '12px',
                    backgroundColor: selectedServiceType === 'custom' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px'
                  }}>
                    <i className="fas fa-cog" style={{
                      fontSize: '20px',
                      color: 'var(--primary-color, rgb(59, 130, 246))',
                      marginTop: '2px'
                    }}></i>
                    <div>
                      <h4 style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'var(--text-primary, rgb(31, 41, 55))',
                        margin: '0 0 4px 0'
                      }}>
                        自定义AI服务
                      </h4>
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary, rgb(107, 114, 128))',
                        margin: 0
                      }}>
                        使用您自己配置的AI服务，支持多种AI提供商
                        {services.length === 0 && (
                          <span style={{ color: 'rgba(239, 68, 68, 0.8)', fontWeight: '500' }}>
                            {' '}（需要先添加自定义服务）
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* 步骤2：选择自定义服务 */}
          {currentStep === 'custom-service' && (
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-primary, rgb(31, 41, 55))',
                margin: '0 0 16px 0'
              }}>
                选择自定义AI服务
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                margin: '0 0 24px 0'
              }}>
                请选择要激活的自定义AI服务：
              </p>

              {services.length === 0 ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  border: '2px dashed var(--border-color, #e5e7eb)',
                  borderRadius: '12px'
                }}>
                  <i className="fas fa-plus-circle" style={{
                    fontSize: '32px',
                    color: 'var(--text-secondary, rgb(107, 114, 128))',
                    marginBottom: '12px'
                  }}></i>
                  <p style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary, rgb(107, 114, 128))',
                    margin: '0 0 16px 0'
                  }}>
                    您还没有添加任何自定义AI服务
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      // 这里可以触发添加新服务的模态框
                    }}
                    style={{
                      padding: '8px 16px',
                      backgroundColor: 'var(--primary-color, rgb(59, 130, 246))',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer'
                    }}
                  >
                    添加新服务
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleCustomServiceSelect(service.id)}
                      style={{
                        padding: '16px',
                        border: `2px solid ${selectedCustomServiceId === service.id ? 'var(--primary-color, rgb(59, 130, 246))' : 'var(--border-color, #e5e7eb)'}`,
                        borderRadius: '12px',
                        backgroundColor: selectedCustomServiceId === service.id ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px'
                      }}>
                        <i className="fas fa-robot" style={{
                          fontSize: '20px',
                          color: 'var(--primary-color, rgb(59, 130, 246))',
                          marginTop: '2px'
                        }}></i>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: 'var(--text-primary, rgb(31, 41, 55))',
                            margin: '0 0 4px 0'
                          }}>
                            {service.name}
                          </h4>
                          <p style={{
                            fontSize: '14px',
                            color: 'var(--text-secondary, rgb(107, 114, 128))',
                            margin: '0 0 4px 0'
                          }}>
                            {service.provider} · {service.model}
                          </p>
                          {service.description && (
                            <p style={{
                              fontSize: '12px',
                              color: 'var(--text-secondary, rgb(107, 114, 128))',
                              margin: 0
                            }}>
                              {service.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 步骤3：确认配置 */}
          {currentStep === 'confirmation' && (
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'var(--text-primary, rgb(31, 41, 55))',
                margin: '0 0 16px 0'
              }}>
                确认AI服务配置
              </h3>
              <p style={{
                fontSize: '14px',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                margin: '0 0 24px 0'
              }}>
                请确认您的AI服务配置：
              </p>

              <div style={{
                padding: '16px',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '12px'
                }}>
                  <i className={selectedServiceType === 'official' ? 'fas fa-cloud' : 'fas fa-cog'} style={{
                    fontSize: '20px',
                    color: 'var(--primary-color, rgb(59, 130, 246))'
                  }}></i>
                  <div>
                    <h4 style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'var(--text-primary, rgb(31, 41, 55))',
                      margin: '0 0 4px 0'
                    }}>
                      {getCurrentServiceName()}
                    </h4>
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary, rgb(107, 114, 128))',
                      margin: 0
                    }}>
                      {selectedServiceType === 'official' ? '官方AI服务' : '自定义AI服务'}
                    </p>
                  </div>
                </div>
                
                <div style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.1)'
                }}>
                  <p style={{
                    fontSize: '13px',
                    color: 'var(--text-primary, rgb(31, 41, 55))',
                    margin: '0 0 8px 0',
                    fontWeight: '500'
                  }}>
                    配置生效后：
                  </p>
                  <ul style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary, rgb(107, 114, 128))',
                    margin: 0,
                    paddingLeft: '16px'
                  }}>
                    <li>所有账本的AI功能将使用新的服务配置</li>
                    <li>智能记账和AI分析功能将立即生效</li>
                    <li>您可以随时回到此页面更改配置</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div style={{
          padding: '16px 24px 24px 24px',
          borderTop: '1px solid var(--border-color, #e5e7eb)',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          {currentStep !== 'service-type' && (
            <button
              onClick={handleBack}
              disabled={isProcessing}
              style={{
                padding: '12px 24px',
                border: '1px solid var(--border-color, #e5e7eb)',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                color: 'var(--text-primary, rgb(31, 41, 55))',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                opacity: isProcessing ? 0.6 : 1
              }}
            >
              上一步
            </button>
          )}
          
          <button
            onClick={onClose}
            disabled={isProcessing}
            style={{
              padding: '12px 24px',
              border: '1px solid var(--border-color, #e5e7eb)',
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary, rgb(107, 114, 128))',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              opacity: isProcessing ? 0.6 : 1
            }}
          >
            取消
          </button>

          {currentStep === 'confirmation' && (
            <button
              onClick={handleConfirm}
              disabled={isProcessing || (selectedServiceType === 'custom' && !selectedCustomServiceId)}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-color, rgb(59, 130, 246))',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                opacity: (isProcessing || (selectedServiceType === 'custom' && !selectedCustomServiceId)) ? 0.6 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              {isProcessing && (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '50%',
                  borderTopColor: 'white',
                  animation: 'spin 1s linear infinite'
                }}></div>
              )}
              {isProcessing ? '配置中...' : '完成配置'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 