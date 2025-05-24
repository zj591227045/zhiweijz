'use client';

import { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div 
        className={`dialog-content ${size}`} 
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="dialog-header">
            <h3 className="dialog-title">{title}</h3>
            <button 
              className="dialog-close"
              onClick={onClose}
              aria-label="关闭"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        <div className="dialog-body">
          {children}
        </div>
      </div>
    </div>
  );
} 