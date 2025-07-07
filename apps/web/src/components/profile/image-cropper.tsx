'use client';

import { useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

/**
 * 裁剪区域
 */
interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 图片裁剪器属性
 */
interface ImageCropperProps {
  isOpen: boolean;
  imageUrl: string;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
  aspectRatio?: number; // 宽高比，默认1:1
  outputSize?: number; // 输出尺寸，默认512px
}

/**
 * 图片裁剪组件
 */
export function ImageCropper({
  isOpen,
  imageUrl,
  onCrop,
  onCancel,
  aspectRatio = 1,
  outputSize = 512,
}: ImageCropperProps) {
  const [cropArea, setCropArea] = useState<CropArea>({ x: 0, y: 0, width: 200, height: 200 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 图片加载完成
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    
    // 计算图片在容器中的实际显示尺寸
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    setImageDimensions({
      width: imgRect.width,
      height: imgRect.height,
    });

    // 初始化裁剪区域（居中）
    const size = Math.min(imgRect.width, imgRect.height) * 0.8;
    setCropArea({
      x: (imgRect.width - size) / 2,
      y: (imgRect.height - size) / 2,
      width: size,
      height: size / aspectRatio,
    });

    setImageLoaded(true);
  }, [aspectRatio]);

  // 开始拖拽
  const handleMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: event.clientX - cropArea.x,
      y: event.clientY - cropArea.y,
    });
  }, [cropArea]);

  // 拖拽中
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!isDragging || !imageRef.current) return;

    const newX = event.clientX - dragStart.x;
    const newY = event.clientY - dragStart.y;

    // 限制裁剪区域在图片范围内
    const maxX = imageDimensions.width - cropArea.width;
    const maxY = imageDimensions.height - cropArea.height;

    setCropArea(prev => ({
      ...prev,
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    }));
  }, [isDragging, dragStart, imageDimensions, cropArea.width, cropArea.height]);

  // 结束拖拽
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 执行裁剪
  const handleCrop = useCallback(async () => {
    if (!imageRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 设置输出尺寸
      canvas.width = outputSize;
      canvas.height = outputSize;

      // 计算缩放比例
      const img = imageRef.current;
      const scaleX = img.naturalWidth / imageDimensions.width;
      const scaleY = img.naturalHeight / imageDimensions.height;

      // 绘制裁剪后的图片
      ctx.drawImage(
        img,
        cropArea.x * scaleX,
        cropArea.y * scaleY,
        cropArea.width * scaleX,
        cropArea.height * scaleY,
        0,
        0,
        outputSize,
        outputSize
      );

      // 转换为Blob
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `cropped_avatar_${Date.now()}.jpg`, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          onCrop(file);
        }
      }, 'image/jpeg', 0.9);
    } catch (error) {
      console.error('裁剪失败:', error);
      alert('图片裁剪失败，请重试');
    }
  }, [cropArea, imageDimensions, outputSize, onCrop]);

  if (!isOpen) return null;

  const modalContent = (
    <>
      <div
        className="image-cropper-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onClick={onCancel}
      >
        <div
          className="image-cropper-modal"
          style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 标题 */}
          <div className="cropper-header">
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
              调整头像
            </h3>
            <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#666' }}>
              拖拽选择区域，调整头像显示范围
            </p>
          </div>

          {/* 裁剪区域 */}
          <div
            ref={containerRef}
            className="cropper-container"
            style={{
              position: 'relative',
              maxWidth: '400px',
              maxHeight: '400px',
              overflow: 'hidden',
              borderRadius: '8px',
              cursor: isDragging ? 'grabbing' : 'grab',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <img
              ref={imageRef}
              src={imageUrl}
              alt="待裁剪图片"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                display: 'block',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
              onLoad={handleImageLoad}
            />

            {/* 裁剪框 */}
            {imageLoaded && (
              <>
                {/* 遮罩层 */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    pointerEvents: 'none',
                  }}
                />
                
                {/* 裁剪区域 */}
                <div
                  style={{
                    position: 'absolute',
                    left: cropArea.x,
                    top: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height,
                    border: '2px solid #fff',
                    borderRadius: '50%',
                    cursor: 'move',
                    backgroundColor: 'transparent',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                  }}
                  onMouseDown={handleMouseDown}
                />
              </>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="cropper-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={onCancel}
              style={{
                padding: '12px 24px',
                border: '1px solid #ddd',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              取消
            </button>
            <button
              onClick={handleCrop}
              disabled={!imageLoaded}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: '#007AFF',
                color: 'white',
                cursor: imageLoaded ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                opacity: imageLoaded ? 1 : 0.5,
              }}
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
