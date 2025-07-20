'use client';

import { useEffect } from 'react';
import { useGlobalAIStore } from '@/store/global-ai-store';
import { useAccountBookStore } from '@/store/account-book-store';

interface CurrentAIServiceProps {
  onOpenWizard: () => void;
}

export function CurrentAIService({ onOpenWizard }: CurrentAIServiceProps) {
  const { currentAccountBook } = useAccountBookStore();
  const {
    globalConfig,
    activeService,
    isLoadingConfig,
    isLoadingActiveService,
    configError,
    activeServiceError,
    fetchGlobalConfig,
    fetchAccountActiveService,
  } = useGlobalAIStore();

  useEffect(() => {
    fetchGlobalConfig();
    if (currentAccountBook?.id) {
      fetchAccountActiveService(currentAccountBook.id);
    }
  }, [fetchGlobalConfig, fetchAccountActiveService, currentAccountBook?.id]);

  const isAIEnabled = globalConfig?.enabled || activeService?.type === 'custom';
  const isLoading = isLoadingConfig || isLoadingActiveService;

  if (isLoading) {
    return (
      <div
        style={{
          backgroundColor: 'var(--card-background, white)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          marginBottom: '16px',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '50%',
              borderTopColor: 'var(--primary-color, rgb(59, 130, 246))',
              animation: 'spin 1s linear infinite',
            }}
          ></div>
          <span
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary, rgb(107, 114, 128))',
            }}
          >
            加载AI服务状态中...
          </span>
        </div>
      </div>
    );
  }

  if (configError || activeServiceError) {
    return (
      <div
        style={{
          backgroundColor: 'var(--card-background, white)',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
          marginBottom: '16px',
          padding: '24px',
          border: '1px solid rgba(239, 68, 68, 0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <i
            className="fas fa-exclamation-triangle"
            style={{
              fontSize: '20px',
              color: 'rgb(239, 68, 68)',
            }}
          ></i>
          <div>
            <h3
              style={{
                fontSize: '16px',
                fontWeight: '600',
                color: 'rgb(239, 68, 68)',
                margin: '0 0 4px 0',
              }}
            >
              AI服务状态错误
            </h3>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                margin: 0,
              }}
            >
              {configError || activeServiceError}
            </p>
          </div>
        </div>

        <button
          onClick={onOpenWizard}
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--primary-color, rgb(59, 130, 246))',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <i className="fas fa-magic"></i>
          重新配置AI服务
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: 'var(--card-background, white)',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
        marginBottom: '16px',
        overflow: 'hidden',
      }}
    >
      {/* 头部 */}
      <div
        style={{
          padding: '20px 24px 16px 24px',
          borderBottom: '1px solid var(--border-color, #e5e7eb)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: isAIEnabled
                  ? 'rgba(59, 130, 246, 0.1)'
                  : 'rgba(107, 114, 128, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <i
                className="fas fa-robot"
                style={{
                  fontSize: '20px',
                  color: isAIEnabled
                    ? 'var(--primary-color, rgb(59, 130, 246))'
                    : 'var(--text-secondary, rgb(107, 114, 128))',
                }}
              ></i>
            </div>
            <div>
              <h3
                style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--text-primary, rgb(31, 41, 55))',
                  margin: '0 0 4px 0',
                }}
              >
                当前AI服务
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: isAIEnabled
                      ? 'rgba(34, 197, 94, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    color: isAIEnabled ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                  }}
                >
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: isAIEnabled ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                    }}
                  ></div>
                  {isAIEnabled ? '已启用' : '未启用'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onOpenWizard}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--primary-color, rgb(59, 130, 246))',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <i className="fas fa-magic"></i>
            设置向导
          </button>
        </div>
      </div>

      {/* 服务详情 */}
      <div style={{ padding: '20px 24px 24px 24px' }}>
        {!isAIEnabled ? (
          <div
            style={{
              textAlign: 'center',
              padding: '20px',
            }}
          >
            <i
              className="fas fa-robot"
              style={{
                fontSize: '32px',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                marginBottom: '12px',
              }}
            ></i>
            <p
              style={{
                fontSize: '16px',
                fontWeight: '500',
                color: 'var(--text-primary, rgb(31, 41, 55))',
                margin: '0 0 8px 0',
              }}
            >
              AI功能未启用
            </p>
            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                margin: '0 0 20px 0',
              }}
            >
              启用AI功能后，您可以享受智能记账和AI分析等功能
            </p>
            <button
              onClick={onOpenWizard}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--primary-color, rgb(59, 130, 246))',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto',
              }}
            >
              <i className="fas fa-magic"></i>
              开始配置AI服务
            </button>
          </div>
        ) : (
          <div>
            {/* 服务信息 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor:
                    activeService?.type === 'official'
                      ? 'rgba(59, 130, 246, 0.1)'
                      : 'rgba(139, 69, 19, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <i
                  className={activeService?.type === 'official' ? 'fas fa-cloud' : 'fas fa-cog'}
                  style={{
                    fontSize: '24px',
                    color:
                      activeService?.type === 'official'
                        ? 'var(--primary-color, rgb(59, 130, 246))'
                        : 'rgb(139, 69, 19)',
                  }}
                ></i>
              </div>
              <div style={{ flex: 1 }}>
                <h4
                  style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: 'var(--text-primary, rgb(31, 41, 55))',
                    margin: '0 0 4px 0',
                  }}
                >
                  {activeService?.name ||
                    (activeService?.type === 'official' ? '只为记账官方AI服务' : '自定义AI服务')}
                </h4>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary, rgb(107, 114, 128))',
                    margin: '0 0 8px 0',
                  }}
                >
                  {activeService?.type === 'official' ? '官方AI服务' : '自定义AI服务'}
                  {activeService?.type === 'custom' &&
                    activeService?.provider &&
                    activeService?.model && (
                      <span>
                        {' '}
                        · {activeService.provider} · {activeService.model}
                      </span>
                    )}
                </p>
                {activeService?.description && (
                  <p
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary, rgb(107, 114, 128))',
                      margin: 0,
                    }}
                  >
                    {activeService.description}
                  </p>
                )}
              </div>
            </div>

            {/* 使用量信息（仅官方服务） */}
            {activeService?.type === 'official' && activeService.usedTokens !== undefined && (
              <div
                style={{
                  padding: '16px',
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  borderRadius: '8px',
                  border: '1px solid rgba(59, 130, 246, 0.1)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: 'var(--text-primary, rgb(31, 41, 55))',
                    }}
                  >
                    今日使用量
                  </span>
                  <span
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'var(--primary-color, rgb(59, 130, 246))',
                    }}
                  >
                    {activeService.usedTokens} / {activeService.dailyTokenLimit} Tokens
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '6px',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      backgroundColor: 'var(--primary-color, rgb(59, 130, 246))',
                      width: `${Math.min((activeService.usedTokens / activeService.dailyTokenLimit) * 100, 100)}%`,
                      transition: 'width 0.3s ease',
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* 功能列表 */}
            <div
              style={{
                marginTop: '20px',
                padding: '16px 0 0 0',
                borderTop: '1px solid var(--border-color, #e5e7eb)',
              }}
            >
              <h5
                style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: 'var(--text-primary, rgb(31, 41, 55))',
                  margin: '0 0 12px 0',
                }}
              >
                可用功能
              </h5>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                  gap: '8px',
                }}
              >
                {[
                  { icon: 'fas fa-calculator', name: '智能记账' },
                  { icon: 'fas fa-chart-line', name: 'AI分析' },
                  { icon: 'fas fa-tags', name: '智能分类' },
                  { icon: 'fas fa-lightbulb', name: '消费建议' },
                ].map((feature) => (
                  <div
                    key={feature.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '13px',
                      color: 'var(--text-secondary, rgb(107, 114, 128))',
                    }}
                  >
                    <i
                      className={feature.icon}
                      style={{
                        color: 'var(--primary-color, rgb(59, 130, 246))',
                      }}
                    ></i>
                    <span>{feature.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
