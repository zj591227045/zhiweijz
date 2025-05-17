'use client';

interface HeaderProps {
  onAddClick: () => void;
}

export function Header({ onAddClick }: HeaderProps) {
  return (
    <header className="page-header">
      <div className="header-left"></div>
      <h1 className="page-title">预算管理</h1>
      <div className="header-right">
        <button
          onClick={onAddClick}
          className="add-button"
        >
          <i className="fas fa-plus"></i>
        </button>
      </div>
    </header>
  );
}
