'use client';

import { useEffect } from 'react';
import '@/styles/rollover-dialog.css';

interface RolloverConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RolloverConfirmDialog({
  isOpen,
  onClose,
  onConfirm
}: RolloverConfirmDialogProps) {
  // 当对话框打开时，阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="rollover-dialog-overlay" onClick={onClose}>
      <div className="rollover-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="rollover-dialog-header">
          <h2 className="rollover-dialog-title">启用预算结转</h2>
          <p className="rollover-dialog-description">
            启用预算结转功能将帮助您更好地管理财务
          </p>
          <button className="rollover-dialog-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className="rollover-dialog-content">
          <div className="rollover-info-item">
            <div className="rollover-info-icon info">
              <i className="fas fa-info-circle"></i>
            </div>
            <div className="rollover-info-content">
              <h3>用途</h3>
              <p>
                本月的预算使用情况会顺延到下个月。如果本月有剩余预算，将自动添加到下个月；如果本月超支，将从下个月扣除。
              </p>
            </div>
          </div>

          <div className="rollover-info-item">
            <div className="rollover-info-icon goal">
              <i className="fas fa-bullseye"></i>
            </div>
            <div className="rollover-info-content">
              <h3>目标</h3>
              <p>
                引导您控制预算花费，培养良好的消费习惯。结转功能让您的预算更加灵活，帮助您应对不同月份的消费波动。
              </p>
            </div>
          </div>
        </div>

        <div className="rollover-dialog-footer">
          <button className="rollover-dialog-button cancel" onClick={onClose}>
            取消
          </button>
          <button className="rollover-dialog-button confirm" onClick={onConfirm}>
            确认启用
          </button>
        </div>
      </div>
    </div>
  );
}
