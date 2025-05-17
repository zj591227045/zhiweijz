"use client";

import { useEffect, useState } from "react";
import { useFamilyDetailStore } from "@/lib/stores/family-detail-store";
import { formatDate } from "@/lib/utils/date-utils";

interface InvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
}

export function InvitationDialog({ isOpen, onClose, familyId }: InvitationDialogProps) {
  const { generateInvitation, invitation, isInvitationLoading } = useFamilyDetailStore();
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !invitation) {
      generateInvitation(familyId);
    }
  }, [isOpen, invitation, familyId, generateInvitation]);

  // 复制邀请链接
  const handleCopyLink = () => {
    if (invitation?.inviteLink) {
      navigator.clipboard.writeText(invitation.inviteLink);
      setIsCopied(true);
      
      // 3秒后重置复制状态
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    }
  };

  // 复制邀请码
  const handleCopyCode = () => {
    if (invitation?.inviteCode) {
      navigator.clipboard.writeText(invitation.inviteCode);
      setIsCopied(true);
      
      // 3秒后重置复制状态
      setTimeout(() => {
        setIsCopied(false);
      }, 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ display: "flex" }}>
      <div className="modal-content">
        <div className="modal-header">邀请成员</div>
        <div className="modal-body">
          {isInvitationLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
            </div>
          ) : invitation ? (
            <div className="space-y-4">
              <div className="text-center mb-4">
                <p className="text-sm text-gray-500 mb-2">
                  分享以下邀请码或链接给家庭成员
                </p>
                {invitation.expiresAt && (
                  <p className="text-xs text-gray-400">
                    有效期至: {formatDate(invitation.expiresAt, "YYYY年MM月DD日 HH:mm")}
                  </p>
                )}
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="text-center mb-2 font-bold text-lg">
                  {invitation.inviteCode}
                </div>
                <button
                  className="w-full py-2 text-sm text-primary bg-white border border-primary rounded-md"
                  onClick={handleCopyCode}
                >
                  {isCopied ? "已复制" : "复制邀请码"}
                </button>
              </div>
              
              <div className="bg-gray-100 p-4 rounded-lg">
                <div className="text-sm text-gray-700 mb-2 break-all">
                  {invitation.inviteLink}
                </div>
                <button
                  className="w-full py-2 text-sm text-primary bg-white border border-primary rounded-md"
                  onClick={handleCopyLink}
                >
                  {isCopied ? "已复制" : "复制邀请链接"}
                </button>
              </div>
              
              {invitation.qrCodeUrl && (
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">或扫描二维码加入</p>
                  <div className="inline-block p-2 bg-white border rounded-lg">
                    <img
                      src={invitation.qrCodeUrl}
                      alt="邀请二维码"
                      className="w-32 h-32"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              无法生成邀请链接，请稍后重试
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="modal-button cancel w-full" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}
