import React from 'react';
import { cn } from '@/lib/utils';
import { haptic } from '@/utils/haptic-feedback';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
  children: React.ReactNode;
  enableHaptic?: boolean; // 是否启用震动反馈
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      children,
      enableHaptic = true,
      onClick,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';

    const variants = {
      default: 'bg-blue-600 text-white hover:bg-blue-700',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
      ghost: 'text-gray-700 hover:bg-gray-100',
      destructive: 'bg-red-600 text-white hover:bg-red-700',
    };

    const sizes = {
      default: 'h-10 py-2 px-4',
      sm: 'h-9 px-3 text-sm',
      lg: 'h-11 px-8',
    };

    // 处理点击事件，添加震动反馈
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (enableHaptic) {
        // 根据按钮类型选择不同的震动强度
        if (variant === 'destructive') {
          haptic.warning(); // 危险操作使用警告震动
        } else {
          haptic.light(); // 普通操作使用轻微震动
        }
      }

      if (onClick) {
        onClick(e);
      }
    };

    return (
      <button
        className={cn(baseClasses, variants[variant], sizes[size], className)}
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
