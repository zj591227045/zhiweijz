'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';

interface ServiceSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  fromType: 'official' | 'custom';
  toType: 'official' | 'custom';
  serviceName?: string;
}

export function ServiceSwitchModal({
  isOpen,
  onClose,
  onConfirm,
  fromType,
  toType,
  serviceName
}: ServiceSwitchModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 防止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('service-switch-modal-open');
      return () => {
        document.body.style.overflow = '';
        document.body.classList.remove('service-switch-modal-open');
      };
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error('切换服务失败:', error);
      toast.error('切换服务失败');
    } finally {
      setIsConfirming(false);
    }
  };

  const getServiceTypeName = (type: 'official' | 'custom') => {
    return type === 'official' ? '官方服务' : '自定义服务';
  };

  const modalContent = (
    <div className="service-switch-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10000003, // 使用极高的z-index确保在最顶层
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      // 确保模态框可见和可交互
      visibility: 'visible',
      opacity: 1,
      pointerEvents: 'auto',
      // 移动端优化
      WebkitOverflowScrolling: 'touch',
      overflowY: 'auto',
      // 强制硬件加速
      transform: 'translateZ(0)',
      WebkitTransform: 'translateZ(0)',
      // 确保在所有设备上都能正确显示
      WebkitBackfaceVisibility: 'hidden',
      backfaceVisibility: 'hidden'
    }}>
      <div style={{
        backgroundColor: 'var(--card-background, white)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '400px',
        width: '100%',
        maxHeight: '90vh',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
        // 确保内容容器在最顶层
        position: 'relative',
        zIndex: 1,
        // 确保可见性
        visibility: 'visible',
        opacity: 1,
        // 强制硬件加速
        transform: 'translateZ(0)',
        WebkitTransform: 'translateZ(0)',
        // 移动端优化
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        // 防止内容被裁剪
        contain: 'none'
      }}>
        {/* 头部 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '12px'
          }}>
            <i className="fas fa-exchange-alt" style={{
              color: 'var(--primary-color, rgb(59, 130, 246))',
              fontSize: '18px'
            }}></i>
          </div>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: 'var(--text-primary, rgb(31, 41, 55))',
            margin: 0
          }}>
            切换AI服务
          </h3>
        </div>

        {/* 内容 */}
        <div style={{
          marginBottom: '24px',
          lineHeight: '1.6'
        }}>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-secondary, rgb(107, 114, 128))',
            margin: '0 0 12px 0'
          }}>
            您即将从 <strong>{getServiceTypeName(fromType)}</strong> 切换到 <strong>{getServiceTypeName(toType)}</strong>
            {serviceName && ` (${serviceName})`}。
          </p>
          
          <div style={{
            padding: '12px',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            borderRadius: '8px',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px'
            }}>
              <i className="fas fa-info-circle" style={{
                color: 'var(--primary-color, rgb(59, 130, 246))',
                fontSize: '14px',
                marginTop: '2px'
              }}></i>
              <div style={{
                fontSize: '13px',
                color: 'var(--text-primary, rgb(31, 41, 55))'
              }}>
                <strong>切换影响：</strong>
                <ul style={{
                  margin: '4px 0 0 0',
                  paddingLeft: '16px'
                }}>
                  <li>所有账本的AI功能将使用新的服务配置</li>
                  <li>正在进行的AI任务可能会中断</li>
                  <li>新服务的配置将立即生效</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 按钮 */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClose}
            disabled={isConfirming}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: '1px solid var(--border-color, #e5e7eb)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary, rgb(107, 114, 128))',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isConfirming ? 'not-allowed' : 'pointer',
              opacity: isConfirming ? 0.6 : 1,
              transition: 'all 0.2s'
            }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--primary-color, rgb(59, 130, 246))',
              color: 'white',
              fontSize: '14px',
              fontWeight: '500',
              cursor: isConfirming ? 'not-allowed' : 'pointer',
              opacity: isConfirming ? 0.8 : 1,
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isConfirming && (
              <div style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                borderTopColor: 'white',
                animation: 'spin 1s linear infinite'
              }}></div>
            )}
            {isConfirming ? '切换中...' : '确认切换'}
          </button>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* 确保服务切换模态框在最顶层 */
        .service-switch-modal-overlay {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          right: 0 !important;
          bottom: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 10000003 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background-color: rgba(0, 0, 0, 0.5) !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }

        /* 防止其他样式干扰 */
        body.service-switch-modal-open {
          overflow: hidden !important;
        }

        /* 确保模态框内容可见 */
        .service-switch-modal-overlay > div {
          position: relative !important;
          z-index: 1 !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
      `}</style>
    </div>
  );

  // 使用Portal将模态框渲染到body级别
  return createPortal(modalContent, document.body);
}
