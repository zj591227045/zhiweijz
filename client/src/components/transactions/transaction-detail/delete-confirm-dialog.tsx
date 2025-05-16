"use client";

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  isOpen,
  isDeleting,
  onCancel,
  onConfirm
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;
  
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">删除交易</div>
        <div className="modal-body">
          确定要删除这笔交易吗？此操作无法撤销。
        </div>
        <div className="modal-footer">
          <button
            className="modal-button cancel"
            onClick={onCancel}
            disabled={isDeleting}
          >
            取消
          </button>
          <button
            className="modal-button confirm"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? "删除中..." : "删除"}
          </button>
        </div>
      </div>
    </div>
  );
}
