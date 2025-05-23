'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Family } from '@/types';
import { RoleBadge } from './role-badge';
import { ConfirmDialog } from '../ui/confirm-dialog';
import { useFamilyStore } from '@/store/family-store';
import { formatDate } from '@/lib/utils';

interface FamilyCardProps {
  family: Family;
}

export function FamilyCard({ family }: FamilyCardProps) {
  const { deleteFamily, leaveFamily } = useFamilyStore();
  const [showActions, setShowActions] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 判断当前用户是否为创建者
  const isCreator = family.createdBy === family.creator?.id;

  // 格式化创建日期
  const formattedDate = formatDate(family.createdAt, 'YYYY-MM-DD');

  // 处理长按显示操作菜单
  const handleLongPress = () => {
    setShowActions(true);
  };

  // 处理退出家庭
  const handleLeaveFamily = async () => {
    setIsProcessing(true);
    const success = await leaveFamily(family.id);
    setIsProcessing(false);
    if (success) {
      setShowLeaveDialog(false);
    }
  };

  // 处理删除家庭
  const handleDeleteFamily = async () => {
    setIsProcessing(true);
    const success = await deleteFamily(family.id);
    setIsProcessing(false);
    if (success) {
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Link href={`/families/${family.id}`}>
        <div 
          className="member-card"
          onContextMenu={(e) => {
            e.preventDefault();
            handleLongPress();
          }}
        >
          <div className="member-avatar">
            <i className="fas fa-home"></i>
          </div>
          <div className="member-info">
            <div className="member-name">{family.name}</div>
            <div className="member-role">
              <RoleBadge role={isCreator ? 'ADMIN' : 'MEMBER'} />
              <span className="text-xs text-gray-500 ml-2">
                {formattedDate}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <div className="text-sm font-medium">{family.memberCount || 0}名成员</div>
            <div className="text-xs text-gray-500">
              {isCreator ? '创建者' : '成员'}
            </div>
          </div>
        </div>
      </Link>

      {/* 操作菜单 */}
      {showActions && (
        <div className="dialog-overlay"
          onClick={() => setShowActions(false)}
        >
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3 className="dialog-title">{family.name}</h3>
            </div>
            <div className="dialog-body">
              <Link href={`/families/${family.id}`} className="block p-2 hover:bg-gray-100 rounded">
                <i className="fas fa-info-circle mr-2"></i>
                查看详情
              </Link>
              {isCreator ? (
                <button 
                  className="w-full text-left p-2 text-red-500 hover:bg-gray-100 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(false);
                    setShowDeleteDialog(true);
                  }}
                >
                  <i className="fas fa-trash-alt mr-2"></i>
                  删除家庭
                </button>
              ) : (
                <button 
                  className="w-full text-left p-2 text-red-500 hover:bg-gray-100 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowActions(false);
                    setShowLeaveDialog(true);
                  }}
                >
                  <i className="fas fa-sign-out-alt mr-2"></i>
                  退出家庭
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 退出家庭确认对话框 */}
      <ConfirmDialog
        isOpen={showLeaveDialog}
        title="退出家庭"
        message={`确定要退出"${family.name}"吗？此操作无法撤销。`}
        confirmText={isProcessing ? '处理中...' : '退出'}
        cancelText="取消"
        onConfirm={handleLeaveFamily}
        onCancel={() => setShowLeaveDialog(false)}
        isDangerous
      />

      {/* 删除家庭确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="删除家庭"
        message={`确定要删除"${family.name}"吗？此操作将永久删除该家庭及其所有数据，无法撤销。`}
        confirmText={isProcessing ? '处理中...' : '删除'}
        cancelText="取消"
        onConfirm={handleDeleteFamily}
        onCancel={() => setShowDeleteDialog(false)}
        isDangerous
      />
    </>
  );
}
