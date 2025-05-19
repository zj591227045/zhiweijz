'use client';

import { useEffect } from 'react';
import dayjs from 'dayjs';
import { RolloverRecord } from '@/store/budget-detail-store';
import '@/styles/rollover-history-dialog.css';

interface RolloverHistoryDialogProps {
  history: RolloverRecord[];
  onClose: () => void;
}

export function RolloverHistoryDialog({
  history,
  onClose
}: RolloverHistoryDialogProps) {
  // 当对话框打开时，阻止背景滚动
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // 格式化金额
  const formatAmount = (amount: number, type: 'SURPLUS' | 'DEFICIT') => {
    const prefix = type === 'SURPLUS' ? '+' : '-';
    return `${prefix}¥${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('YYYY-MM-DD HH:mm');
  };

  // 获取箭头图标
  const getArrowIcon = (type: 'SURPLUS' | 'DEFICIT') => {
    return type === 'SURPLUS'
      ? <i className="fas fa-arrow-up"></i>
      : <i className="fas fa-arrow-down"></i>;
  };

  return (
    <div className="rollover-dialog-overlay" onClick={onClose}>
      <div className="rollover-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="rollover-dialog-header">
          <h2 className="rollover-dialog-title">预算结转历史</h2>
          <p className="rollover-dialog-description">
            查看历史结转记录和金额变化
          </p>
          <button className="rollover-dialog-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="rollover-dialog-content">
          {history.length === 0 ? (
            <div className="no-history">
              <i className="fas fa-info-circle"></i>
              <p>暂无结转历史记录</p>
            </div>
          ) : (
            <div className="rollover-history-list">
              {history.map((record) => (
                <div
                  key={record.id}
                  className={`rollover-history-item ${record.type.toLowerCase()}`}
                >
                  <div className="rollover-history-icon">
                    <i className={`fas fa-${record.type === 'SURPLUS' ? 'arrow-up' : 'arrow-down'}`}></i>
                  </div>
                  <div className="rollover-history-content">
                    <div className="rollover-history-period">{record.period}</div>
                    <div className="rollover-history-date">{formatDate(record.createdAt)}</div>
                  </div>
                  <div className="rollover-history-amount">
                    {getArrowIcon(record.type)}
                    <span style={{ marginLeft: '4px' }}>
                      {formatAmount(record.amount, record.type)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rollover-dialog-footer">
          <button className="rollover-dialog-button confirm" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
