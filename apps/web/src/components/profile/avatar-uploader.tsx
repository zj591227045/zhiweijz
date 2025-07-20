'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  presetAvatars,
  avatarCategories,
  PresetAvatar,
  getAvatarUrl,
  getAvatarUrlById,
} from '@/data/preset-avatars';
import { useFileStorageStatus } from '@/store/file-storage-store';
import {
  validateAvatarFile,
  createFilePicker,
  getDeviceCapabilities,
  createImagePreview,
  revokeImagePreview,
  compressImage,
  type DeviceCapabilities,
} from '@/lib/file-upload-utils';
import { platformFilePicker } from '@/lib/platform-file-picker';
import { ImageCropper } from './image-cropper';
import { UploadProgress, useUploadProgress } from '@/components/ui/upload-progress';
import {
  debounce,
  throttle,
  PerformanceTimer,
  getOptimalQuality,
  getOptimalDimensions,
} from '@/lib/performance-utils';
import { processAvatarUrl, handleImageError } from '@/lib/image-proxy';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

interface AvatarUploaderProps {
  currentAvatar?: string; // 现在存储头像ID而不是URL
  username?: string;
  registrationOrder?: number;
  onAvatarChange: (
    avatarData: { type: 'preset'; data: PresetAvatar } | { type: 'file'; data: File },
  ) => void;
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

  // 文件上传相关状态
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [deviceCapabilities, setDeviceCapabilities] = useState<DeviceCapabilities | null>(null);
  const [platformCapabilities, setPlatformCapabilities] = useState<{
    hasCamera: boolean;
    hasGallery: boolean;
    hasFilePicker: boolean;
    platform: 'web' | 'ios' | 'android';
  } | null>(null);

