'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { RolloverRecord } from '@/store/budget-statistics-store';

interface RolloverHistoryDialogProps {
  history: RolloverRecord[];
  onClose: () => void;
}

export function RolloverHistoryDialog({ history, onClose }: RolloverHistoryDialogProps) {
  // 阻止背景滚动
  useEffect(() => {
    // 保存原始样式
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyWidth = document.body.style.width;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    // 获取当前滚动位置
    const scrollY = window.scrollY;

    // 阻止滚动
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;
    document.documentElement.style.overflow = 'hidden';

    return () => {
      // 恢复原始样式
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.width = originalBodyWidth;
      document.body.style.top = '';
      document.documentElement.style.overflow = originalHtmlOverflow;

      // 恢复滚动位置
      window.scrollTo(0, scrollY);
    };
  }, []);

  // 格式化金额
  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 获取类型显示文本
  const getTypeText = (type: string) => {
    return type === 'SURPLUS' ? '结余' : '透支';
  };

  // 获取类型样式类
  const getTypeClass = (type: string) => {
    return type === 'SURPLUS' ? 'surplus' : 'deficit';
  };

  // 使用Portal确保模态框渲染在body下，避免被其他元素遮挡
  if (typeof window === 'undefined') {
    return null; // 服务端渲染时不渲染模态框
  }

  return createPortal(
    <div
      className="rollover-history-modal"
      onClick={onClose}
    >
      <div
        className="rollover-history-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="rollover-history-header">
          <h3>结转历史</h3>
          <button
            className="rollover-history-close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        {/* 内容区域 */}
        <div className="rollover-history-body">
          {history.length === 0 ? (
            <div className="rollover-history-empty">
              <div className="empty-icon">📊</div>
              <p>暂无结转历史记录</p>
            </div>
          ) : (
            <div className="rollover-history-list">
              {history.map((record) => (
                <div key={record.id} className="rollover-history-item">
                  <div className="item-left">
                    <div className="item-period">{record.period}</div>
                    <div className="item-date">{formatDate(record.createdAt)}</div>
                  </div>
                  <div className="item-right">
                    <div className={`item-type ${record.type.toLowerCase()}`}>
                      {getTypeText(record.type)}
                    </div>
                    <div className="item-amount">
                      {formatAmount(record.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
