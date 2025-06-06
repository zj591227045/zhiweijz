'use client';

interface EmptyStateProps {
  onAddBook?: () => void;
  title?: string;
  description?: string;
  showButton?: boolean;
}

export function EmptyState({
  onAddBook,
  title = '暂无账本',
  description = '您还没有创建任何账本，点击下方按钮创建您的第一个账本',
  showButton = true,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <i className="fas fa-book"></i>
      </div>
      <div className="empty-text">
        <h3
          style={{
            marginBottom: '8px',
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--text-primary, #1f2937)',
          }}
        >
          {title}
        </h3>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary, #6b7280)' }}>
          {description}
        </p>
      </div>
      {showButton && onAddBook && (
        <button className="submit-button" onClick={onAddBook}>
          <i className="fas fa-plus" style={{ marginRight: '8px' }}></i>
          创建账本
        </button>
      )}
    </div>
  );
}
