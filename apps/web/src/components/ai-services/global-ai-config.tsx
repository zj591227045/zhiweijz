'use client';

import { useEffect, useState } from 'react';
import { useGlobalAIStore } from '@/store/global-ai-store';
import { toast } from 'sonner';
import { ServiceSwitchModal } from './service-switch-modal';

interface GlobalAIConfigProps {
  onServiceTypeChange: (type: 'official' | 'custom') => void;
  selectedType: 'official' | 'custom';
  hasCustomServices?: boolean; // 是否有自定义服务
}

export function GlobalAIConfig({ onServiceTypeChange, selectedType, hasCustomServices = false }: GlobalAIConfigProps) {
  const {
    globalConfig,
    isLoadingConfig,
    configError,
    fetchGlobalConfig,
    updateGlobalConfig,
    switchServiceType,
    testServiceConnection
  } = useGlobalAIStore();

  const [aiEnabled, setAiEnabled] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pendingSwitchType, setPendingSwitchType] = useState<'official' | 'custom' | null>(null);

  useEffect(() => {
    fetchGlobalConfig();
  }, [fetchGlobalConfig]);

  useEffect(() => {
    if (globalConfig) {
      setAiEnabled(globalConfig.enabled);
    }
  }, [globalConfig]);

  const handleAIToggle = async (enabled: boolean) => {
    if (isToggling) return;

    setIsToggling(true);
    try {
      await updateGlobalConfig({ enabled });
      setAiEnabled(enabled);

      if (!enabled) {
        // 如果关闭AI功能，显示提示信息
        toast.info('AI功能已关闭');
      } else {
        toast.success('AI功能已启用');
      }
    } catch (error) {
      // 如果更新失败，恢复原状态
      setAiEnabled(!enabled);
      console.error('切换AI功能失败:', error);
    } finally {
      setIsToggling(false);
    }
  };

  const handleServiceTypeChange = async (type: 'official' | 'custom') => {
    if (isSwitching) return;

    // 如果当前已经是选中的类型，不需要切换
    if (type === selectedType) {
      return;
    }

    // 显示确认模态框
    setPendingSwitchType(type);
    setShowSwitchModal(true);
  };

  const handleConfirmSwitch = async () => {
    if (!pendingSwitchType || isSwitching) return;

    setIsSwitching(true);
    setShowSwitchModal(false);

    try {
      if (pendingSwitchType === 'official') {
        // 切换到官方服务
        await switchServiceType('official');
        onServiceTypeChange('official');
        toast.success('已切换到官方AI服务');
      } else {
        // 切换到自定义服务类型
        // 对于自定义服务，我们只需要禁用全局AI配置，具体的服务选择由用户在自定义服务列表中进行
        try {
          // 先禁用全局AI配置（不指定serviceId，只是切换类型）
          await updateGlobalConfig({ enabled: false });
          onServiceTypeChange('custom');
          
          // 如果没有可用的自定义服务，给出提示
          if (!hasCustomServices) {
            toast.info('已切换到自定义服务模式，请添加并选择自定义AI服务');
          } else {
            toast.success('已切换到自定义AI服务模式，请选择具体的服务');
          }
        } catch (error) {
          console.error('切换到自定义服务模式失败:', error);
          throw error;
        }
      }

    } catch (error) {
      console.error('切换服务类型失败:', error);
      toast.error('切换服务类型失败');
    } finally {
      setIsSwitching(false);
      setPendingSwitchType(null);
    }
  };

  const handleCancelSwitch = () => {
    setShowSwitchModal(false);
    setPendingSwitchType(null);
  };

  if (isLoadingConfig) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--card-background, white)',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        marginBottom: '16px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            width: '20px',
            height: '20px',
            border: '2px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '50%',
            borderTopColor: 'var(--primary-color, rgb(59, 130, 246))',
            animation: 'spin 1s linear infinite',
            marginRight: '8px'
          }}></div>
          <span style={{ color: 'var(--text-secondary, rgb(107, 114, 128))' }}>
            加载AI配置中...
          </span>
        </div>
      </div>
    );
  }

  if (configError) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--card-background, white)',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        marginBottom: '16px',
        border: '1px solid rgba(239, 68, 68, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: 'rgb(239, 68, 68)'
        }}>
          <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
          <span>{configError}</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'var(--card-background, white)',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      marginBottom: '16px',
      overflow: 'hidden'
    }}>
      {/* AI功能总开关 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-color, #e5e7eb)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'var(--text-primary, rgb(31, 41, 55))',
              margin: '0 0 4px 0'
            }}>
              AI功能
            </h3>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary, rgb(107, 114, 128))',
              margin: 0
            }}>
              启用或禁用智能记账和AI分析功能
            </p>
          </div>
          <label style={{
            position: 'relative',
            display: 'inline-block',
            width: '48px',
            height: '28px'
          }}>
            <input
              type="checkbox"
              checked={aiEnabled}
              onChange={(e) => handleAIToggle(e.target.checked)}
              disabled={isToggling || isLoadingConfig}
              style={{
                opacity: 0,
                width: 0,
                height: 0
              }}
            />
            <span style={{
              position: 'absolute',
              cursor: 'pointer',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: aiEnabled ? 'var(--primary-color, rgb(59, 130, 246))' : '#ccc',
              borderRadius: '28px',
              transition: '0.3s',
              '&:before': {
                position: 'absolute',
                content: '""',
                height: '20px',
                width: '20px',
                left: aiEnabled ? '24px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.3s'
              }
            } as any}>
              <span style={{
                position: 'absolute',
                content: '""',
                height: '20px',
                width: '20px',
                left: aiEnabled ? '24px' : '4px',
                bottom: '4px',
                backgroundColor: 'white',
                borderRadius: '50%',
                transition: '0.3s'
              }}></span>
            </span>
          </label>
        </div>
      </div>

      {/* AI服务选择 */}
      {aiEnabled && (
        <div style={{ padding: '16px' }}>
          <h4 style={{
            fontSize: '14px',
            fontWeight: '600',
            color: 'var(--text-primary, rgb(31, 41, 55))',
            margin: '0 0 12px 0'
          }}>
            AI服务类型
          </h4>
          <div style={{
            display: 'flex',
            gap: '8px'
          }}>
            <button
              onClick={() => handleServiceTypeChange('official')}
              disabled={isSwitching || !aiEnabled}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: `2px solid ${selectedType === 'official' ? 'var(--primary-color, rgb(59, 130, 246))' : 'var(--border-color, #e5e7eb)'}`,
                borderRadius: '8px',
                backgroundColor: selectedType === 'official' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                color: selectedType === 'official' ? 'var(--primary-color, rgb(59, 130, 246))' : 'var(--text-primary, rgb(31, 41, 55))',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (isSwitching || !aiEnabled) ? 'not-allowed' : 'pointer',
                opacity: (isSwitching || !aiEnabled) ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isSwitching && selectedType !== 'official' ? (
                <>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '50%',
                    borderTopColor: 'currentColor',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px',
                    display: 'inline-block'
                  }}></div>
                  切换中...
                </>
              ) : (
                <>
                  <i className="fas fa-cloud" style={{ marginRight: '8px' }}></i>
                  官方服务
                </>
              )}
            </button>
            <button
              onClick={() => handleServiceTypeChange('custom')}
              disabled={isSwitching || !aiEnabled}
              style={{
                flex: 1,
                padding: '12px 16px',
                border: `2px solid ${selectedType === 'custom' ? 'var(--primary-color, rgb(59, 130, 246))' : 'var(--border-color, #e5e7eb)'}`,
                borderRadius: '8px',
                backgroundColor: selectedType === 'custom' ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                color: selectedType === 'custom' ? 'var(--primary-color, rgb(59, 130, 246))' : 'var(--text-primary, rgb(31, 41, 55))',
                fontSize: '14px',
                fontWeight: '500',
                cursor: (isSwitching || !aiEnabled) ? 'not-allowed' : 'pointer',
                opacity: (isSwitching || !aiEnabled) ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              {isSwitching && selectedType !== 'custom' ? (
                <>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    border: '2px solid rgba(0, 0, 0, 0.1)',
                    borderRadius: '50%',
                    borderTopColor: 'currentColor',
                    animation: 'spin 1s linear infinite',
                    marginRight: '8px',
                    display: 'inline-block'
                  }}></div>
                  切换中...
                </>
              ) : (
                <>
                  <i className="fas fa-cog" style={{ marginRight: '8px' }}></i>
                  自定义服务
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* 服务切换确认模态框 */}
      <ServiceSwitchModal
        isOpen={showSwitchModal}
        onClose={handleCancelSwitch}
        onConfirm={handleConfirmSwitch}
        fromType={selectedType}
        toType={pendingSwitchType || 'custom'}
        serviceName={pendingSwitchType === 'official' ? '只为记账官方AI服务' : '自定义AI服务'}
      />
    </div>
  );
}
