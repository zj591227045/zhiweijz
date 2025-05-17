"use client";

import { useState } from "react";
import { BookCard } from "./book-card";
import { AccountBook } from "@/types";

interface BookListProps {
  books: AccountBook[];
  currentBookId?: string;
  onSwitchBook: (book: AccountBook) => void;
  onEditBook: (book: AccountBook) => void;
  onDeleteBook: (book: AccountBook) => void;
}

export function BookList({
  books,
  currentBookId,
  onSwitchBook,
  onEditBook,
  onDeleteBook,
}: BookListProps) {
  // 确保books是一个数组
  const safeBooks = Array.isArray(books) ? books : [];

  // 分类账本：个人账本和家庭账本
  // 目前API没有区分，所以暂时全部当作个人账本
  const personalBooks = safeBooks;
  const familyBooks: AccountBook[] = [];

  return (
    <div className="space-y-6">
      {/* 个人账本 */}
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
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
