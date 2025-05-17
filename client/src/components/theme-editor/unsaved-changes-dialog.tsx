'use client';

import { useRouter } from 'next/navigation';
import { useThemeEditorStore } from '@/store/theme-editor-store';

/**
 * 未保存更改对话框组件
 */
export function UnsavedChangesDialog() {
  const router = useRouter();
  const {
    unsavedChangesDialogOpen,
    closeUnsavedChangesDialog
  } = useThemeEditorStore();

  // 放弃更改
  const handleDiscard = () => {
    closeUnsavedChangesDialog();
    router.push('/settings/theme');
  };

  // 继续编辑
  const handleContinue = () => {
    closeUnsavedChangesDialog();
  };

  if (!unsavedChangesDialogOpen) {
    return null;
  }

  return (
    <div className="unsaved-changes-dialog" style={{ display: 'flex' }}>
      <div className="dialog-container">
        <div className="dialog-header">
          <div className="dialog-title">未保存的更改</div>
        </div>

        <div className="dialog-body">
          您有未保存的更改，确定要离开吗？离开后所有更改将会丢失。
        </div>

        <div className="dialog-footer">
          <button
            onClick={handleDiscard}
            className="dialog-button discard-button"
          >
            放弃更改
          </button>
          <button
            onClick={handleContinue}
            className="dialog-button continue-button"
          >
            继续编辑
          </button>
        </div>
      </div>
    </div>
  );
}
