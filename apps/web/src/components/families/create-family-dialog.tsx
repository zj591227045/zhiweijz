'use client';

import { useState } from 'react';
import { useFamilyStore } from '@/store/family-store';

interface CreateFamilyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateFamilyDialog({ isOpen, onClose }: CreateFamilyDialogProps) {
  const { createFamily } = useFamilyStore();
  const [familyName, setFamilyName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证家庭名称
    if (!familyName.trim()) {
      setError('请输入家庭名称');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const success = await createFamily({ name: familyName });
      if (success) {
        setFamilyName('');
        onClose();
      }
    } catch (err) {
      setError('创建家庭失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">创建家庭</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <div className="mb-4">
              <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 mb-1">
                家庭名称
              </label>
              <input
                type="text"
                id="familyName"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="例如：张家"
                disabled={isSubmitting}
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm mt-2">{error}</div>
            )}
          </div>
          <div className="dialog-footer">
            <button
              type="button"
              className="dialog-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              type="submit"
              className="dialog-confirm"
              disabled={isSubmitting}
            >
              {isSubmitting ? '创建中...' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
