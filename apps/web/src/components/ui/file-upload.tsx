'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Camera, FileText, Image, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export interface FileUploadItem {
  id: string;
  file: File;
  preview?: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface FileUploadProps {
  /** 允许的文件类型 */
  accept?: string;
  /** 是否允许多文件上传 */
  multiple?: boolean;
  /** 最大文件大小（字节） */
  maxSize?: number;
  /** 最大文件数量 */
  maxFiles?: number;
  /** 是否显示相机拍照选项 */
  showCamera?: boolean;
  /** 上传函数 */
  onUpload?: (files: File[]) => Promise<void>;
  /** 文件变化回调 */
  onChange?: (files: FileUploadItem[]) => void;
  /** 文件删除回调 */
  onRemove?: (fileId: string) => void;
  /** 自定义样式类名 */
  className?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = ['application/pdf'];
const ALL_ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES];

export function FileUpload({
  accept = ALL_ALLOWED_TYPES.join(','),
  multiple = true,
  maxSize = 10 * 1024 * 1024, // 10MB
  maxFiles = 10,
  showCamera = true,
  onUpload,
  onChange,
  onRemove,
  className,
  disabled = false,
  placeholder = '点击上传文件或拖拽文件到此处',
}: FileUploadProps) {
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 生成文件预览
  const generatePreview = useCallback((file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else {
        resolve(undefined);
      }
    });
  }, []);

  // 验证文件
  const validateFile = useCallback(
    (file: File): string | null => {
      // 检查文件类型
      const allowedTypes = accept.split(',').map((type) => type.trim());
      if (!allowedTypes.includes(file.type)) {
        return `不支持的文件类型: ${file.type}`;
      }

      // 检查文件大小
      if (file.size > maxSize) {
        return `文件大小超过限制: ${(file.size / 1024 / 1024).toFixed(2)}MB > ${(maxSize / 1024 / 1024).toFixed(2)}MB`;
      }

      return null;
    },
    [accept, maxSize],
  );

  // 处理文件添加
  const handleFilesAdd = useCallback(
    async (newFiles: File[]) => {
      if (disabled) return;

      // 检查文件数量限制
      if (files.length + newFiles.length > maxFiles) {
        alert(`最多只能上传 ${maxFiles} 个文件`);
        return;
      }

      const validFiles: FileUploadItem[] = [];

      for (const file of newFiles) {
        const error = validateFile(file);
        const preview = await generatePreview(file);

        const fileItem: FileUploadItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          preview,
          progress: 0,
          status: error ? 'error' : 'pending',
          error,
        };

        validFiles.push(fileItem);
      }

      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      onChange?.(updatedFiles);

      // 自动上传有效文件
      if (onUpload) {
        const filesToUpload = validFiles.filter((item) => !item.error).map((item) => item.file);
        if (filesToUpload.length > 0) {
          try {
            await onUpload(filesToUpload);
          } catch (error) {
            console.error('文件上传失败:', error);
          }
        }
      }
    },
    [files, maxFiles, validateFile, generatePreview, onChange, onUpload, disabled],
  );

  // 处理文件选择
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || []);
      if (selectedFiles.length > 0) {
        handleFilesAdd(selectedFiles);
      }
      // 清空input值，允许重复选择同一文件
      event.target.value = '';
    },
    [handleFilesAdd],
  );

  // 处理拖拽
  const handleDragOver = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!disabled) {
        setIsDragOver(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      if (disabled) return;

      const droppedFiles = Array.from(event.dataTransfer.files);
      if (droppedFiles.length > 0) {
        handleFilesAdd(droppedFiles);
      }
    },
    [handleFilesAdd, disabled],
  );

  // 删除文件
  const handleRemoveFile = useCallback(
    (fileId: string) => {
      const updatedFiles = files.filter((file) => file.id !== fileId);
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
      onRemove?.(fileId);
    },
    [files, onChange, onRemove],
  );

  // 打开文件选择器
  const openFileSelector = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // 打开相机
  const openCamera = useCallback(() => {
    if (!disabled && showCamera) {
      cameraInputRef.current?.click();
    }
  }, [disabled, showCamera]);

  // 获取文件图标
  const getFileIcon = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-4 h-4" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-4 h-4" />;
    }
    return <FileText className="w-4 h-4" />;
  }, []);

  // 格式化文件大小
  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* 上传区域 */}
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-gray-300',
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'cursor-pointer hover:border-primary hover:bg-primary/5',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFileSelector}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600 mb-2">{placeholder}</p>
        <div className="flex justify-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              openFileSelector();
            }}
            disabled={disabled}
          >
            选择文件
          </Button>
          {showCamera && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                openCamera();
              }}
              disabled={disabled}
            >
              <Camera className="w-4 h-4 mr-1" />
              拍照
            </Button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          支持{' '}
          {accept
            .split(',')
            .map((type) => type.split('/')[1]?.toUpperCase())
            .join(', ')}{' '}
          格式， 最大 {(maxSize / 1024 / 1024).toFixed(0)}MB
        </p>
      </div>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      {/* 隐藏的相机输入 */}
      {showCamera && (
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />
      )}

      {/* 文件列表 */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium">已选择的文件 ({files.length})</h4>
          <div className="space-y-2">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50"
              >
                {/* 文件预览/图标 */}
                <div className="flex-shrink-0">
                  {fileItem.preview ? (
                    <img
                      src={fileItem.preview}
                      alt={fileItem.file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                      {getFileIcon(fileItem.file)}
                    </div>
                  )}
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{fileItem.file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(fileItem.file.size)}</p>

                  {/* 进度条 */}
                  {fileItem.status === 'uploading' && (
                    <Progress value={fileItem.progress} className="mt-1" />
                  )}

                  {/* 错误信息 */}
                  {fileItem.error && (
                    <div className="flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <p className="text-xs text-red-500">{fileItem.error}</p>
                    </div>
                  )}
                </div>

                {/* 状态和操作 */}
                <div className="flex items-center gap-2">
                  {fileItem.status === 'success' && (
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                  )}
                  {fileItem.status === 'error' && (
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(fileItem.id)}
                    disabled={disabled}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
