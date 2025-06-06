'use client';

import { useState } from 'react';
import { BookCard } from './book-card';
import { EmptyState } from './empty-state';
import { AccountBook, AccountBookType } from '@/types';

interface BookListProps {
  books: AccountBook[];
  currentBookId?: string;
  onSwitchBook: (book: AccountBook) => void;
  onEditBook: (book: AccountBook) => void;
  onDeleteBook: (book: AccountBook) => void;
  onResetBook?: (book: AccountBook) => void; // 可选的重置功能，仅用于家庭账本
}

export function BookList({
  books,
  currentBookId,
  onSwitchBook,
  onEditBook,
  onDeleteBook,
  onResetBook,
}: BookListProps) {
  // 确保books是一个数组
  const safeBooks = Array.isArray(books) ? books : [];

  // 分类账本：个人账本和家庭账本
  const personalBooks = safeBooks.filter((book) => book.type === AccountBookType.PERSONAL);
  const familyBooks = safeBooks.filter((book) => book.type === AccountBookType.FAMILY);

  return (
    <div className="space-y-6">
      {/* 个人账本 */}
      {personalBooks.length > 0 && (
        <div>
          <div className="section-header">
            <div className="section-title">个人账本</div>
          </div>

          <div className="book-list">
            {personalBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isActive={book.id === currentBookId}
                onSwitch={() => onSwitchBook(book)}
                onEdit={() => onEditBook(book)}
                onDelete={() => onDeleteBook(book)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 家庭账本 - 如果有的话 */}
      {familyBooks.length > 0 && (
        <div>
          <div className="section-header">
            <div className="section-title">家庭账本</div>
          </div>

          <div className="book-list">
            {familyBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                isActive={book.id === currentBookId}
                onSwitch={() => onSwitchBook(book)}
                onEdit={() => onEditBook(book)}
                onDelete={() => onDeleteBook(book)}
                onReset={onResetBook ? () => onResetBook(book) : undefined}
              />
            ))}
          </div>
        </div>
      )}

      {/* 如果没有任何账本，显示空状态 */}
      {personalBooks.length === 0 && familyBooks.length === 0 && (
        <EmptyState title="暂无账本" description="您还没有创建任何账本" showButton={false} />
      )}
    </div>
  );
}
