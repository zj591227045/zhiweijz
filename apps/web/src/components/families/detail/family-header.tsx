"use client";

import { useState } from "react";
import { toast } from "sonner";

interface FamilyDetail {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  memberCount: number;
  members: any[];
}

interface FamilyHeaderProps {
  family: FamilyDetail;
  isAdmin: boolean;
  onUpdate: (id: string, data: { name: string; description?: string }) => Promise<boolean>;
}

export function FamilyHeader({ family, isAdmin, onUpdate }: FamilyHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(family.name);
  const [description, setDescription] = useState(family.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 格式化创建日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
    if (!name.trim()) {
      toast.error('家庭名称不能为空');
      return;
    }
    
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
        <div className="family-edit-form">
          <div className="form-group">
            <label className="form-label">
              家庭名称
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="form-input"
              maxLength={30}
              placeholder="请输入家庭名称"
            />
          </div>
          <div className="form-group">
            <label className="form-label">
              家庭描述
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              rows={3}
              maxLength={100}
              placeholder="请输入家庭描述（可选）"
            />
          </div>
          <div className="form-actions">
            <button
              className="btn-secondary"
              onClick={handleEditToggle}
              disabled={isSubmitting}
            >
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={isSubmitting || !name.trim()}
            >
              {isSubmitting ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : (
        // 查看模式
        <div className="family-info">
          <div className="family-name">{family.name}</div>
          {family.description && (
            <div className="family-description">{family.description}</div>
          )}
          
          <div className="family-meta">
            <div className="family-stat">
              <i className="fas fa-users"></i>
              <span>{family.memberCount || family.members.length}名成员</span>
            </div>
            <div className="family-stat">
              <i className="fas fa-calendar-alt"></i>
              <span>创建于 {formatDate(family.createdAt)}</span>
            </div>
          </div>
          
          {isAdmin && (
            <button className="edit-button" onClick={handleEditToggle}>
              <i className="fas fa-edit"></i>
              编辑家庭信息
            </button>
          )}
        </div>
      )}
    </div>
  );
}
