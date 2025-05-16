"use client";

interface NotesEditorProps {
  notes: string;
  isEditing: boolean;
  editValue: string;
  isUpdating: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onChange: (value: string) => void;
  onSave: () => void;
}

export function NotesEditor({
  notes,
  isEditing,
  editValue,
  isUpdating,
  onEdit,
  onCancel,
  onChange,
  onSave
}: NotesEditorProps) {
  return (
    <div className="detail-card">
      <div className="detail-title">备注</div>
      
      {isEditing ? (
        <div className="notes-editor">
          <textarea
            className="notes-textarea"
            value={editValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder="添加备注..."
            disabled={isUpdating}
          />
          <div className="notes-actions">
            <button
              className="notes-action-button cancel"
              onClick={onCancel}
              disabled={isUpdating}
            >
              取消
            </button>
            <button
              className="notes-action-button save"
              onClick={onSave}
              disabled={isUpdating}
            >
              {isUpdating ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : (
        <div className="detail-note" onClick={onEdit}>
          <div className="note-content">
            {notes || "点击添加备注..."}
          </div>
        </div>
      )}
    </div>
  );
}
