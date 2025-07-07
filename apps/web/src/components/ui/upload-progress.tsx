'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * 上传进度状态
 */
export type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

/**
 * 上传进度属性
 */
interface UploadProgressProps {
  isVisible: boolean;
  status: UploadStatus;
  progress?: number; // 0-100
  message?: string;
  error?: string;
  onClose?: () => void;
  autoClose?: boolean; // 成功后自动关闭
  autoCloseDelay?: number; // 自动关闭延迟（毫秒）
}

/**
 * 上传进度组件
 */
export function UploadProgress({
  isVisible,
  status,
  progress = 0,
  message,
  error,
  onClose,
  autoClose = true,
  autoCloseDelay = 2000,
}: UploadProgressProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 自动关闭逻辑
  useEffect(() => {
    if (status === 'success' && autoClose && onClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [status, autoClose, autoCloseDelay, onClose]);

  if (!isVisible || !mounted) return null;

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'uploading':
        return (
          <div className="upload-spinner" style={{
            width: '24px',
            height: '24px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007AFF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        );
      case 'processing':
        return (
          <div className="processing-icon" style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
          }}>
            ⚙️
          </div>
        );
      case 'success':
        return (
          <div className="success-icon" style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: '#34C759',
          }}>
            ✓
          </div>
        );
      case 'error':
        return (
          <div className="error-icon" style={{
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '16px',
            color: '#FF3B30',
          }}>
            ✕
          </div>
        );
      default:
        return null;
    }
  };

  // 获取状态颜色
  const getStatusColor = () => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return '#007AFF';
      case 'success':
        return '#34C759';
      case 'error':
        return '#FF3B30';
      default:
        return '#666';
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    if (message) return message;
    
    switch (status) {
      case 'uploading':
        return '正在上传...';
      case 'processing':
        return '正在处理...';
      case 'success':
        return '上传成功！';
      case 'error':
        return error || '上传失败';
      default:
        return '';
    }
  };

  const modalContent = (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes slideIn {
            from {
              transform: translateY(-20px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          
          .upload-progress-modal {
            animation: slideIn 0.3s ease-out;
          }
        `}
      </style>
      
      <div
        className="upload-progress-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 10001,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
        onClick={status === 'error' ? onClose : undefined}
      >
        <div
          className="upload-progress-modal"
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            minWidth: '300px',
            maxWidth: '400px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 状态图标 */}
          <div className="status-icon">
            {getStatusIcon()}
          </div>

          {/* 状态文本 */}
          <div
            className="status-text"
            style={{
              fontSize: '16px',
              fontWeight: '500',
              color: getStatusColor(),
              textAlign: 'center',
            }}
          >
            {getStatusText()}
          </div>

          {/* 进度条 */}
          {(status === 'uploading' || status === 'processing') && (
            <div
              className="progress-container"
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#f0f0f0',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                className="progress-bar"
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: getStatusColor(),
                  borderRadius: '2px',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          )}

          {/* 错误详情 */}
          {status === 'error' && error && (
            <div
              className="error-details"
              style={{
                fontSize: '14px',
                color: '#666',
                textAlign: 'center',
                backgroundColor: '#f8f8f8',
                padding: '12px',
                borderRadius: '8px',
                width: '100%',
              }}
            >
              {error}
            </div>
          )}

          {/* 操作按钮 */}
          {(status === 'error' || status === 'success') && onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: getStatusColor(),
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                minWidth: '80px',
              }}
            >
              {status === 'error' ? '重试' : '确定'}
            </button>
          )}
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}

/**
 * 上传进度Hook
 */
export function useUploadProgress() {
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();

  const show = (initialStatus: UploadStatus = 'uploading', initialMessage?: string) => {
    setStatus(initialStatus);
    setMessage(initialMessage);
    setProgress(0);
    setError(undefined);
    setIsVisible(true);
  };

  const hide = () => {
    setIsVisible(false);
    setStatus('idle');
    setProgress(0);
    setMessage(undefined);
    setError(undefined);
  };

  const updateProgress = (newProgress: number, newMessage?: string) => {
    setProgress(Math.max(0, Math.min(100, newProgress)));
    if (newMessage) setMessage(newMessage);
  };

  const setSuccess = (successMessage?: string) => {
    setStatus('success');
    setProgress(100);
    setMessage(successMessage);
    setError(undefined);
  };

  const setErrorStatus = (errorMessage: string) => {
    setStatus('error');
    setError(errorMessage);
  };

  const setProcessing = (processingMessage?: string) => {
    setStatus('processing');
    setMessage(processingMessage);
  };

  return {
    isVisible,
    status,
    progress,
    message,
    error,
    show,
    hide,
    updateProgress,
    setSuccess,
    setError: setErrorStatus,
    setProcessing,
  };
}
