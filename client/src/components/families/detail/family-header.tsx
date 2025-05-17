"use client";

import { useState } from "react";
import { FamilyDetail } from "@/lib/stores/family-store";
import { UpdateFamilyRequest } from "@/lib/stores/family-detail-store";
import { formatDate } from "@/lib/utils/date-utils";

interface FamilyHeaderProps {
  family: FamilyDetail;
  isAdmin: boolean;
  onUpdate: (id: string, data: UpdateFamilyRequest) => Promise<boolean>;
}

export function FamilyHeader({ family, isAdmin, onUpdate }: FamilyHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(family.name);
  const [description, setDescription] = useState(family.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 格式化创建日期
  const formattedDate = formatDate(family.createdAt);

  // 处理编辑模式切换
  const handleEditToggle = () => {
    if (isEditing) {
      // 取消编辑，恢复原始值
      setName(family.name);
      setDescription(family.description || "");
    }
    setIsEditing(!isEditing);
  };

  // 处理保存更改
  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    const success = await onUpdate(family.id, {
      name: name.trim(),
      description: description.trim() || undefined
    });
    setIsSubmitting(false);
    
    if (success) {
      setIsEditing(false);
    }
  };

  return (
    <div className="family-header">
      {isEditing ? (
        // 编辑模式
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              家庭名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              maxLength={30}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              家庭描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              rows={3}
              maxLength={100}
            />
          </div>
          <div className="flex space-x-2">
            <button
              className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-md"
              onClick={handleEditToggle}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              className="flex-1 py-2 px-4 bg-primary text-white rounded-md"
              onClick={handleSave}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
          </div>
        </>
      ) : (
        // 查看模式
        <>
          <div className="family-name">{family.name}</div>
          {family.description && (
            <div className="family-description">{family.description}</div>
          )}
          
          <div className="family-meta">
            <div className="member-count">
              <i className="fas fa-users"></i>
              <span>{family.memberCount || family.members.length}名成员</span>
            </div>
            <div className="created-date">创建于 {formattedDate}</div>
          </div>
          
          {isAdmin && (
            <button className="edit-button" onClick={handleEditToggle}>
              编辑家庭信息
            </button>
          )}
        </>
      )}
    </div>
  );
}
