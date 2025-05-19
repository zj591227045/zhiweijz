"use client";

import { useState } from "react";
import { AccountBook, AccountBookType } from "@/types";
import { formatDate } from "@/lib/utils";

interface BookCardProps {
  book: AccountBook;
  isActive: boolean;
  onSwitch: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReset?: () => void; // 可选的重置功能，仅用于家庭账本
}

export function BookCard({
  book,
  isActive,
  onSwitch,
  onEdit,
  onDelete,
  onReset,
}: BookCardProps) {
  const [showActions, setShowActions] = useState(false);

  // 格式化创建日期
  const formattedDate = formatDate(book.createdAt);

  // 处理点击事件
  const handleClick = () => {
    if (!isActive) {
      onSwitch();
    }
  };

  // 处理长按事件
  const handleLongPress = () => {
    setShowActions(true);
  };

  // 处理编辑按钮点击
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，避免触发卡片点击
    onEdit();
  };

  // 处理删除按钮点击
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，避免触发卡片点击
    onDelete();
  };

  // 处理重置按钮点击
  const handleResetClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // 阻止冒泡，避免触发卡片点击
    if (onReset) {
      onReset();
    }
  };

  return (
    <div
      className={`book-card ${isActive ? "active" : ""}`}
      onClick={handleClick}
    >
      <div className="book-header">
        <div className="book-title">
          {book.name}
          {isActive && <span className="book-badge">当前使用</span>}
        </div>
        <div className="book-actions">
          <button className="book-action" onClick={handleEditClick} title="编辑账本">
            <i className="fas fa-edit"></i>
          </button>
          {book.type === AccountBookType.FAMILY && onReset && (
            <button className="book-action" onClick={handleResetClick} title="重置账本">
              <i className="fas fa-sync-alt"></i>
            </button>
          )}
          <button className="book-action" onClick={handleDeleteClick} title="删除账本">
            <i className="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
      <div className="book-meta">
        {book.description && (
          <div className="meta-item">
            <div className="meta-icon">
              <i className="fas fa-info-circle"></i>
            </div>
            <div>{book.description}</div>
          </div>
        )}
        <div className="meta-item">
          <div className="meta-icon">
            <i className={book.type === AccountBookType.FAMILY ? "fas fa-users" : "fas fa-user"}></i>
          </div>
          <div>{book.type === AccountBookType.FAMILY ? "家庭账本" : "个人账本"}</div>
        </div>
        <div className="meta-item">
          <div className="meta-icon">
            <i className="fas fa-calendar-alt"></i>
          </div>
          <div>创建于: {formattedDate}</div>
        </div>
      </div>
    </div>
  );
}
