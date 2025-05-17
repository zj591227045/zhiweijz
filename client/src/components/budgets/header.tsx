'use client';

interface HeaderProps {
  onAddClick: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  return (
    <header className="header">
      <div className="header-title">预算管理</div>
      <div className="header-actions">
        <button
          onClick={onAddClick}
          className="icon-button"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>
    </header>
  );
}
