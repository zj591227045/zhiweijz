'use client';

import Link from 'next/link';
import { haptic } from '@/utils/haptic-feedback';

interface AddBookButtonProps {
  onClick?: () => void;
  href?: string;
}

export function AddBookButton({ onClick, href = '/settings/books/new' }: AddBookButtonProps) {
  // 处理点击事件，添加震动反馈
  const handleClick = () => {
    haptic.light(); // 轻微震动反馈
    if (onClick) {
      onClick();
    }
  };

  // 如果提供了onClick，使用div和onClick
  // 否则使用Link组件
  if (onClick) {
    return (
      <div className="add-book-button" onClick={handleClick}>
        <i className="fas fa-plus"></i>
        <span>创建账本</span>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="add-book-button"
      onClick={() => haptic.light()} // 为Link也添加震动反馈
    >
      <i className="fas fa-plus"></i>
      <span>创建账本</span>
    </Link>
  );
}
