"use client";

interface EmptyStateProps {
  onAddBook: () => void;
}

export function EmptyState({ onAddBook }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <i className="fas fa-book"></i>
      </div>
      <div className="empty-text">
        您还没有创建任何账本，点击下方按钮创建您的第一个账本
      </div>
      <button
        className="submit-button"
        onClick={onAddBook}
      >
        创建账本
      </button>
    </div>
  );
}
