'use client';

import { useState, useEffect } from 'react';
import { tokenManager } from '@/lib/token-manager';

interface TokenErrorState {
  hasError: boolean;
  errorType: 'network' | 'server' | 'auth' | null;
  retryCount: number;
  nextRetryTime: number | null;
}

/**
 * Token错误处理组件
 * 提供用户友好的错误提示和重试机制
 */
export function TokenErrorHandler() {
  const [errorState, setErrorState] = useState<TokenErrorState>({
    hasError: false,
    errorType: null,
    retryCount: 0,
    nextRetryTime: null,
  });

  const [countdown, setCountdown] = useState<number>(0);

  // 监听token状态变化
  useEffect(() => {
    const handleTokenError = (error: any) => {
      const isNetworkError = !error.response;
      const isServerError = error.response?.status >= 500;
      const isAuthError = error.response?.status === 401;

      let errorType: 'network' | 'server' | 'auth' | null = null;
      if (isNetworkError) errorType = 'network';
      else if (isServerError) errorType = 'server';
      else if (isAuthError) errorType = 'auth';

      setErrorState((prev) => ({
        hasError: true,
        errorType,
        retryCount: prev.retryCount + 1,
        nextRetryTime:
          errorType === 'network'
            ? Date.now() + 5 * 60 * 1000
            : errorType === 'server'
              ? Date.now() + 2 * 60 * 1000
              : null,
      }));
    };

    const handleTokenSuccess = () => {
      setErrorState({
        hasError: false,
        errorType: null,
        retryCount: 0,
        nextRetryTime: null,
      });
    };

    // 这里应该添加实际的事件监听器
    // tokenManager.addErrorListener(handleTokenError);
    // tokenManager.addSuccessListener(handleTokenSuccess);

    return () => {
      // tokenManager.removeErrorListener(handleTokenError);
      // tokenManager.removeSuccessListener(handleTokenSuccess);
    };
  }, []);

  // 倒计时逻辑
  useEffect(() => {
    if (!errorState.nextRetryTime) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((errorState.nextRetryTime! - Date.now()) / 1000));
      setCountdown(remaining);

      if (remaining === 0) {
        setErrorState((prev) => ({ ...prev, nextRetryTime: null }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [errorState.nextRetryTime]);

  // 手动重试
  const handleRetry = async () => {
    try {
      const success = await tokenManager.refreshToken();
      if (success) {
        setErrorState({
          hasError: false,
          errorType: null,
          retryCount: 0,
          nextRetryTime: null,
        });
      }
    } catch (error) {
      console.error('手动重试失败:', error);
    }
  };

  // 如果没有错误，不显示组件
  if (!errorState.hasError) return null;

  const getErrorMessage = () => {
    switch (errorState.errorType) {
      case 'network':
        return '网络连接异常，请检查网络设置';
      case 'server':
        return '服务器暂时不可用，请稍后重试';
      case 'auth':
        return '登录状态已过期，请重新登录';
      default:
        return '连接异常，请重试';
    }
  };

  const getRetryText = () => {
    if (countdown > 0) {
      return `${countdown}秒后自动重试`;
    }
    return '立即重试';
  };

  return (
    <div className="token-error-handler">
      <div className="error-banner">
        <div className="error-content">
          <i
            className={`fas ${
              errorState.errorType === 'network'
                ? 'fa-wifi'
                : errorState.errorType === 'server'
                  ? 'fa-server'
                  : 'fa-exclamation-triangle'
            }`}
          ></i>
          <div className="error-text">
            <div className="error-message">{getErrorMessage()}</div>
            {errorState.retryCount > 1 && (
              <div className="retry-count">已重试 {errorState.retryCount - 1} 次</div>
            )}
          </div>
        </div>

        <div className="error-actions">
          {errorState.errorType === 'auth' ? (
            <button
              className="error-button primary"
              onClick={() => (window.location.href = '/auth/login')}
            >
              重新登录
            </button>
          ) : (
            <button className="error-button" onClick={handleRetry} disabled={countdown > 0}>
              {getRetryText()}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .token-error-handler {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 9998;
          pointer-events: none;
        }

        .error-banner {
          background: var(--error-color, #ff4757);
          color: white;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          pointer-events: auto;
        }

        .error-content {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .error-content i {
          font-size: 18px;
          opacity: 0.9;
        }

        .error-text {
          flex: 1;
        }

        .error-message {
          font-size: 14px;
          font-weight: 500;
        }

        .retry-count {
          font-size: 12px;
          opacity: 0.8;
          margin-top: 2px;
        }

        .error-actions {
          margin-left: 16px;
        }

        .error-button {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .error-button:hover:not(:disabled) {
          background: rgba(255, 255, 255, 0.3);
        }

        .error-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-button.primary {
          background: white;
          color: var(--error-color, #ff4757);
          border-color: white;
        }

        .error-button.primary:hover {
          background: rgba(255, 255, 255, 0.9);
        }
      `}</style>
    </div>
  );
}
