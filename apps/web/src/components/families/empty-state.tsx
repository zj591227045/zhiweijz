'use client';

interface EmptyStateProps {
  onCreateFamily: () => void;
  onJoinFamily: () => void;
}

export function EmptyState({ onCreateFamily, onJoinFamily }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        <i className="fas fa-home"></i>
      </div>
      <h2 className="empty-title">还没有家庭账本</h2>
      <p className="empty-description">创建或加入家庭账本，与家人共同管理财务，记录家庭收支。</p>
      <div className="empty-actions">
        <button className="btn-primary" onClick={onCreateFamily}>
          <i className="fas fa-plus"></i>
          创建家庭
        </button>
        <button className="btn-outline" onClick={onJoinFamily}>
          <i className="fas fa-sign-in-alt"></i>
          加入家庭
        </button>
      </div>
    </div>
  );
}
