'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Download, ZoomIn, ZoomOut, RotateCw, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';
import { processAvatarUrl, getThumbnailProxyUrl } from '@/lib/image-proxy';
import { Button } from '@/components/ui/button';

export interface AttachmentFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
}



// 增强版预览模态框属性
export interface EnhancedAttachmentPreviewProps {
  /** 所有附件文件 */
  files: AttachmentFile[];
  /** 当前预览的文件索引 */
  currentIndex: number;
  /** 是否显示预览模态框 */
  isOpen: boolean;
  /** 关闭预览回调 */
  onClose: () => void;
  /** 切换文件回调 */
  onNavigate: (index: number) => void;
  /** 下载文件回调 */
  onDownload?: (file: AttachmentFile) => void;
  /** 自定义样式类名 */
  className?: string;
}




// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 简化版预览模态框组件
export function EnhancedAttachmentPreview({
  files,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onDownload,
  className
}: EnhancedAttachmentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const currentFile = files[currentIndex];
  const isImage = currentFile?.mimeType.startsWith('image/');
  const isPDF = currentFile?.mimeType === 'application/pdf';

  // 切换文件时重置状态
  useEffect(() => {
    setImageLoaded(false);
    setNaturalSize({ width: 0, height: 0 });
    setZoom(1);
  }, [currentIndex]);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
          onNavigate(prevIndex);
          break;
        case 'ArrowRight':
          e.preventDefault();
          const nextIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
          onNavigate(nextIndex);
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, files.length, onNavigate, onClose]);

  // 缩放和滑动处理 - 使用React事件处理
  const lastTouchDistance = useRef<number>(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isSwiping = useRef<boolean>(false);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    console.log('Wheel event triggered:', e.deltaY);
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(prev => {
      const newZoom = Math.max(0.5, Math.min(prev + delta, 3));
      console.log('Zoom changed from', prev, 'to', newZoom);
      return newZoom;
    });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 双指缩放
      console.log('Touch start with 2 fingers');
      e.preventDefault();
      e.stopPropagation();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      lastTouchDistance.current = distance;
      isSwiping.current = false;
    } else if (e.touches.length === 1) {
      // 单指滑动
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isSwiping.current = true;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 双指缩放
      console.log('Touch move with 2 fingers');
      e.preventDefault();
      e.stopPropagation();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (lastTouchDistance.current > 0) {
        const delta = (distance - lastTouchDistance.current) * 0.01;
        setZoom(prev => {
          const newZoom = Math.max(0.5, Math.min(prev + delta, 3));
          console.log('Touch zoom changed from', prev, 'to', newZoom);
          return newZoom;
        });
      }

      lastTouchDistance.current = distance;
      isSwiping.current = false;
    } else if (e.touches.length === 1 && isSwiping.current) {
      // 单指滑动 - 只有在缩放比例为1时才允许滑动切换
      if (zoom === 1) {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartX.current);
        const deltaY = Math.abs(touch.clientY - touchStartY.current);

        // 如果水平滑动距离大于垂直滑动距离，且超过阈值，阻止默认行为
        if (deltaX > deltaY && deltaX > 30) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    }
  }, [zoom]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      console.log('Touch end, resetting distance');
      lastTouchDistance.current = 0;
    }

    // 处理滑动切换
    if (isSwiping.current && e.changedTouches.length > 0 && zoom === 1) {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = Math.abs(touch.clientY - touchStartY.current);

      // 水平滑动距离大于垂直滑动距离，且超过阈值
      if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 100) {
        console.log('Swipe detected:', deltaX > 0 ? 'right' : 'left');

        if (deltaX > 0) {
          // 右滑 - 上一张
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
          onNavigate(prevIndex);
        } else {
          // 左滑 - 下一张
          const nextIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
          onNavigate(nextIndex);
        }
      }
    }

    isSwiping.current = false;
  }, [zoom, currentIndex, files.length, onNavigate]);

  const handleDownload = () => {
    if (currentFile && onDownload) {
      onDownload(currentFile);
    }
  };

  // 使用useMemo缓存处理后的URL，避免重复计算
  const processedUrl = useMemo(() => {
    if (!currentFile?.url) return '';
    return processAvatarUrl(currentFile.url);
  }, [currentFile?.url]);

  if (!isOpen || !currentFile) {
    return null;
  }

  const modalContent = (
    <div
      className={`fixed inset-0 z-[99999] bg-black bg-opacity-95 flex flex-col ${className || ''}`}
    >
      {/* 顶部区域 - 文件名和导航指示器 */}
      <div className="flex-shrink-0 bg-white px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900 truncate flex-1 mr-4">
            {currentFile.originalName}
          </h3>
          {files.length > 1 && (
            <div className="text-sm text-gray-500 whitespace-nowrap">
              {currentIndex + 1} / {files.length}
            </div>
          )}
        </div>
      </div>

      {/* 中间区域 - 纯净的图片显示 */}
      <div
        className="flex-1 flex items-center justify-center bg-black cursor-pointer"
        onClick={onClose}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {isImage ? (
          <div
            className="select-none"
            style={{
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s ease-in-out',
            }}
          >
            <AuthenticatedImage
              src={processedUrl}
              alt={currentFile.originalName}
              className="select-none"
              style={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
              onLoad={(img) => {
                if (img) {
                  console.log('Image loaded:', {
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    displayWidth: img.width,
                    displayHeight: img.height,
                    src: img.src
                  });
                  setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
                } else {
                  console.log('Image loaded (no size info available)');
                  setNaturalSize({ width: 1920, height: 1080 }); // 默认尺寸
                }
                setImageLoaded(true);
              }}
              onError={(error) => {
                console.error('Image load error:', error, 'URL:', processedUrl);
                setImageLoaded(false);
              }}
              fallback={
                <div className="flex flex-col items-center justify-center text-white p-8">
                  <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-lg font-semibold">IMG</span>
                  </div>
                  <p className="text-lg font-medium mb-2">图片加载失败</p>
                  <p className="text-sm text-gray-300">{currentFile.originalName}</p>
                </div>
              }
            />
          </div>
        ) : isPDF ? (
          <div className="w-full h-full max-w-4xl max-h-full bg-white rounded">
            <iframe
              src={processedUrl}
              className="w-full h-full border-0 rounded"
              title={currentFile.originalName}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 bg-gray-600 rounded-lg flex items-center justify-center mb-4">
              <span className="text-lg font-semibold">FILE</span>
            </div>
            <p className="text-lg font-medium mb-2">{currentFile.originalName}</p>
            <p className="text-sm text-gray-300">此文件类型不支持预览</p>
          </div>
        )}
      </div>

      {/* 底部区域 - 文件信息和下载按钮 */}
      <div className="flex-shrink-0 bg-white px-6 py-4 border-t">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm text-gray-600">
            {formatFileSize(currentFile.size)} • {currentFile.mimeType}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            下载
          </Button>
        </div>
        {files.length > 1 && (
          <div className="text-xs text-gray-500 text-center">
            滑动或使用 ← → 键切换图片 • 滚轮或双指缩放
          </div>
        )}
      </div>
    </div>
  );

  // 使用Portal将模态框渲染到document.body中，确保全屏显示
  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
}

