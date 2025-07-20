'use client';

import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { haptic } from '@/utils/haptic-feedback';

interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'danger';
}

export function ConfirmModal({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = '确认',
  cancelText = '取消',
  type = 'warning',
}: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          {/* 图标和标题 */}
          <div className="flex items-center mb-4">
            <div
              className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                type === 'danger' ? 'bg-red-100' : 'bg-yellow-100'
              }`}
            >
              <ExclamationTriangleIcon
                className={`w-6 h-6 ${type === 'danger' ? 'text-red-600' : 'text-yellow-600'}`}
              />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">{title}</h3>
            </div>
          </div>

          {/* 消息内容 */}
          <div className="mb-6">
            <p className="text-sm text-gray-500">{message}</p>
          </div>

          {/* 按钮 */}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                haptic.light(); // 取消按钮轻微震动
                onCancel();
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={() => {
                if (type === 'danger') {
                  haptic.error(); // 危险操作错误震动
                } else {
                  haptic.warning(); // 警告操作警告震动
                }
                onConfirm();
              }}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                type === 'danger'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-yellow-600 hover:bg-yellow-700'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
