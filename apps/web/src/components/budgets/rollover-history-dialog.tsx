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

  // 格式化期间为"XXXX年X月"
  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    return `${year}年${parseInt(month)}月`;
  };

  // 获取类型显示文本
  const getTypeText = (type: string) => {
    return type === 'SURPLUS' ? '结余' : '透支';
  };

  // 获取类型样式类
  const getTypeClass = (type: string) => {
    return type === 'SURPLUS' ? 'surplus' : 'deficit';
  };

  // 获取结转金额的颜色样式（根据类型而不是金额正负）
  const getAmountColorClass = (type: string) => {
    return type === 'SURPLUS' ? 'text-green-600' : 'text-red-600';
  };

  // 格式化结转金额显示（根据类型决定符号）
  const formatRolloverAmount = (amount: number, type: string) => {
    const absAmount = Math.abs(amount);
    const sign = type === 'SURPLUS' ? '+ ' : '- ';
    return `${sign}${formatAmount(absAmount)}`;
  };

  // 使用Portal确保模态框渲染在body下，避免被其他元素遮挡
  if (typeof window === 'undefined') {
    return null; // 服务端渲染时不渲染模态框
  }

  return createPortal(
    <div className="rollover-history-modal" onClick={onClose}>
      <div className="rollover-history-content" onClick={(e) => e.stopPropagation()}>
        {/* 头部 */}
        <div className="rollover-history-header">
          <h3>结转历史</h3>
          <button className="rollover-history-close" onClick={onClose} type="button">
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
                  <div className="item-header">
                    <div className="item-period">{formatPeriod(record.period)}</div>
                    <div className={`item-type ${record.type.toLowerCase()}`}>
                      {getTypeText(record.type)}
                    </div>
                  </div>
                  <div className="item-details">
                    <div className="item-date">{formatDate(record.createdAt)}</div>
                    {record.memberName && (
                      <div className="item-member">成员: {record.memberName}</div>
                    )}
                  </div>
                  <div className="item-amounts">
                    <div className={`item-amount-main ${getAmountColorClass(record.type)}`}>
                      结转金额: {formatRolloverAmount(record.amount, record.type)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
