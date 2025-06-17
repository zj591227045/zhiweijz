'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import '@/styles/content-modal.css';

interface ContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function ContentModal({ isOpen, onClose, title, children }: ContentModalProps) {
  // 控制页面滚动
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
    } else {
      document.body.classList.remove('modal-open');
    }

    return () => {
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="content-info-modal">
      <div className="content-modal-overlay" onClick={onClose}>
        <div className="content-modal-container" onClick={(e) => e.stopPropagation()}>
          <div className="content-modal-body">
            <div className="content-modal-header">
              <h2>{title}</h2>
            </div>
            <div className="content-modal-content">
              {children}
            </div>
            <div className="content-modal-footer">
              <button className="content-close-button" onClick={onClose}>
                关闭
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // 使用Portal确保模态框渲染到body中
  if (typeof window === 'undefined') {
    return null;
  }

  return createPortal(modalContent, document.body);
}
