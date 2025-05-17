"use client";

import { useEffect } from "react";
import { useSecurityStore } from "@/store/security-store";
import { SecurityOptionsList } from "./security-options-list";
import { PasswordChangeForm } from "./password-change-form";
import { EmailChangeForm } from "./email-change-form";
import { DevicesList } from "./devices-list";
import { SecurityLogs } from "./security-logs";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { toast } from "sonner";

export function SecurityPage() {
  const {
    activeForm,
    confirmDialog,
    operationStatus,
    error,
    closeConfirmDialog,
    setActiveForm
  } = useSecurityStore();

  // 关闭模态窗口
  const handleCloseForm = () => {
    setActiveForm(null);
    document.body.style.overflow = ''; // 恢复背景滚动
  };

  // 监听操作状态变化
  useEffect(() => {
    if (operationStatus === 'success') {
      toast.success('操作成功');
    } else if (operationStatus === 'error' && error) {
      toast.error(error);
    }
  }, [operationStatus, error]);

  return (
    <div className="pb-6">
      {/* 安全选项列表 */}
      <SecurityOptionsList />

      {/* 密码修改表单 */}
      {activeForm === 'password' && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-container">
            <PasswordChangeForm onClose={handleCloseForm} />
          </div>
        </div>
      )}

      {/* 邮箱修改表单 */}
      {activeForm === 'email' && (
        <div className="modal-overlay" style={{ display: 'flex' }}>
          <div className="modal-container">
            <EmailChangeForm onClose={handleCloseForm} />
          </div>
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={() => {
          confirmDialog.onConfirm();
          closeConfirmDialog();
        }}
        onCancel={closeConfirmDialog}
      />
    </div>
  );
}
