"use client";

import { useRef, useState, useCallback } from "react";
import { useProfileStore } from "@/store/profile-store";
import ReactCrop, { Crop, PixelCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";

export function AvatarUploader() {
  const {
    profile,
    avatarFile,
    avatarPreview,
    showUploadOptions,
    showImageCropper,
    setAvatarFile,
    setAvatarPreview,
    setShowUploadOptions,
    setShowImageCropper,
    setCropArea,
  } = useProfileStore();

  const [crop, setCrop] = useState<Crop>({
    unit: "%",
    width: 100,
    height: 100,
    x: 0,
    y: 0,
  });

  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理头像点击
  const handleAvatarClick = () => {
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
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.capture = "user";
      fileInputRef.current.click();
    }
  };

  // 处理从相册选择
  const handleChoosePhoto = () => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = "image/*";
      fileInputRef.current.removeAttribute("capture");
      fileInputRef.current.click();
    }
  };

  // 处理文件选择
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        setAvatarFile(file);
        setAvatarPreview(reader.result as string);
        setShowUploadOptions(false);
        setShowImageCropper(true);
      };

      reader.readAsDataURL(file);
    }
  };

  // 处理取消裁剪
  const handleCancelCrop = () => {
    setShowImageCropper(false);
    setAvatarFile(null);
    setAvatarPreview(null);
  };

  // 处理确认裁剪
  const handleConfirmCrop = () => {
    if (completedCrop && imgRef.current) {
      // 创建画布并绘制裁剪区域
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
      const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

      canvas.width = completedCrop.width;
      canvas.height = completedCrop.height;

      ctx.drawImage(
        imgRef.current,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width,
        completedCrop.height
      );

      // 将画布转换为Blob
      canvas.toBlob((blob) => {
        if (blob) {
          // 创建新的File对象
          const croppedFile = new File([blob], "avatar.jpg", {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          // 更新状态
          setAvatarFile(croppedFile);
          setAvatarPreview(canvas.toDataURL("image/jpeg"));

          // 保存裁剪区域
          setCropArea({
            x: completedCrop.x,
            y: completedCrop.y,
            width: completedCrop.width,
            height: completedCrop.height,
          });

          // 关闭裁剪器
          setShowImageCropper(false);
        }
      }, "image/jpeg", 0.95);
    }
  };

  // 获取头像显示内容
  const getAvatarContent = () => {
    if (avatarPreview) {
      return <img src={avatarPreview} alt="头像" />;
    } else if (profile?.avatar) {
      return <img src={profile.avatar} alt="头像" />;
    } else {
      // 显示用户名首字母
      return profile?.username?.charAt(0) || "用";
    }
  };

  return (
    <>
      <div className="avatar-section">
        <div
          className="avatar-container"
          onClick={handleAvatarClick}
          role="button"
          tabIndex={0}
          aria-label="更换头像"
        >
          <div className="avatar-image">{getAvatarContent()}</div>
          <div className="avatar-overlay">
            <div className="avatar-overlay-text">
              <i className="fas fa-camera" style={{ marginRight: '4px' }}></i>
              更换头像
            </div>
          </div>
        </div>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleFileChange}
        accept="image/*"
      />

      {/* 头像上传选项 */}
      {showUploadOptions && (
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
      )}

      {/* 图片裁剪工具 */}
      {showImageCropper && avatarPreview && (
        <div className="image-cropper">
          <div className="cropper-container">
            <ReactCrop
              crop={crop}
              onChange={(c) => setCrop(c)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={1}
              circularCrop
            >
              <img
                ref={imgRef}
                src={avatarPreview}
                alt="裁剪图片"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />
            </ReactCrop>
          </div>
          <div className="cropper-actions">
            <button
              className="cropper-button cancel-button"
              onClick={handleCancelCrop}
            >
              取消
            </button>
            <button
              className="cropper-button confirm-button"
              onClick={handleConfirmCrop}
            >
              确认
            </button>
          </div>
        </div>
      )}
    </>
  );
}
