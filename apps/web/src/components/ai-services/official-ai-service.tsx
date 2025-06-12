'use client';

import { useEffect, useState } from 'react';
import { useGlobalAIStore } from '@/store/global-ai-store';
import { useAccountBookStore } from '@/store/account-book-store';

export function OfficialAIService() {
  const {
    serviceStatus,
    activeService,
    isLoadingStatus,
    isLoadingActiveService,
    statusError,
    activeServiceError,
    fetchServiceStatus,
    fetchAccountActiveService
  } = useGlobalAIStore();

  const { currentAccountBook } = useAccountBookStore();

  useEffect(() => {
    fetchServiceStatus();
    if (currentAccountBook?.id) {
      fetchAccountActiveService(currentAccountBook.id);
    }
  }, [fetchServiceStatus, fetchAccountActiveService, currentAccountBook?.id]);

  const handleRefresh = () => {
    fetchServiceStatus();
    if (currentAccountBook?.id) {
      fetchAccountActiveService(currentAccountBook.id);
    }
  };

  // 从激活服务中获取使用量数据
  const todayUsage = activeService?.type === 'official' ? {
    usedTokens: activeService.usedTokens || 0,
    dailyLimit: activeService.dailyTokenLimit || 50000,
    remainingTokens: (activeService.dailyTokenLimit || 50000) - (activeService.usedTokens || 0),
    usagePercentage: Math.round(((activeService.usedTokens || 0) / (activeService.dailyTokenLimit || 50000)) * 100),
    totalCalls: 0,
    successfulCalls: 0,
    failedCalls: 0
  } : null;

  const isLoadingUsage = isLoadingActiveService;
  const usageError = activeService?.type !== 'official' && !isLoadingActiveService ? '当前未启用官方AI服务' : activeServiceError;

  return (
    <div style={{
      backgroundColor: 'var(--card-background, white)',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      marginBottom: '16px',
      overflow: 'hidden'
    }}>
      {/* 头部 */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-color, #e5e7eb)',
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
            官方AI服务
          </h3>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary, rgb(107, 114, 128))',
            margin: 0
          }}>
            由只为记账官方提供的AI智能服务
          </p>
        </div>
        <button
          onClick={handleRefresh}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-primary, rgb(31, 41, 55))',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--muted, rgba(0, 0, 0, 0.05))';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <i className="fas fa-sync-alt"></i>
        </button>
      </div>

      {/* 服务状态 */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color, #e5e7eb)' }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary, rgb(31, 41, 55))',
          margin: '0 0 12px 0'
        }}>
          服务状态
        </h4>
        
        {isLoadingStatus ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: 'var(--muted, rgb(243, 244, 246))',
            borderRadius: '8px'
          }}>
            <div style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(0, 0, 0, 0.1)',
              borderRadius: '50%',
              borderTopColor: 'var(--primary-color, rgb(59, 130, 246))',
              animation: 'spin 1s linear infinite',
              marginRight: '8px'
            }}></div>
            <span style={{ fontSize: '14px', color: 'var(--text-secondary, rgb(107, 114, 128))' }}>
              检查服务状态中...
            </span>
          </div>
        ) : statusError ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            color: 'rgb(239, 68, 68)'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            <span style={{ fontSize: '14px' }}>{statusError}</span>
          </div>
        ) : serviceStatus ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: serviceStatus.isOnline ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: serviceStatus.isOnline ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
              marginRight: '8px'
            }}></div>
            <span style={{
              fontSize: '14px',
              color: serviceStatus.isOnline ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
              fontWeight: '500'
            }}>
              {serviceStatus.isOnline ? '服务正常' : '服务异常'}
            </span>
            {serviceStatus.responseTime && (
              <span style={{
                fontSize: '12px',
                color: 'var(--text-secondary, rgb(107, 114, 128))',
                marginLeft: '8px'
              }}>
                响应时间: {serviceStatus.responseTime}ms
              </span>
            )}
          </div>
        ) : null}
      </div>

      {/* TOKEN使用量 */}
      <div style={{ padding: '16px' }}>
        <h4 style={{
          fontSize: '14px',
          fontWeight: '600',
          color: 'var(--text-primary, rgb(31, 41, 55))',
          margin: '0 0 12px 0'
        }}>
          今日TOKEN使用量
        </h4>

        {isLoadingUsage ? (
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
            <span style={{ fontSize: '14px', color: 'var(--text-secondary, rgb(107, 114, 128))' }}>
              加载使用量数据...
            </span>
          </div>
        ) : usageError ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderRadius: '8px',
            color: 'rgb(239, 68, 68)'
          }}>
            <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }}></i>
            <span style={{ fontSize: '14px' }}>{usageError}</span>
          </div>
        ) : todayUsage ? (
          <div>
            {/* 使用量进度条 */}
            <div style={{
              backgroundColor: 'var(--muted, rgb(243, 244, 246))',
              borderRadius: '8px',
              height: '8px',
              marginBottom: '12px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${Math.min(todayUsage.usagePercentage, 100)}%`,
                height: '100%',
                backgroundColor: todayUsage.usagePercentage > 80 ? 'rgb(239, 68, 68)' : 'var(--primary-color, rgb(59, 130, 246))',
                borderRadius: '8px',
                transition: 'width 0.3s ease'
              }}></div>
            </div>

            {/* 使用量统计 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--muted, rgb(243, 244, 246))',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--text-primary, rgb(31, 41, 55))',
                  marginBottom: '4px'
                }}>
                  {todayUsage.usedTokens.toLocaleString()}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary, rgb(107, 114, 128))'
                }}>
                  已使用TOKEN
                </div>
              </div>
              <div style={{
                padding: '12px',
                backgroundColor: 'var(--muted, rgb(243, 244, 246))',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--text-primary, rgb(31, 41, 55))',
                  marginBottom: '4px'
                }}>
                  {todayUsage.remainingTokens.toLocaleString()}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary, rgb(107, 114, 128))'
                }}>
                  剩余TOKEN
                </div>
              </div>
            </div>

            {/* 额度信息 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '14px',
              color: 'var(--text-secondary, rgb(107, 114, 128))'
            }}>
              <span>每日免费额度: {todayUsage.dailyLimit.toLocaleString()} TOKEN</span>
              <span>使用率: {todayUsage.usagePercentage}%</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
