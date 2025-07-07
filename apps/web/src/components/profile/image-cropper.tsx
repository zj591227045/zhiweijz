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
  const [scale, setScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isImageDragging, setIsImageDragging] = useState(false);
  const [imageDragStart, setImageDragStart] = useState({ x: 0, y: 0, imageX: 0, imageY: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState(0);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算两点间距离（用于缩放）
  const getTouchDistance = useCallback((touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }, []);

  // 获取触摸点相对于容器的坐标
  const getRelativePosition = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }, []);

  // 图片加载完成
  const handleImageLoad = useCallback(() => {
    if (!imageRef.current || !containerRef.current) return;

    const img = imageRef.current;
    const container = containerRef.current;
    
    // 计算图片在容器中的实际显示尺寸
    const containerRect = container.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();
    
    const displayWidth = imgRect.width;
    const displayHeight = imgRect.height;

    setImageDimensions({
      width: displayWidth,
      height: displayHeight,
    });

    // 重置图片位置和缩放
    setScale(1);
    setImagePosition({ x: 0, y: 0 });

    // 初始化裁剪区域（居中）
    const size = Math.min(displayWidth, displayHeight) * 0.8;
    setCropArea({
      x: (displayWidth - size) / 2,
      y: (displayHeight - size) / 2,
      width: size,
      height: size / aspectRatio,
    });

    setImageLoaded(true);
  }, [aspectRatio]);

  // 开始拖拽裁剪框
  const handleCropMouseDown = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
    const pos = getRelativePosition(event.clientX, event.clientY);
    setDragStart({
      x: pos.x - cropArea.x,
      y: pos.y - cropArea.y,
    });
  }, [cropArea, getRelativePosition]);

  // 开始拖拽图片
  const handleImageMouseDown = useCallback((event: React.MouseEvent) => {
    if (event.target === imageRef.current) {
      event.preventDefault();
      event.stopPropagation();
      setIsImageDragging(true);
      const pos = getRelativePosition(event.clientX, event.clientY);
      setImageDragStart({
        x: pos.x,
        y: pos.y,
        imageX: imagePosition.x,
        imageY: imagePosition.y,
      });
    }
  }, [imagePosition, getRelativePosition]);

  // 触摸开始
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const touches = event.touches;
    
    if (touches.length === 1) {
      // 单指触摸 - 拖拽
      const touch = touches[0];
      const pos = getRelativePosition(touch.clientX, touch.clientY);
      
      // 检查是否点击在裁剪框上
      const cropBox = event.target as HTMLElement;
      if (cropBox.style.cursor === 'move') {
        setIsDragging(true);
        setDragStart({
          x: pos.x - cropArea.x,
          y: pos.y - cropArea.y,
        });
      } else {
        // 拖拽图片
        setIsImageDragging(true);
        setImageDragStart({
          x: pos.x,
          y: pos.y,
          imageX: imagePosition.x,
          imageY: imagePosition.y,
        });
      }
    } else if (touches.length === 2) {
      // 双指触摸 - 缩放
      const distance = getTouchDistance(touches[0], touches[1]);
      setLastTouchDistance(distance);
    }
  }, [cropArea, imagePosition, getRelativePosition, getTouchDistance]);

  // 拖拽中
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const pos = getRelativePosition(event.clientX, event.clientY);

    if (isDragging) {
      // 拖拽裁剪框
      const newX = pos.x - dragStart.x;
      const newY = pos.y - dragStart.y;

      // 计算有效的图片区域（考虑缩放和位移）
      const scaledWidth = imageDimensions.width * scale;
      const scaledHeight = imageDimensions.height * scale;
      const imageLeft = imagePosition.x + (imageDimensions.width - scaledWidth) / 2;
      const imageTop = imagePosition.y + (imageDimensions.height - scaledHeight) / 2;
      const imageRight = imageLeft + scaledWidth;
      const imageBottom = imageTop + scaledHeight;

      // 限制裁剪区域在有效图片范围内
      const maxX = imageRight - cropArea.width;
      const maxY = imageBottom - cropArea.height;
      const minX = imageLeft;
      const minY = imageTop;

      setCropArea(prev => ({
        ...prev,
        x: Math.max(minX, Math.min(newX, maxX)),
        y: Math.max(minY, Math.min(newY, maxY)),
      }));
    } else if (isImageDragging) {
      // 拖拽图片
      const deltaX = pos.x - imageDragStart.x;
      const deltaY = pos.y - imageDragStart.y;
      
      setImagePosition({
        x: imageDragStart.imageX + deltaX,
        y: imageDragStart.imageY + deltaY,
      });
    }
  }, [isDragging, isImageDragging, dragStart, imageDragStart, cropArea, imageDimensions, scale, imagePosition, getRelativePosition]);

  // 触摸移动
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const touches = event.touches;
    
    if (touches.length === 1) {
      // 单指拖拽
      const touch = touches[0];
      const pos = getRelativePosition(touch.clientX, touch.clientY);

      if (isDragging) {
        // 拖拽裁剪框
        const newX = pos.x - dragStart.x;
        const newY = pos.y - dragStart.y;

        const scaledWidth = imageDimensions.width * scale;
        const scaledHeight = imageDimensions.height * scale;
        const imageLeft = imagePosition.x + (imageDimensions.width - scaledWidth) / 2;
        const imageTop = imagePosition.y + (imageDimensions.height - scaledHeight) / 2;
        const imageRight = imageLeft + scaledWidth;
        const imageBottom = imageTop + scaledHeight;

        const maxX = imageRight - cropArea.width;
        const maxY = imageBottom - cropArea.height;
        const minX = imageLeft;
        const minY = imageTop;

        setCropArea(prev => ({
          ...prev,
          x: Math.max(minX, Math.min(newX, maxX)),
          y: Math.max(minY, Math.min(newY, maxY)),
        }));
      } else if (isImageDragging) {
        // 拖拽图片
        const deltaX = pos.x - imageDragStart.x;
        const deltaY = pos.y - imageDragStart.y;
        
        setImagePosition({
          x: imageDragStart.imageX + deltaX,
          y: imageDragStart.imageY + deltaY,
        });
      }
    } else if (touches.length === 2) {
      // 双指缩放
      const distance = getTouchDistance(touches[0], touches[1]);
      
      if (lastTouchDistance > 0) {
        const scaleChange = distance / lastTouchDistance;
        const newScale = Math.max(0.5, Math.min(3, scale * scaleChange));
        setScale(newScale);
      }
      
      setLastTouchDistance(distance);
    }
  }, [isDragging, isImageDragging, dragStart, imageDragStart, cropArea, imageDimensions, scale, imagePosition, lastTouchDistance, getRelativePosition, getTouchDistance]);

  // 结束拖拽
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsImageDragging(false);
  }, []);

  // 触摸结束
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setIsDragging(false);
    setIsImageDragging(false);
    setLastTouchDistance(0);
  }, []);

  // 滚轮缩放
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.5, Math.min(3, scale * delta));
    setScale(newScale);
  }, [scale]);

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

      // 计算实际的图片尺寸和位置
      const img = imageRef.current;
      const scaleX = img.naturalWidth / imageDimensions.width;
      const scaleY = img.naturalHeight / imageDimensions.height;

      // 计算裁剪区域在原图中的位置（考虑缩放和位移）
      const scaledWidth = imageDimensions.width * scale;
      const scaledHeight = imageDimensions.height * scale;
      const imageLeft = imagePosition.x + (imageDimensions.width - scaledWidth) / 2;
      const imageTop = imagePosition.y + (imageDimensions.height - scaledHeight) / 2;

      // 计算裁剪区域相对于图片的坐标
      const relativeX = (cropArea.x - imageLeft) / scale;
      const relativeY = (cropArea.y - imageTop) / scale;
      const relativeWidth = cropArea.width / scale;
      const relativeHeight = cropArea.height / scale;

      // 绘制裁剪后的图片
      ctx.drawImage(
        img,
        relativeX * scaleX,
        relativeY * scaleY,
        relativeWidth * scaleX,
        relativeHeight * scaleY,
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
  }, [cropArea, imageDimensions, outputSize, scale, imagePosition, onCrop]);

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
          touchAction: 'none', // 防止默认触摸行为
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
            touchAction: 'none', // 防止默认触摸行为
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
              cursor: isDragging ? 'grabbing' : (isImageDragging ? 'grabbing' : 'grab'),
              touchAction: 'none', // 防止默认触摸行为
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
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
                pointerEvents: 'auto',
                transform: `translate(${imagePosition.x}px, ${imagePosition.y}px) scale(${scale})`,
                transformOrigin: 'center',
                transition: isDragging || isImageDragging ? 'none' : 'transform 0.1s ease',
              }}
              onLoad={handleImageLoad}
              onMouseDown={handleImageMouseDown}
              draggable={false}
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
                    touchAction: 'none', // 防止默认触摸行为
                  }}
                  onMouseDown={handleCropMouseDown}
                />
              </>
            )}
          </div>

          {/* 操作提示 */}
          <div style={{ fontSize: '12px', color: '#999', textAlign: 'center' }}>
            💡 拖拽图片调整位置，使用双指缩放或滚轮调整大小
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
