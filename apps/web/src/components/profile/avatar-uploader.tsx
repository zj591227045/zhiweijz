'use client';

import { useRef, useState } from 'react';
import { toast } from 'sonner';

interface AvatarUploaderProps {
  currentAvatar?: string;
  username?: string;
  registrationOrder?: number;
  onAvatarChange: (file: File) => void;
  isUploading?: boolean;
}

export function AvatarUploader({
  currentAvatar,
  username,
  registrationOrder,
  onAvatarChange,
  isUploading = false,
}: AvatarUploaderProps) {
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理头像点击
  const handleAvatarClick = () => {
    if (isUploading) return;
    setShowUploadOptions(true);
  };

  // 处理取消上传
  const handleCancelUpload = () => {
    setShowUploadOptions(false);
  };

  // 处理拍照
  const handleTakePhoto = () => {
    // 在移动端，这会打开相机
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.setAttribute('capture', 'user');
      fileInputRef.current.click();
    }
    setShowUploadOptions(false);
  };

  // 处理从相册选择
  const handleChoosePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = 'image/*';
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
    setShowUploadOptions(false);
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        return;
      }

      // 验证文件大小 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('图片大小不能超过5MB');
        return;
      }

      // 创建预览
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // 调用回调
      onAvatarChange(file);
    }
  };

  // 获取头像显示内容
  const getAvatarContent = () => {
    if (previewUrl) {
      return <img src={previewUrl} alt="头像预览" className="avatar-image" />;
    } else if (currentAvatar) {
      return <img src={currentAvatar} alt="当前头像" className="avatar-image" />;
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
                <i className="fas fa-camera"></i>
                更换头像
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

      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileChange}
        accept="image/*"
      />

      {/* 头像上传选项 */}
      {showUploadOptions && (
        <>
          <div className="upload-overlay" onClick={handleCancelUpload}></div>
          <div className="upload-options">
            <div className="upload-title">更换头像</div>
            <div className="upload-option" onClick={handleTakePhoto}>
              <div className="option-icon">
                <i className="fas fa-camera"></i>
              </div>
              <div className="option-text">拍照</div>
            </div>
            <div className="upload-option" onClick={handleChoosePhoto}>
              <div className="option-icon">
                <i className="fas fa-image"></i>
              </div>
              <div className="option-text">从相册选择</div>
            </div>
            <div className="cancel-upload" onClick={handleCancelUpload}>
              取消
            </div>
          </div>
        </>
      )}
    </>
  );
}
