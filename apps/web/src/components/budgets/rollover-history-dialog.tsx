'use client';

import { RolloverRecord } from '@/store/budget-statistics-store';

interface RolloverHistoryDialogProps {
  history: RolloverRecord[];
  onClose: () => void;
}

export function RolloverHistoryDialog({ history, onClose }: RolloverHistoryDialogProps) {
  // 格式化金额
  const formatAmount = (amount: number) => {
    return `¥${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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

  return (
    <div className="rollover-dialog-overlay" onClick={onClose}>
      <div className="rollover-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="rollover-dialog-header">
          <h3>结转历史</h3>
          <button className="close-button" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="rollover-dialog-content">
          {history.length === 0 ? (
            <div className="empty-history">
              <i className="fas fa-history"></i>
              <p>暂无结转历史记录</p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((record) => (
                <div key={record.id} className="history-item">
                  <div className="history-info">
                    <div className="history-period">{record.period}</div>
                    <div className="history-date">{formatDate(record.createdAt)}</div>
                  </div>
                  <div className={`history-amount ${getTypeClass(record.type)}`}>
                    <span className="type-label">{getTypeText(record.type)}</span>
                    <span className="amount">{formatAmount(record.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
