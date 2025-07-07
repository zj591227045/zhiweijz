'use client';

import { useState, useEffect, useRef } from 'react';
import { presetAvatars, avatarCategories, PresetAvatar, getAvatarUrl, getAvatarUrlById } from '@/data/preset-avatars';
import { useFileStorageStatus } from '@/store/file-storage-store';
import { validateAvatarFile, createImagePreview, revokeImagePreview } from '@/lib/file-upload-utils';

/**
 * 头像数据类型
 */
export type AvatarData = 
  | { type: 'preset'; data: PresetAvatar }
  | { type: 'file'; data: File };

/**
 * 头像上传器属性
 */
interface AvatarUploaderProps {
  currentAvatar?: string;
  username?: string;
  registrationOrder?: number;
  onAvatarChange: (avatarData: AvatarData) => void;
  isUploading?: boolean;
}

/**
 * 简化版头像上传组件
 */
export function AvatarUploaderSimple({
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
  
  // 文件上传相关状态
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // 文件存储状态
  const { isAvailable: isStorageAvailable } = useFileStorageStatus();
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    // 清理预览URL
    if (previewUrl) {
      revokeImagePreview(previewUrl);
      setPreviewUrl(null);
    }
  };

  // 处理预设头像选择
  const handleAvatarSelect = (avatar: PresetAvatar) => {
    setSelectedAvatar(avatar);
    onAvatarChange({ type: 'preset', data: avatar });
    setShowAvatarSelector(false);
  };

  // 处理文件选择
  const handleFileSelect = (file: File) => {
    // 验证文件
    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    // 创建预览
    const preview = createImagePreview(file);
    setPreviewUrl(preview);

    // 触发上传
    onAvatarChange({ type: 'file', data: file });
    setShowAvatarSelector(false);
  };

  // 处理文件输入变化
  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // 清空input值，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 处理文件上传按钮点击
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // 获取当前分类的头像
  const getCurrentCategoryAvatars = () => {
    return presetAvatars.filter(avatar => avatar.category === selectedCategory);
  };

  // 获取头像显示内容
  const getAvatarContent = () => {
    // 优先显示预览图片
    if (previewUrl) {
      return <img src={previewUrl} alt="预览头像" className="avatar-image" />;
    }
    
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

  // 清理预览URL
  useEffect(() => {
    return () => {
      if (previewUrl) {
        revokeImagePreview(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!mounted) return null;

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
                {isStorageAvailable ? '更换头像' : '选择头像'}
              </div>
            </div>
          )}

          {isUploading && (
            <div className="avatar-loading">
              <i className="fas fa-spinner fa-spin"></i>
              <span>上传中...</span>
            </div>
          )}
        </div>

        {registrationOrder && (
          <div className="registration-badge">
            <span className="order-text">您是</span>
            <span className="order-number">第{registrationOrder}名</span>
            <span className="order-text">用户</span>
          </div>
        )}
      </div>

      {/* 头像选择器弹窗 */}
      {showAvatarSelector && (
        <div className="avatar-selector-overlay" onClick={handleCancelSelection}>
          <div className="avatar-selector" onClick={(e) => e.stopPropagation()}>
            <div className="selector-header">
              <h3 className="selector-title">选择头像</h3>
              <button className="selector-close" onClick={handleCancelSelection}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* 文件上传选项 */}
            {isStorageAvailable && (
              <div className="upload-section">
                <button
                  className="upload-button"
                  onClick={handleUploadClick}
                  type="button"
                >
                  <i className="fas fa-upload"></i>
                  上传自定义头像
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileInputChange}
                  style={{ display: 'none' }}
                />
              </div>
            )}

            {/* 分类选择 */}
            <div className="category-tabs">
              {avatarCategories.map((category) => (
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
              {getCurrentCategoryAvatars().map((avatar) => (
                <div
                  key={avatar.id}
                  className="avatar-option"
                  onClick={() => handleAvatarSelect(avatar)}
                  role="button"
                  tabIndex={0}
                  aria-label={`选择头像: ${avatar.name}`}
                >
                  <img
                    src={getAvatarUrl(avatar)}
                    alt={avatar.name}
                    className="avatar-option-image"
                  />
                </div>
              ))}
            </div>

            {/* 底部说明 */}
            <div className="selector-footer">
              <p className="future-feature-note">
                <i className="fas fa-info-circle"></i>
                {isStorageAvailable 
                  ? '您也可以上传自定义图片作为头像' 
                  : '自定义头像上传功能需要管理员配置文件存储服务'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
