'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { EnhancedAuthenticatedImage } from '@/components/ui/enhanced-authenticated-image';
import { processAvatarUrl, getThumbnailProxyUrl } from '@/lib/image-proxy';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
  /** 删除文件回调 */
  onDelete?: (file: AttachmentFile, index: number) => void;
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
  onDelete,
  className,
}: EnhancedAttachmentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  const currentFile = files[currentIndex];
  const isImage = currentFile?.mimeType.startsWith('image/');
  const isPDF = currentFile?.mimeType === 'application/pdf';

  // 切换文件时重置状态
  useEffect(() => {
    setImageLoaded(false);
    setNaturalSize({ width: 0, height: 0 });
    setZoom(1);
    setShowActionMenu(false);
  }, [currentIndex]);

  // 清除长按定时器
  useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // 长按处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isImage) return;
    
    const timer = setTimeout(() => {
      // 触发震动反馈
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      setShowActionMenu(true);
      setLongPressTimer(null); // 清除timer引用，表示长按已经触发
    }, 500);
    setLongPressTimer(timer);
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (longPressTimer) {
      // 如果timer还存在，说明是短点击，执行关闭操作
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
      
      // 短点击关闭功能
      if (e.target === e.currentTarget || e.target instanceof HTMLImageElement) {
        onClose();
      }
    }
    // 如果timer已经被清除（长按已触发），则不执行关闭操作
  };

  const handleMouseLeave = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  // 处理删除
  const handleDelete = () => {
    if (!onDelete || !currentFile) return;

    // 先关闭操作菜单
    setShowActionMenu(false);
    
    // 显示确认对话框
    const confirmDelete = window.confirm(`确定要删除图片"${currentFile.originalName}"吗？此操作无法撤销。`);
    
    if (confirmDelete) {
      onDelete(currentFile, currentIndex);
    }
  };

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
    setZoom((prev) => {
      const newZoom = Math.max(0.5, Math.min(prev + delta, 3));
      console.log('Zoom changed from', prev, 'to', newZoom);
      return newZoom;
    });
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // 双指缩放
      e.preventDefault();
      e.stopPropagation();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + Math.pow(touch2.clientY - touch1.clientY, 2),
      );
      lastTouchDistance.current = distance;
      isSwiping.current = false;
      
      // 清除长按定时器
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
      }
    } else if (e.touches.length === 1) {
      // 单指触摸
      const touch = e.touches[0];
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isSwiping.current = true;
      
      // 开始长按检测
      if (isImage) {
        const timer = setTimeout(() => {
          // 触发震动反馈
          if ('vibrate' in navigator) {
            navigator.vibrate(100);
          }
          setShowActionMenu(true);
          setLongPressTimer(null);
          isSwiping.current = false; // 阻止滑动
        }, 500);
        setLongPressTimer(timer);
      }
    }
  }, [isImage, longPressTimer]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        // 双指缩放
        console.log('Touch move with 2 fingers');
        e.preventDefault();
        e.stopPropagation();
        const touch1 = e.touches[0];
        const touch2 = e.touches[1];
        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2),
        );

        if (lastTouchDistance.current > 0) {
          const delta = (distance - lastTouchDistance.current) * 0.01;
          setZoom((prev) => {
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

          // 检测移动距离，如果超过阈值则取消长按
          if ((deltaX > 10 || deltaY > 10) && longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
          }

          // 如果水平滑动距离大于垂直滑动距离，且超过阈值，阻止默认行为
          if (deltaX > deltaY && deltaX > 30) {
            e.preventDefault();
            e.stopPropagation();
          }
        } else {
          // 缩放状态下的移动也要取消长按
          const touch = e.touches[0];
          const deltaX = Math.abs(touch.clientX - touchStartX.current);
          const deltaY = Math.abs(touch.clientY - touchStartY.current);
          
          if ((deltaX > 10 || deltaY > 10) && longPressTimer) {
            clearTimeout(longPressTimer);
            setLongPressTimer(null);
          }
        }
      }
    },
    [zoom, longPressTimer],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
        lastTouchDistance.current = 0;
      }

      // 处理长按逻辑
      if (longPressTimer) {
        // 如果timer还存在，说明是短触摸，执行关闭操作
        clearTimeout(longPressTimer);
        setLongPressTimer(null);
        
        // 短触摸关闭功能
        if (e.target === e.currentTarget) {
          onClose();
          return; // 直接返回，不执行滑动逻辑
        }
      }
      // 如果是长按后的释放，不执行关闭操作，但可以执行滑动切换

      // 处理滑动切换
      if (isSwiping.current && e.changedTouches.length > 0 && zoom === 1 && !showActionMenu) {
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartX.current;
        const deltaY = Math.abs(touch.clientY - touchStartY.current);

        // 水平滑动距离大于垂直滑动距离，且超过阈值
        if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 100) {
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
    },
    [zoom, currentIndex, files.length, onNavigate, onClose, longPressTimer, showActionMenu],
  );

  const handleDownload = async () => {
    if (!currentFile) return;

    try {
      // 检测平台
      const isCapacitor = !!(typeof window !== 'undefined' && (window as any).Capacitor);
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        typeof window !== 'undefined' ? navigator.userAgent : ''
      );
      const isImage = currentFile.mimeType.startsWith('image/');

      // 获取图片URL
      const imageUrl = processedUrl || currentFile.url;
      if (!imageUrl) {
        console.error('图片URL不存在');
        return;
      }

      // 移动端且是图片时，尝试保存到相册
      if (isCapacitor && isImage) {
        await handleMobileSaveToGallery(imageUrl, currentFile.originalName);
      } else if (isMobile && isImage) {
        // Web移动端，提供选择
        await handleWebMobileSave(imageUrl, currentFile.originalName);
      } else {
        // 桌面端或非图片文件，使用传统下载
        await handleDesktopDownload(imageUrl, currentFile.originalName);
      }

      // 如果有外部回调，也调用它
      if (onDownload) {
        onDownload(currentFile);
      }
    } catch (error) {
      console.error('保存图片失败:', error);
      // 回退到外部回调
      if (onDownload) {
        onDownload(currentFile);
      }
    }
  };

  // Capacitor移动端保存到相册
  const handleMobileSaveToGallery = async (imageUrl: string, fileName: string) => {
    try {
      // 动态导入Capacitor插件
      const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');

      // 下载图片数据
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // 转换为base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // 移除data:image/...;base64,前缀
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // 保存到Documents目录（iOS）或Downloads目录（Android）
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const directory = isIOS ? Directory.Documents : Directory.ExternalStorage;
      const folderPath = isIOS ? 'Pictures' : 'Download/ZhiWeiJZ';

      // 创建文件名
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const finalFileName = `zhiweijz_${timestamp}.jpg`;
      const filePath = `${folderPath}/${finalFileName}`;

      // 保存文件
      await Filesystem.writeFile({
        path: filePath,
        data: base64Data,
        directory: directory,
        encoding: Encoding.UTF8
      });

      // 显示成功提示
      if (isIOS) {
        toast.success('图片已保存到文件，请在"文件"应用中查看');
      } else {
        toast.success('图片已保存到下载文件夹');
      }
    } catch (error) {
      console.error('保存到相册失败:', error);

      // 尝试使用Share API作为备选方案
      try {
        await handleWebMobileSave(imageUrl, fileName);
      } catch (shareError) {
        console.error('Share API也失败:', shareError);
        // 最后回退到传统下载
        await handleDesktopDownload(imageUrl, fileName);
      }
    }
  };

  // Web移动端保存
  const handleWebMobileSave = async (imageUrl: string, fileName: string) => {
    // 检查是否支持Web Share API
    if (navigator.share && navigator.canShare) {
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: '保存图片',
            text: '选择保存位置'
          });
          return;
        }
      } catch (error) {
        console.warn('Web Share API失败:', error);
      }
    }

    // 回退到传统下载
    await handleDesktopDownload(imageUrl, fileName);
  };

  // 桌面端下载
  const handleDesktopDownload = async (imageUrl: string, fileName: string) => {
    // 创建一个临时的下载链接
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = fileName || `image-${Date.now()}.jpg`;

    // 对于跨域图片，尝试通过fetch获取blob
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      link.href = blobUrl;
    } catch (error) {
      console.warn('无法通过fetch下载，使用直接链接:', error);
      // 如果fetch失败，回退到直接链接下载
    }

    // 触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // 如果创建了blob URL，记得释放
    if (link.href.startsWith('blob:')) {
      URL.revokeObjectURL(link.href);
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
      className={`fixed inset-0 z-[99999] bg-black bg-opacity-100 flex items-center justify-center ${className || ''}`}
    >
      {/* 全屏图片显示区域 */}
      <div
        className="flex-1 flex items-center justify-center cursor-pointer relative"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {isImage ? (
          <div
            className="select-none"
            style={{
              transform: `scale(${zoom})`,
              transition: 'transform 0.2s ease-in-out',
            }}
          >
            <EnhancedAuthenticatedImage
              src={processedUrl}
              alt={currentFile.originalName}
              className="select-none"
              style={{
                maxWidth: '100vw',
                maxHeight: '100vh',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
              }}
              retryCount={3}
              timeout={15000}
              onLoad={(img) => {
                if (img) {
                  console.log('Image loaded:', {
                    naturalWidth: img.naturalWidth,
                    naturalHeight: img.naturalHeight,
                    displayWidth: img.width,
                    displayHeight: img.height,
                    src: img.src,
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
                  <div className="w-16 h-16 bg-gray-600 dark:bg-gray-500 rounded-lg flex items-center justify-center mb-4">
                    <span className="text-lg font-semibold">IMG</span>
                  </div>
                  <p className="text-lg font-medium mb-2">图片加载失败</p>
                  <p className="text-sm text-gray-300 dark:text-gray-400">{currentFile.originalName}</p>
                </div>
              }
            />
          </div>
        ) : isPDF ? (
          <div className="w-full h-full max-w-4xl max-h-full bg-white dark:bg-gray-800 rounded">
            <iframe
              src={processedUrl}
              className="w-full h-full border-0 rounded"
              title={currentFile.originalName}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-white">
            <div className="w-16 h-16 bg-gray-600 dark:bg-gray-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-lg font-semibold">FILE</span>
            </div>
            <p className="text-lg font-medium mb-2">{currentFile.originalName}</p>
            <p className="text-sm text-gray-300 dark:text-gray-400">此文件类型不支持预览</p>
          </div>
        )}

        {/* 导航按钮 */}
        {files.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const prevIndex = currentIndex > 0 ? currentIndex - 1 : files.length - 1;
                onNavigate(prevIndex);
              }}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-opacity duration-200"
              aria-label="上一张"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const nextIndex = currentIndex < files.length - 1 ? currentIndex + 1 : 0;
                onNavigate(nextIndex);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-opacity duration-200"
              aria-label="下一张"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* 关闭按钮 */}
      <button
        onClick={onClose}
        className="absolute top-12 right-4 bg-black bg-opacity-50 hover:bg-opacity-75 text-white rounded-full p-2 transition-opacity duration-200 z-10"
        aria-label="关闭"
      >
        <X className="w-6 h-6" />
      </button>

      {/* 文件指示器 */}
      {files.length > 1 && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
          {currentIndex + 1} / {files.length}
        </div>
      )}
    </div>
  );

  // 使用Portal将模态框渲染到document.body中，确保全屏显示
  const modalPortal = typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
  
  // 使用单独的Portal渲染菜单，确保最高层级
  const menuPortal = typeof window !== 'undefined' && showActionMenu ? createPortal(
    <>
      {/* 菜单遮罩 */}
      <div 
        className="fixed inset-0 z-[100000] bg-transparent"
        onClick={() => setShowActionMenu(false)}
      />
      {/* 长按操作菜单 */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden z-[100001] min-w-[240px]">
        <div className="py-3">
          {onDownload && (
            <button
              onClick={() => {
                setShowActionMenu(false);
                handleDownload();
              }}
              className="flex items-center px-6 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 w-full text-left"
            >
              <Download className="w-6 h-6 mr-4 text-blue-600 dark:text-blue-400" />
              <span className="text-gray-800 dark:text-gray-200 text-lg font-medium">保存图片</span>
            </button>
          )}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="flex items-center px-6 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 w-full text-left"
            >
              <Trash2 className="w-6 h-6 mr-4 text-red-600 dark:text-red-400" />
              <span className="text-red-600 dark:text-red-400 text-lg font-medium">删除图片</span>
            </button>
          )}
          <button
            onClick={() => setShowActionMenu(false)}
            className="flex items-center px-6 py-4 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150 w-full text-left"
          >
            <X className="w-6 h-6 mr-4 text-gray-600 dark:text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300 text-lg font-medium">取消</span>
          </button>
        </div>
      </div>
    </>,
    document.body
  ) : null;

  return (
    <>
      {modalPortal}
      {menuPortal}
    </>
  );
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
  className,
}: EnhancedAttachmentGridProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 检查滚动状态
  const checkScrollState = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    setCanScrollLeft(container.scrollLeft > 0);
    setCanScrollRight(container.scrollLeft < container.scrollWidth - container.clientWidth);
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
    const newScrollLeft =
      direction === 'left'
        ? container.scrollLeft - scrollAmount
        : container.scrollLeft + scrollAmount;

    container.scrollTo({
      left: newScrollLeft,
      behavior: 'smooth',
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
  disabled = false,
}: EnhancedAttachmentCardProps) {
  const isImage = file.mimeType.startsWith('image/');
  const isPDF = file.mimeType === 'application/pdf';

  // 使用useMemo缓存处理后的URL
  const processedUrl = useMemo(() => {
    return processAvatarUrl(file.url || '');
  }, [file.url]);

  return (
    <div className="relative flex-shrink-0 w-48 h-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* 预览区域 */}
      <div
        className="w-full h-36 cursor-pointer hover:opacity-90 transition-opacity"
        onClick={onPreview}
      >
        {isImage ? (
          <EnhancedAuthenticatedImage
            src={processedUrl}
            alt={file.originalName}
            className="w-full h-full object-cover"
            retryCount={2}
            timeout={8000}
            fallback={
              <div className="w-full h-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <span className="text-gray-500 dark:text-gray-400">图片加载失败</span>
              </div>
            }
          />
        ) : (
          <div className="w-full h-full bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-2">
              <span className="text-red-600 dark:text-red-400 font-semibold text-sm">{isPDF ? 'PDF' : 'FILE'}</span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">点击预览</span>
          </div>
        )}
      </div>

      {/* 文件信息 */}
      <div className="p-3 h-12 flex items-center">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate" title={file.originalName}>
            {file.originalName}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)}</p>
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
  size = 'medium',
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
        format: 'jpeg',
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
      className={`${getSizeClass()} bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${className || ''}`}
      onClick={onClick}
      title={file.originalName}
    >
      {isImage ? (
        <EnhancedAuthenticatedImage
          src={processedUrl}
          alt={file.originalName}
          className="w-full h-full object-cover"
          retryCount={2}
          timeout={6000}
          fallback={
            <div className="w-full h-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">IMG</span>
            </div>
          }
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{isPDF ? 'PDF' : 'FILE'}</span>
        </div>
      )}
    </div>
  );
}
