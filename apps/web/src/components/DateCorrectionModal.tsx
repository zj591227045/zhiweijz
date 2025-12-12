/**
 * 日期修正模态框组件
 * 用于App端日期异常时提示用户修正
 */

import React, { useState } from 'react';

interface DateCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (correctedDate: Date) => void;
  originalDate: Date | null;
  suggestedDate: Date;
  reason: string;
}

/**
 * 日期修正模态框
 */
export const DateCorrectionModal: React.FC<DateCorrectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  originalDate,
  suggestedDate,
  reason,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date>(suggestedDate);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedDate);
    onClose();
  };

  const handleCancel = () => {
    // 取消时使用建议日期(今天)
    onConfirm(suggestedDate);
    onClose();
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return '无法识别';
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
        {/* 标题 */}
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-2">⚠️</span>
          <h2 className="text-xl font-semibold">日期异常提示</h2>
        </div>

        {/* 内容 */}
        <div className="mb-6">
          <p className="text-gray-700 mb-4">{reason}</p>
          
          <div className="bg-gray-50 rounded p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">识别日期:</span>
              <span className="font-medium">{formatDate(originalDate)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">建议日期:</span>
              <span className="font-medium text-blue-600">{formatDate(suggestedDate)}</span>
            </div>
          </div>

          {/* 日期选择器 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              请选择正确的日期:
            </label>
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 按钮 */}
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            使用今天
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            确认修正
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 记录选择界面的日期异常标识组件
 */
interface DateAnomalyBadgeProps {
  hasAnomaly: boolean;
  reason?: string;
}

export const DateAnomalyBadge: React.FC<DateAnomalyBadgeProps> = ({ hasAnomaly, reason }) => {
  if (!hasAnomaly) return null;

  return (
    <div className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
      <span className="mr-1">⚠️</span>
      <span>{reason || '日期异常'}</span>
    </div>
  );
};
