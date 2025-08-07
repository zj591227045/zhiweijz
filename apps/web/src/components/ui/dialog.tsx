import * as React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

interface DialogContentProps {
  className?: string;
  children: React.ReactNode;
}

interface DialogHeaderProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogTitleProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

interface DialogDescriptionProps {
  children: React.ReactNode;
  className?: string;
}

interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onOpenChange) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center px-2 py-4">
      <div
        className="fixed inset-0 bg-black bg-opacity-50 dark:bg-opacity-70"
        onClick={() => onOpenChange?.(false)}
        style={{
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)'
        }}
      />
      <div className="relative z-[260] w-full max-w-lg">{children}</div>
    </div>
  );
}

export function DialogContent({ className = '', children }: DialogContentProps) {
  return (
    <div
      className={`rounded-lg shadow-lg p-6 w-full max-h-[85vh] overflow-y-auto ${className}`}
      style={{
        // 使用CSS变量支持主题
        backgroundColor: 'var(--card-background, #ffffff)',
        color: 'var(--text-primary, #1f2937)',
        borderColor: 'var(--border-color, #e5e7eb)',
        // 确保滚动区域可以正常工作
        touchAction: 'auto',
        WebkitOverflowScrolling: 'touch',
        overscrollBehavior: 'contain'
      }}
      onTouchStart={(e) => {
        // 阻止手势监听器处理模态框内的触摸事件
        e.stopPropagation();
      }}
      onTouchMove={(e) => {
        // 阻止手势监听器处理模态框内的滑动事件
        e.stopPropagation();
      }}
    >
      {children}
    </div>
  );
}

export function DialogHeader({ children, className = '' }: DialogHeaderProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}

export function DialogTitle({ children, className = '', style }: DialogTitleProps) {
  return <h2 className={`text-lg font-semibold mb-2 ${className}`} style={style}>{children}</h2>;
}

export function DialogDescription({ children, className = '' }: DialogDescriptionProps) {
  return <p className={`text-sm text-gray-600 ${className}`}>{children}</p>;
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return <div className={`flex justify-end gap-2 mt-4 ${className}`}>{children}</div>;
}

// 导出所有组件
export default Dialog;