  // 图片裁剪相关状态
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);

  // 文件存储状态
  const { isAvailable: isStorageAvailable, status: storageStatus } = useFileStorageStatus();

  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 上传进度管理
  const uploadProgress = useUploadProgress();

  // 性能计时器
  const performanceTimer = useRef(new PerformanceTimer());

  useEffect(() => {
    setMounted(true);
    setDeviceCapabilities(getDeviceCapabilities());

    // 异步检查平台能力
    platformFilePicker.checkCapabilities().then(setPlatformCapabilities);
  }, []);

  // 监听 isUploading 状态变化，关闭所有弹窗
  useEffect(() => {
    if (isUploading) {
      setShowAvatarSelector(false);
      setShowUploadOptions(false);
      setShowCropper(false);
      uploadProgress.hide();

      // 清理临时URL
      if (cropImageUrl) {
        revokeImagePreview(cropImageUrl);
        setCropImageUrl(null);
      }
    }
  }, [isUploading, cropImageUrl, uploadProgress]);

  // 防抖的拖拽处理
  const debouncedDragOver = useRef(
    debounce((event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
    }, 100),
  ).current;

  // 节流的进度更新
  const throttledProgressUpdate = useRef(
    throttle((progress: number, message?: string) => {
      uploadProgress.updateProgress(progress, message);
    }, 100),
  ).current;

  // 处理头像点击
  const handleAvatarClick = () => {
    if (isUploading) return;

    // 如果文件存储可用，显示选择选项；否则直接显示预设头像选择器
    if (isStorageAvailable) {
      setShowUploadOptions(true);
    } else {
      setShowAvatarSelector(true);
    }
  };

  // 处理取消选择
  const handleCancelSelection = () => {
    setShowAvatarSelector(false);
    setShowUploadOptions(false);
    setShowCropper(false);

    // 清理临时URL
    if (cropImageUrl) {
      revokeImagePreview(cropImageUrl);
      setCropImageUrl(null);
    }
  };

  // 处理预设头像选择
  const handleAvatarSelect = (avatar: PresetAvatar) => {
    setSelectedAvatar(avatar);
    onAvatarChange({ type: 'preset', data: avatar });
    setShowAvatarSelector(false);
  };

  // 处理文件选择
  const handleFileSelect = async (file: File) => {
    try {
      // 显示处理进度
      uploadProgress.show('processing', '正在处理图片...');

      // 验证文件
      const validation = validateAvatarFile(file);
      if (!validation.valid) {
        uploadProgress.setError(validation.error || '文件验证失败');
        return;
      }

      console.log('📁 原始文件大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      // 创建预览URL用于裁剪
      const imageUrl = createImagePreview(file);
      setCropImageUrl(imageUrl);

      // 隐藏进度，显示裁剪器
      uploadProgress.hide();
      setShowCropper(true);
      setShowUploadOptions(false);
    } catch (error) {
      console.error('处理文件失败:', error);
      uploadProgress.setError('处理图片失败，请重试');
    }
  };

  // 处理裁剪完成
  const handleCropComplete = async (croppedFile: File) => {
    try {
      // 开始性能计时
      performanceTimer.current.start('image-processing');

      // 显示处理进度
      uploadProgress.show('processing', '正在优化图片...');

      console.log('✂️ 裁剪完成，文件大小:', (croppedFile.size / 1024 / 1024).toFixed(2), 'MB');

      // 智能压缩图片
      let processedFile = croppedFile;
      if (croppedFile.size > 512 * 1024) {
        // 大于512KB时压缩
        performanceTimer.current.mark('compression-start');
        throttledProgressUpdate(50, '正在智能压缩图片...');

        console.log('🗜️ 开始智能压缩图片...');

        // 获取最优质量和尺寸
        const quality = getOptimalQuality(croppedFile.size);
        const optimalSize = croppedFile.size > 2 * 1024 * 1024 ? 800 : 1024;

        processedFile = await compressImage(croppedFile, optimalSize, optimalSize, quality);

        performanceTimer.current.mark('compression-end');
        console.log('🗜️ 压缩完成，文件大小:', (processedFile.size / 1024 / 1024).toFixed(2), 'MB');
        console.log(
          '🗜️ 压缩耗时:',
          performanceTimer.current.getDuration('compression-start'),
          'ms',
        );
      }

      throttledProgressUpdate(80, '准备上传...');

      // 创建最终预览
      const preview = createImagePreview(processedFile);
      setPreviewUrl(preview);

      // 关闭裁剪器
      setShowCropper(false);

      // 清理临时URL
      if (cropImageUrl) {
        revokeImagePreview(cropImageUrl);
        setCropImageUrl(null);
      }

      // 显示上传进度
      throttledProgressUpdate(90, '开始上传头像...');

      // 记录总处理时间
      const totalTime = performanceTimer.current.end('image-processing');
      console.log('📊 图片处理总耗时:', totalTime, 'ms');

      // 隐藏当前进度条，让父组件接管上传过程
      uploadProgress.hide();
      console.log('📤 图片处理完成，准备调用 onAvatarChange');

      // 触发上传
      onAvatarChange({ type: 'file', data: processedFile });
      console.log('📤 onAvatarChange 已调用，等待父组件处理上传');
    } catch (error) {
      console.error('处理裁剪结果失败:', error);

      // 确保关闭裁剪器
      setShowCropper(false);

      // 清理临时URL
      if (cropImageUrl) {
        revokeImagePreview(cropImageUrl);
        setCropImageUrl(null);
      }

      uploadProgress.setError('处理图片失败，请重试');
    }
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

  // 处理拍照
  const handleTakePhoto = async () => {
    try {
      console.log('📷 开始拍照...');
      uploadProgress.show('processing', '正在启动相机...');

      const result = await platformFilePicker.takePhoto({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result) {
        console.log('📷 拍照成功:', result.source);
        uploadProgress.updateProgress(30, '拍照成功，正在处理...');
        handleFileSelect(result.file);
      } else {
        console.log('📷 用户取消拍照');
        uploadProgress.hide();
      }
    } catch (error) {
      console.error('📷 拍照失败:', error);

      let errorMessage = '拍照功能暂不可用';
      if (error instanceof Error) {
        if (error.message.includes('权限')) {
          errorMessage = '需要相机权限才能拍照，请在设置中允许访问相机';
        } else if (error.message.includes('不支持')) {
          errorMessage = '当前设备不支持相机功能';
        } else {
          errorMessage = error.message;
        }
      }

      uploadProgress.setError(errorMessage);
    }
  };

  // 处理从相册选择
  const handleChooseFromGallery = async () => {
    try {
      console.log('🖼️ 开始选择图片...');
      uploadProgress.show('processing', '正在打开相册...');

      const result = await platformFilePicker.pickFromGallery({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result) {
        console.log('🖼️ 选择图片成功:', result.source);
        uploadProgress.updateProgress(30, '图片选择成功，正在处理...');
        handleFileSelect(result.file);
      } else {
        console.log('🖼️ 用户取消选择');
        uploadProgress.hide();
      }
    } catch (error) {
      console.error('🖼️ 选择图片失败:', error);

      let errorMessage = '选择图片功能暂不可用';
      if (error instanceof Error) {
        if (error.message.includes('权限')) {
          errorMessage = '需要相册权限才能选择图片，请在设置中允许访问相册';
        } else if (error.message.includes('不支持')) {
          errorMessage = '当前设备不支持相册功能';
        } else {
          errorMessage = error.message;
        }
      }

      uploadProgress.setError(errorMessage);
    }
  };

  // 处理拖拽上传（使用防抖优化）
  const handleDragOver = (event: React.DragEvent) => {
    debouncedDragOver(event);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const files = event.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
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

  // 获取当前分类的头像
  const getCurrentCategoryAvatars = () => {
    return presetAvatars.filter((avatar) => avatar.category === selectedCategory);
  };

  // 渲染上传选项弹窗
  const renderUploadOptions = () => {
    if (!showUploadOptions || !mounted || !deviceCapabilities || !platformCapabilities) return null;

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
            backdropFilter: 'blur(4px)',
          }}
        ></div>
        <div
          className="upload-options-modal"
          style={{
            position: 'fixed',
            bottom: '0',
            left: '0',
            right: '0',
            backgroundColor: 'var(--card-background, #ffffff)',
            borderRadius: '20px 20px 0 0',
            padding: '24px',
            boxShadow: '0 -8px 32px rgba(0, 0, 0, 0.2)',
            zIndex: 10000,
            animation: 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            maxWidth: '420px',
            margin: '0 auto',
          }}
        >
          <div className="upload-options-header">
            <div
              className="upload-options-title"
              style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}
            >
              更换头像
            </div>
            <div
              className="upload-options-subtitle"
              style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}
            >
              选择头像来源
            </div>
          </div>

          <div
            className="upload-options-list"
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {/* 拍照选项 */}
            {platformCapabilities.hasCamera && (
              <button
                className="upload-option"
                onClick={handleTakePhoto}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'var(--background-secondary)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '16px',
                }}
              >
                <div className="option-icon" style={{ marginRight: '16px', fontSize: '20px' }}>
                  📷
                </div>
                <div className="option-text">
                  {platformCapabilities.platform === 'web' ? '拍照' : '相机拍照'}
                </div>
              </button>
            )}

            {/* 从相册选择 */}
            {platformCapabilities.hasGallery && (
              <button
                className="upload-option"
                onClick={handleChooseFromGallery}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px',
                  backgroundColor: 'var(--background-secondary)',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  fontSize: '16px',
                }}
              >
                <div className="option-icon" style={{ marginRight: '16px', fontSize: '20px' }}>
                  🖼️
                </div>
                <div className="option-text">
                  {platformCapabilities.platform === 'web' ? '选择图片' : '从相册选择'}
                </div>
              </button>
            )}

            {/* 选择预设头像 */}
            <button
              className="upload-option"
              onClick={() => {
                setShowUploadOptions(false);
                setShowAvatarSelector(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '16px',
                backgroundColor: 'var(--background-secondary)',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                fontSize: '16px',
              }}
            >
              <div className="option-icon" style={{ marginRight: '16px', fontSize: '20px' }}>
                🎨
              </div>
              <div className="option-text">选择预设头像</div>
            </button>
          </div>

          {/* 取消按钮 */}
          <button
            className="cancel-upload"
            onClick={handleCancelSelection}
            style={{
              width: '100%',
              padding: '16px',
              marginTop: '16px',
              backgroundColor: 'transparent',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '16px',
              color: 'var(--text-secondary)',
            }}
          >
            取消
          </button>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
        </div>
      </>
    );

    return createPortal(modalContent, document.body);
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
            backdropFilter: 'blur(4px)',
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
            animation: 'scaleIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
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
              <button
                key={avatar.id}
                className="avatar-option"
                onClick={() => handleAvatarSelect(avatar)}
                style={{ backgroundColor: avatar.color }}
                title={avatar.name}
              >
                <img src={getAvatarUrl(avatar)} alt={avatar.name} className="avatar-option-image" />
              </button>
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
      </>
    );

    return createPortal(modalContent, document.body);
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
        return (
          <img
            src={avatarUrl}
            alt="当前头像"
            className="avatar-image"
            onError={(e) => handleImageError(e)}
          />
        );
      } else if (currentAvatar.startsWith('http') || currentAvatar.startsWith('/')) {
        // 处理URL格式的头像（包括S3 URL转代理URL）
        const processedUrl = processAvatarUrl(currentAvatar);
        return (
          <AuthenticatedImage
            src={processedUrl}
            alt="当前头像"
            className="avatar-image"
            fallback={<div className="avatar-placeholder">当前头像</div>}
          />
        );
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
          onDragOver={deviceCapabilities?.supportsDragDrop ? handleDragOver : undefined}
          onDrop={deviceCapabilities?.supportsDragDrop ? handleDrop : undefined}
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
              {isStorageAvailable && deviceCapabilities?.supportsDragDrop && (
                <div
                  className="drag-hint"
                  style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}
                >
                  点击或拖拽图片
                </div>
              )}
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

      {/* 上传选项弹窗 */}
      {renderUploadOptions()}

      {/* 头像选择器 - 使用Portal渲染到body */}
      {renderAvatarSelector()}

      {/* 图片裁剪器 */}
      {showCropper && cropImageUrl && (
        <ImageCropper
          isOpen={showCropper}
          imageUrl={cropImageUrl}
          onCrop={handleCropComplete}
          onCancel={handleCancelSelection}
          aspectRatio={1} // 1:1 圆形头像
          outputSize={512} // 输出512x512像素
        />
      )}

      {/* 上传进度指示器 */}
      <UploadProgress
        isVisible={uploadProgress.isVisible}
        status={uploadProgress.status}
        progress={uploadProgress.progress}
        message={uploadProgress.message}
        error={uploadProgress.error}
        onClose={uploadProgress.hide}
        autoClose={true}
        autoCloseDelay={2000}
      />
    </>
  );
}
