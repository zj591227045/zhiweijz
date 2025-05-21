"use client";

import { useEffect, useState } from "react";
import { getCategoryIconClass } from "@/lib/utils";
import "./transaction-toast.css";

interface TransactionToastProps {
  isVisible: boolean;
  onClose: () => void;
  transaction?: {
    amount: number;
    type: 'EXPENSE' | 'INCOME';
    categoryName: string;
    categoryIcon?: string;
    description?: string;
    date?: string;
  };
  processingStep?: string | null;
  isProcessing: boolean;
}

/**
 * 交易记录顶部弹窗组件
 * 用于显示直接记账的处理过程和结果
 */
export function TransactionToast({
  isVisible,
  onClose,
  transaction,
  processingStep,
  isProcessing
}: TransactionToastProps) {
  const [animateOut, setAnimateOut] = useState(false);

  // 自动关闭计时器
  useEffect(() => {
    if (isVisible && !isProcessing && transaction) {
      const timer = setTimeout(() => {
        setAnimateOut(true);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, isProcessing, transaction]);

  // 动画结束后关闭
  const handleAnimationEnd = () => {
    if (animateOut) {
      setAnimateOut(false);
      onClose();
    }
  };

  // 如果不可见，不渲染
  if (!isVisible) return null;

  return (
    <div
      className={`transaction-toast ${animateOut ? 'animate-out' : ''}`}
      onAnimationEnd={handleAnimationEnd}
    >
      {isProcessing ? (
        <div className="transaction-toast-processing">
          <div className="transaction-toast-spinner"></div>
          <div className="transaction-toast-step">{processingStep || "处理中..."}</div>
        </div>
      ) : transaction ? (
        <div className="transaction-toast-content">
          <div className="transaction-toast-header">
            <div className="transaction-toast-title">记账成功</div>
            <button className="transaction-toast-close" onClick={() => setAnimateOut(true)}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="transaction-toast-details">
            <div className="transaction-toast-category">
              <div className="transaction-toast-icon">
                <i className={`fas ${getCategoryIconClass(transaction.categoryIcon || "")}`}></i>
              </div>
              <div className="transaction-toast-info">
                <div className="transaction-toast-category-name">{transaction.categoryName}</div>
                {transaction.description && (
                  <div className="transaction-toast-description">{transaction.description}</div>
                )}
              </div>
            </div>
            <div className={`transaction-toast-amount ${transaction.type === 'EXPENSE' ? 'expense' : 'income'}`}>
              {transaction.type === 'EXPENSE' ? '-' : '+'}¥{transaction.amount.toFixed(2)}
            </div>
          </div>
        </div>
      ) : (
        <div className="transaction-toast-error">
          <div className="transaction-toast-error-icon">
            <i className="fas fa-exclamation-circle"></i>
          </div>
          <div className="transaction-toast-error-message">记账失败，请重试</div>
          <button className="transaction-toast-close" onClick={() => setAnimateOut(true)}>
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
    </div>
  );
}
