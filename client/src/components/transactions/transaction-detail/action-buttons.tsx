"use client";

interface ActionButtonsProps {
  onEdit: () => void;
  onDelete: () => void;
}

export function ActionButtons({ onEdit, onDelete }: ActionButtonsProps) {
  return (
    <div className="action-buttons">
      <button className="action-button edit-button" onClick={onEdit}>
        编辑
      </button>
      <button className="action-button delete-button" onClick={onDelete}>
        删除
      </button>
    </div>
  );
}
