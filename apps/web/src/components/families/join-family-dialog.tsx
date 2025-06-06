'use client';

import { useState } from 'react';
import { useFamilyStore } from '@/store/family-store';

interface JoinFamilyDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function JoinFamilyDialog({ isOpen, onClose }: JoinFamilyDialogProps) {
  const { joinFamily } = useFamilyStore();
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证邀请码
    if (!inviteCode.trim()) {
      setError('请输入邀请码');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const success = await joinFamily(inviteCode);
      if (success) {
        setInviteCode('');
        onClose();
      }
    } catch (err) {
      setError('加入家庭失败，请检查邀请码是否正确');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3 className="dialog-title">加入家庭</h3>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="dialog-body">
            <div className="mb-4">
              <label htmlFor="inviteCode" className="block text-sm font-medium text-gray-700 mb-1">
                邀请码
              </label>
              <input
                type="text"
                id="inviteCode"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="请输入家庭邀请码"
                disabled={isSubmitting}
              />
            </div>
            <p className="text-sm text-gray-500 mb-4">
              请向家庭管理员获取邀请码，邀请码为8位数字。
            </p>
            {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
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
            <button type="submit" className="dialog-confirm" disabled={isSubmitting}>
              {isSubmitting ? '加入中...' : '加入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
