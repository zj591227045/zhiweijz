"use client";

interface ThemeDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  isLoading?: boolean;
}

export function ThemeDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
}: ThemeDeleteDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="modal-content bg-card rounded-lg w-[90%] max-w-md overflow-hidden">
        <div className="modal-header p-4 border-b border-border text-lg font-semibold">
          删除主题
        </div>
        <div className="modal-body p-4">
          <p className="text-foreground">
            确定要删除这个主题吗？此操作无法撤销。
          </p>
        </div>
        <div className="modal-footer flex border-t border-border">
          <button
            className="modal-button cancel flex-1 py-3.5 text-center text-muted-foreground border-r border-border"
            onClick={onClose}
            disabled={isLoading}
          >
            取消
          </button>
          <button
            className="modal-button confirm flex-1 py-3.5 text-center text-destructive font-semibold disabled:opacity-50"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                删除中...
              </>
            ) : (
              "删除"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
