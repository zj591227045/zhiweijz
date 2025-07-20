'use client';

import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { useState } from 'react';
import { toast } from 'sonner';

export function DeletionStatusBanner() {
  const { isDeletionRequested, deletionScheduledAt, remainingHours, setDeletionStatus } =
    useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  if (!isDeletionRequested) {
    return null;
  }

  const handleCancelDeletion = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/users/me/cancel-deletion');
      setDeletionStatus(false, null, 0);
      toast.success('注销请求已取消');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '取消注销失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="deletion-status-banner">
      <div className="banner-content">
        <div className="banner-icon">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <div className="banner-text">
          <h4>账户正在注销中</h4>
          <p>
            您的账户将在 <strong>{remainingHours} 小时</strong> 后被永久删除
            {deletionScheduledAt && (
              <span className="deletion-time">
                （预定删除时间：{new Date(deletionScheduledAt).toLocaleString('zh-CN')}）
              </span>
            )}
          </p>
        </div>
        <div className="banner-actions">
          <button
            className="cancel-deletion-btn"
            onClick={handleCancelDeletion}
            disabled={isLoading}
          >
            {isLoading ? '处理中...' : '取消注销'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .deletion-status-banner {
          background: linear-gradient(135deg, #fef3cd 0%, #fde68a 100%);
          border: 1px solid #f59e0b;
          border-radius: 8px;
          padding: 16px;
          margin: 16px;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.1);
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .banner-icon {
          color: #f59e0b;
          font-size: 24px;
          flex-shrink: 0;
        }

        .banner-text {
          flex: 1;
        }

        .banner-text h4 {
          margin: 0 0 4px 0;
          color: #92400e;
          font-size: 16px;
          font-weight: 600;
        }

        .banner-text p {
          margin: 0;
          color: #78350f;
          font-size: 14px;
          line-height: 1.4;
        }

        .deletion-time {
          display: block;
          font-size: 12px;
          color: #a16207;
          margin-top: 4px;
        }

        .banner-actions {
          flex-shrink: 0;
        }

        .cancel-deletion-btn {
          background: #f59e0b;
          color: white;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-deletion-btn:hover:not(:disabled) {
          background: #d97706;
          transform: translateY(-1px);
        }

        .cancel-deletion-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 640px) {
          .banner-content {
            flex-direction: column;
            text-align: center;
            gap: 12px;
          }

          .banner-text {
            text-align: center;
          }

          .cancel-deletion-btn {
            width: 100%;
            padding: 12px 16px;
          }
        }

        /* 深色主题适配 */
        @media (prefers-color-scheme: dark) {
          .deletion-status-banner {
            background: linear-gradient(
              135deg,
              rgba(245, 158, 11, 0.1) 0%,
              rgba(245, 158, 11, 0.2) 100%
            );
            border-color: rgba(245, 158, 11, 0.3);
          }

          .banner-text h4 {
            color: #fbbf24;
          }

          .banner-text p {
            color: #fcd34d;
          }

          .deletion-time {
            color: #f59e0b;
          }
        }
      `}</style>
    </div>
  );
}
