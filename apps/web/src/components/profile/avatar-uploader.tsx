'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { presetAvatars, avatarCategories, PresetAvatar, getAvatarUrl, getAvatarUrlById } from '@/data/preset-avatars';

interface AvatarUploaderProps {
  currentAvatar?: string; // 现在存储头像ID而不是URL
  username?: string;
  registrationOrder?: number;
  onAvatarChange: (avatarData: { type: 'preset'; data: PresetAvatar } | { type: 'file'; data: File }) => void;
  isUploading?: boolean;
}

export function AvatarUploader({
  currentAvatar,
  username,
  registrationOrder,
  onAvatarChange,
  isUploading = false,
}: AvatarUploaderProps) {
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('standard');
  const [selectedAvatar, setSelectedAvatar] = useState<PresetAvatar | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 处理头像点击
  const handleAvatarClick = () => {
    if (isUploading) return;
    setShowAvatarSelector(true);
  };

  // 处理取消选择
  const handleCancelSelection = () => {
    setShowAvatarSelector(false);
  };

  // 处理头像选择
  const handleAvatarSelect = (avatar: PresetAvatar) => {
    setSelectedAvatar(avatar);
    onAvatarChange({ type: 'preset', data: avatar });
    setShowAvatarSelector(false);
  };

  // 获取当前分类的头像
  const getCurrentCategoryAvatars = () => {
    return presetAvatars.filter(avatar => avatar.category === selectedCategory);
  };

  // 渲染头像选择器弹窗
  const renderAvatarSelector = () => {
    if (!showAvatarSelector || !mounted) return null;

    const modalContent = (
      <>
        <div
          className="avatar-selector-overlay"
          onClick={handleCancelSelection}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
          }}
        ></div>
        <div
          className="avatar-selector"
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: 'var(--card-background, #ffffff)',
            borderRadius: '20px',
            padding: 0,
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
            zIndex: 10000,
            width: '90vw',
            maxWidth: '420px',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            animation: 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div className="selector-header">
            <div className="selector-title">选择头像</div>
            <button className="selector-close" onClick={handleCancelSelection}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* 分类选择 */}
          <div className="category-tabs">
            {avatarCategories.map(category => (
              <button
                key={category.id}
                className={`category-tab ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category.id)}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
              </button>
            ))}
          </div>

          {/* 头像网格 */}
          <div className="avatar-grid">
            {getCurrentCategoryAvatars().map(avatar => (
              <button
                key={avatar.id}
                className="avatar-option"
                onClick={() => handleAvatarSelect(avatar)}
                style={{ backgroundColor: avatar.color }}
                title={avatar.name}
              >
                <img
                  src={getAvatarUrl(avatar)}
                  alt={avatar.name}
                  className="avatar-option-image"
                />
              </button>
            ))}
          </div>

          {/* 底部说明 */}
          <div className="selector-footer">
            <p className="future-feature-note">
              <i className="fas fa-info-circle"></i>
              在未来的版本中将添加上传自定义图片作为头像的功能
            </p>
          </div>
        </div>
      </>
    );

    return createPortal(modalContent, document.body);
  };

  // 获取头像显示内容
  const getAvatarContent = () => {
    if (selectedAvatar) {
      return (
        <img
          src={getAvatarUrl(selectedAvatar)}
          alt={selectedAvatar.name}
          className="avatar-image"
        />
      );
    } else if (currentAvatar) {
      // 检查是否是头像ID
      const avatarUrl = getAvatarUrlById(currentAvatar);
      if (avatarUrl) {
        return <img src={avatarUrl} alt="当前头像" className="avatar-image" />;
      } else if (currentAvatar.startsWith('http') || currentAvatar.startsWith('/')) {
        // 兼容旧的URL格式
        return <img src={currentAvatar} alt="当前头像" className="avatar-image" />;
      } else {
        // 可能是旧的emoji格式，显示为文字
        return <div className="avatar-placeholder">{currentAvatar}</div>;
      }
    } else {
      // 显示用户名首字母
      return <div className="avatar-placeholder">{username?.charAt(0) || '用'}</div>;
    }
  };

  return (
    <>
      <div className="avatar-section">
        <div
          className={`avatar-container ${isUploading ? 'uploading' : ''}`}
          onClick={handleAvatarClick}
          role="button"
          tabIndex={0}
          aria-label="更换头像"
        >
          {getAvatarContent()}
          {!isUploading && (
            <div className="avatar-overlay">
              <div className="avatar-overlay-text">
                <i className="fas fa-palette"></i>
                选择头像
              </div>
            </div>
          )}
          {isUploading && (
            <div className="avatar-loading">
              <i className="fas fa-spinner fa-spin"></i>
            </div>
          )}
        </div>

        {/* 用户序号显示 */}
        {registrationOrder && (
          <div className="user-order-badge">
            <div className="order-text">
              您是<span className="app-name">「只为记账」</span>的第
              <span className="order-number">{registrationOrder.toLocaleString()}</span>名用户
            </div>
            <div className="order-decoration">
              <i className="fas fa-crown"></i>
            </div>
          </div>
        )}
      </div>

      {/* 头像选择器 - 使用Portal渲染到body */}
      {renderAvatarSelector()}
    </>
  );
}
