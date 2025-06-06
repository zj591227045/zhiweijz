'use client';

import Link from 'next/link';

interface AddBookButtonProps {
  onClick?: () => void;
  href?: string;
}

export function AddBookButton({ onClick, href = '/books/new' }: AddBookButtonProps) {
  // 如果提供了onClick，使用div和onClick
  // 否则使用Link组件
  if (onClick) {
    return (
      <div className="add-book-button" onClick={onClick}>
        <i className="fas fa-plus"></i>
        <span>创建账本</span>
      </div>
    );
  }

  return (
    <Link href={href} className="add-book-button">
      <i className="fas fa-plus"></i>
      <span>创建账本</span>
    </Link>
  );
}
