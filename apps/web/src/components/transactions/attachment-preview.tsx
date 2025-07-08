'use client';

import React, { useState } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';
import { processAvatarUrl } from '@/lib/image-proxy';
import { Button } from '@/components/ui/button';

export interface AttachmentFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface AttachmentPreviewProps {
  /** 附件文件信息 */
  file: AttachmentFile;
  /** 是否显示预览模态框 */
  isOpen: boolean;
  /** 关闭预览回调 */
  onClose: () => void;
  /** 下载文件回调 */
  onDownload?: () => void;
  /** 自定义样式类名 */
  className?: string;
}

export function AttachmentPreview({
  file,
  isOpen,
  onClose,
  onDownload,
  className
}: AttachmentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const isImage = file.mimeType.startsWith('image/');
  const isPDF = file.mimeType === 'application/pdf';

  // 重置缩放和旋转
  const resetTransform = () => {
    setZoom(1);
    setRotation(0);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === '+' || e.key === '=') {
      setZoom(prev => Math.min(prev + 0.25, 3));
    } else if (e.key === '-') {
      setZoom(prev => Math.max(prev - 0.25, 0.25));
    } else if (e.key === 'r' || e.key === 'R') {
      setRotation(prev => (prev + 90) % 360);
    }
  };

  // 下载文件
  const handleDownload = () => {
    if (onDownload) {
      onDownload();
    } else if (file.url) {
      // 默认下载逻辑
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.originalName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4 ${className || ''}`}
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* 预览容器 */}
      <div 
        className="relative bg-white rounded-lg max-w-4xl max-h-full w-full h-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部工具栏 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-medium truncate">{file.originalName}</h3>
            <p className="text-sm text-gray-500">
              {formatFileSize(file.size)} • {file.mimeType}
            </p>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            {isImage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(prev => Math.max(prev - 0.25, 0.25))}
                  disabled={zoom <= 0.25}
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                
                <span className="text-sm text-gray-600 min-w-[3rem] text-center">
                  {Math.round(zoom * 100)}%
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setZoom(prev => Math.min(prev + 0.25, 3))}
                  disabled={zoom >= 3}
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetTransform}
                >
                  重置
                </Button>
              </>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-1" />
              下载
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 预览内容 */}
        <div className="flex-1 overflow-hidden flex items-center justify-center p-4">
          {isImage ? (
            <div className="max-w-full max-h-full overflow-auto">
              <AuthenticatedImage
                src={processAvatarUrl(file.url || '')}
                alt={file.originalName}
                className="max-w-none"
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  transition: 'transform 0.2s ease-in-out',
                }}
                fallback={
                  <div className="w-64 h-64 bg-gray-100 flex items-center justify-center rounded">
                    <span className="text-gray-500">图片加载失败</span>
                  </div>
                }
              />
            </div>
          ) : isPDF ? (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-600 font-bold text-lg">PDF</span>
                </div>
                <p className="text-gray-600 mb-4">PDF文件预览</p>
                <p className="text-sm text-gray-500 mb-6">
                  点击下载按钮下载文件，或在新窗口中打开查看
                </p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    下载文件
                  </Button>
                  {file.url && (
                    <Button 
                      variant="outline"
                      onClick={() => window.open(file.url, '_blank')}
                    >
                      新窗口打开
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-600 font-bold text-sm">FILE</span>
                </div>
                <p className="text-gray-600 mb-4">文件预览</p>
                <p className="text-sm text-gray-500 mb-6">
                  此文件类型不支持预览，请下载后查看
                </p>
                <Button onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  下载文件
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* 底部提示 */}
        {isImage && (
          <div className="p-2 bg-gray-50 text-center">
            <p className="text-xs text-gray-500">
              使用 +/- 键缩放，R 键旋转，ESC 键关闭
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
      className={`${getSizeClass()} bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ${className || ''}`}
      onClick={onClick}
      title={file.originalName}
    >
      {isImage ? (
        <AuthenticatedImage
          src={processAvatarUrl(file.url || '')}
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