// 增强版附件网格组件
export interface EnhancedAttachmentGridProps {
  files: AttachmentFile[];
  onPreview: (file: AttachmentFile, index: number) => void;
  onRemove: (file: AttachmentFile) => void;
  disabled?: boolean;
  className?: string;
}

export function EnhancedAttachmentGrid({
  files,
  onPreview,
  onRemove,
  disabled = false,
  className
}: EnhancedAttachmentGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 检查滚动状态
  const checkScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth
    );
  };

  useEffect(() => {
    checkScrollState();
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScrollState);
      return () => container.removeEventListener('scroll', checkScrollState);
    }
  }, [files]);

  // 滚动控制
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = 200; // 每次滚动200px
    const newScrollLeft = direction === 'left'
      ? container.scrollLeft - scrollAmount
      : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth'
    });
  };

  if (files.length === 0) return null;

  return (
    <div className={`relative ${className || ''}`}>
      {/* 滚动按钮 */}
      {canScrollLeft && (
        <Button
          variant="outline"
          size="sm"
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md"
          onClick={() => scroll('left')}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
      )}

      {canScrollRight && (
        <Button
          variant="outline"
          size="sm"
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white shadow-md"
          onClick={() => scroll('right')}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      )}

      {/* 附件网格 */}
      <div
        ref={scrollContainerRef}
        className="flex gap-3 overflow-x-auto scrollbar-hide pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {files.map((file, index) => (
          <EnhancedAttachmentCard
            key={file.id}
            file={file}
            index={index}
            onPreview={() => onPreview(file, index)}
            onRemove={() => onRemove(file)}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
}

