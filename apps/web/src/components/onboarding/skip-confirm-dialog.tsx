'use client';

interface SkipConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function SkipConfirmDialog({ isOpen, onConfirm, onCancel }: SkipConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">跳过引导</h3>
        </div>
        <div className="dialog-body">
          <p>确定要跳过引导流程吗？</p>
          <p className="dialog-description">
            您可以随时在设置中重新查看引导内容。
          </p>
        </div>
        <div className="dialog-actions">
          <button className="dialog-button dialog-button-secondary" onClick={onCancel}>
            取消
          </button>
          <button className="dialog-button dialog-button-primary" onClick={onConfirm}>
            确定跳过
          </button>
        </div>
      </div>
    </div>
  );
}