// 增强版附件卡片组件
interface EnhancedAttachmentCardProps {
  file: AttachmentFile;
  index: number;
  onPreview: () => void;
  onRemove: () => void;
  disabled?: boolean;
}

function EnhancedAttachmentCard({
  file,
  onPreview,
  onRemove,
  disabled = false
}: EnhancedAttachmentCardProps) {
  const isImage = file.mimeType.startsWith('image/');
  const isPDF = file.mimeType === 'application/pdf';

  // 使用useMemo缓存处理后的URL
  const processedUrl = useMemo(() => {
    return processAvatarUrl(file.url || '');
  }, [file.url]);

  return (
    <div className="relative flex-shrink-0 w-48 h-48 bg-white border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* 预览区域 */}
      <div
        className="w-full h-36 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onPreview}
      >
        {isImage ? (
          <AuthenticatedImage
            src={processedUrl}
            alt={file.originalName}
            className="w-full h-full object-cover"
            fallback={
              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                <span className="text-gray-500">图片加载失败</span>
              </div>
            }
          />
        ) : (
          <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-2">
              <span className="text-red-600 font-semibold text-sm">
                {isPDF ? 'PDF' : 'FILE'}
              </span>
            </div>
            <span className="text-xs text-gray-500">点击预览</span>
          </div>
        )}
      </div>

      {/* 文件信息 */}
      <div className="p-3 h-12 flex items-center">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>

      {/* 删除按钮 - 位于右下角内部 */}
      <Button
        variant="destructive"
        size="sm"
        className="absolute bottom-2 right-2 w-6 h-6 p-0 rounded-full opacity-80 hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        disabled={disabled}
        title="删除附件"
      >
        <Trash2 className="w-3 h-3" />
      </Button>
    </div>
  );
}

// 缩略图组件
export interface AttachmentThumbnailProps {
  file: AttachmentFile;
  onClick?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function AttachmentThumbnail({
  file,
  onClick,
  className,
  size = 'medium'
}: AttachmentThumbnailProps) {
  const isImage = file.mimeType.startsWith('image/');
  const isPDF = file.mimeType === 'application/pdf';

  // 使用useMemo缓存处理后的URL
  const processedUrl = useMemo(() => {
    if (!file.url) return '';
    
    // 如果是图片文件，使用缩略图URL
    if (isImage) {
      return getThumbnailProxyUrl(file.url, {
        width: size === 'small' ? 64 : size === 'medium' ? 96 : 128,
        height: size === 'small' ? 64 : size === 'medium' ? 96 : 128,
        quality: 80,
        format: 'jpeg'
      });
    }
    
    // 非图片文件使用原始URL处理
    return processAvatarUrl(file.url);
  }, [file.url, isImage, size]);

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'w-8 h-8';
      case 'medium':
        return 'w-12 h-12';
      case 'large':
        return 'w-16 h-16';
      default:
        return 'w-12 h-12';
    }
  };

  return (
    <div 
      className={`${getSizeClass()} bg-gray-100 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${className || ''}`}
      onClick={onClick}
      title={file.originalName}
    >
      {isImage ? (
        <AuthenticatedImage
          src={processedUrl}
          alt={file.originalName}
          className="w-full h-full object-cover"
          fallback={
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-500">IMG</span>
            </div>
          }
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600">
            {isPDF ? 'PDF' : 'FILE'}
          </span>
        </div>
      )}
    </div>
  );
}
