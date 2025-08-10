'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FileUpload, FileUploadItem } from '@/components/ui/file-upload';
import { EnhancedAuthenticatedImage } from '@/components/ui/enhanced-authenticated-image';
import {
  AttachmentThumbnail,
  EnhancedAttachmentGrid,
  EnhancedAttachmentPreview,
} from './attachment-preview';
import { processAvatarUrl } from '@/lib/image-proxy';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload, Camera, Plus, Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export interface TransactionAttachment {
  id: string;
  fileId: string;
  attachmentType: 'RECEIPT' | 'INVOICE' | 'CONTRACT' | 'PHOTO' | 'DOCUMENT' | 'OTHER';
  description?: string;
  file?: {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    url?: string;
  };
}

export interface TransactionAttachmentUploadProps {
  /** 记账ID（编辑模式时提供） */
  transactionId?: string;
  /** 初始附件列表 */
  initialAttachments?: TransactionAttachment[];
  /** 附件变化回调 */
  onChange?: (attachments: TransactionAttachment[]) => void;
  /** 上传成功回调 */
  onUploadSuccess?: () => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 最大文件数量 */
  maxFiles?: number;
  /** 自定义样式类名 */
  className?: string;
}

// 支持的文件类型
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
].join(',');

// 紧凑型文件上传组件
interface CompactFileUploadProps {
  accept: string;
  multiple: boolean;
  maxSize: number;
  maxFiles: number;
  onUpload: (files: File[]) => Promise<void>;
  disabled: boolean;
  uploading: boolean;
}

function CompactFileUpload({
  accept,
  multiple,
  maxSize,
  maxFiles,
  onUpload,
  disabled,
  uploading,
}: CompactFileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (files.length > 0) {
        await onUpload(files);
      }
      // 清空input值，允许重复选择同一文件
      event.target.value = '';
    },
    [onUpload],
  );

  const openFileSelector = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const openCamera = () => {
    if (!disabled) {
      cameraInputRef.current?.click();
    }
  };

  return (
    <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50/50 dark:bg-gray-800/50 p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* 左侧图标和文字 */}
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 min-w-0">
          <Upload className="w-4 h-4 flex-shrink-0" />
          <span className="whitespace-nowrap">添加附件</span>
          <Tooltip
            content={
              <div className="text-xs">
                支持 JPEG, PNG, GIF, WEBP, PDF 格式
                <br />
                最大 {Math.round(maxSize / 1024 / 1024)}MB
              </div>
            }
            side="top"
          >
            <Button variant="ghost" size="sm" className="h-5 w-5 p-0 hover:bg-gray-200 dark:hover:bg-gray-700">
              <Info className="w-3 h-3 text-gray-400 dark:text-gray-500" />
            </Button>
          </Tooltip>
        </div>

        {/* 右侧按钮组 */}
        <div className="flex gap-2 flex-shrink-0 sm:ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openFileSelector}
            disabled={disabled || uploading}
            className="h-9 px-3"
          >
            <Plus className="w-4 h-4 mr-1" />
            选择文件
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCamera}
            disabled={disabled || uploading}
            className="h-9 px-3"
          >
            <Camera className="w-4 h-4 mr-1" />
            拍照
          </Button>
        </div>
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
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

export interface TransactionAttachmentUploadRef {
  executePendingDeletes: () => Promise<void>;
}

export const TransactionAttachmentUpload = React.forwardRef<
  TransactionAttachmentUploadRef,
  TransactionAttachmentUploadProps
>(
  (
    {
      transactionId,
      initialAttachments = [],
      onChange,
      onUploadSuccess,
      disabled = false,
      maxFiles = 10,
      className,
    },
    ref,
  ) => {
    const [attachments, setAttachments] = useState<TransactionAttachment[]>(initialAttachments);
    const [uploading, setUploading] = useState(false);
    const [previewFile, setPreviewFile] = useState<TransactionAttachment | null>(null);
    const [enhancedPreview, setEnhancedPreview] = useState<{
      isOpen: boolean;
      currentIndex: number;
    }>({ isOpen: false, currentIndex: 0 });

    // 确认删除对话框状态
    const [deleteConfirm, setDeleteConfirm] = useState<{
      isOpen: boolean;
      attachment: TransactionAttachment | null;
      loading: boolean;
    }>({ isOpen: false, attachment: null, loading: false });

    // 待删除的附件列表（只有在保存记账后才真正删除）
    const [pendingDeletes, setPendingDeletes] = useState<{ id: string; fileId: string }[]>([]);

    // 当 initialAttachments 更新时，同步更新本地状态
    useEffect(() => {
      console.log('📎 TransactionAttachmentUpload: initialAttachments 更新:', initialAttachments);
      setAttachments(initialAttachments);
    }, [initialAttachments]);

    // 上传文件到服务器
    const uploadFiles = useCallback(
      async (files: File[]) => {
        if (!files.length) return;

        setUploading(true);

        try {
          // 编辑模式：批量上传后刷新附件列表
          if (transactionId) {
            console.log('📎 编辑模式：批量上传附件到记账', transactionId);

            for (const file of files) {
              console.log('📎 开始上传附件:', file.name, file.size, 'bytes');

              const formData = new FormData();
              formData.append('attachment', file);
              formData.append('attachmentType', getAttachmentType(file));
              formData.append('description', `${file.name}`);

              const response = await apiClient.post(
                `/transactions/${transactionId}/attachments`,
                formData,
                {
                  headers: {
                    'Content-Type': 'multipart/form-data',
                  },
                },
              );

              if (!response.success) {
                console.warn('📎 上传失败，响应不成功:', response);
                throw new Error(`上传文件 ${file.name} 失败`);
              }
            }

            // 所有文件上传完成后，重新获取附件列表
            console.log('📎 编辑模式：所有文件上传完成，获取最新附件列表');
            const attachmentsResponse = await apiClient.get(
              `/transactions/${transactionId}/attachments`,
            );
            if (attachmentsResponse.success) {
              console.log('📎 获取到最新附件列表:', attachmentsResponse.data);
              setAttachments(attachmentsResponse.data || []);
              onChange?.(attachmentsResponse.data || []);
              toast.success(`成功上传 ${files.length} 个附件`);
              onUploadSuccess?.();
              return;
            } else {
              throw new Error('获取最新附件列表失败');
            }
          }

          // 新建模式：上传到临时存储
          console.log('📎 新建模式：上传到临时存储');
          const newAttachments: TransactionAttachment[] = [];

          for (const file of files) {
            console.log('📎 开始上传附件:', file.name, file.size, 'bytes');

            const formData = new FormData();
            formData.append('file', file);
            formData.append('bucket', 'temp-files');
            formData.append('category', 'attachments');
            formData.append('description', `${file.name}`);

            const response = await apiClient.post('/file-storage/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });

            console.log('📎 上传响应:', response);

            if (response.success) {
              const attachment: TransactionAttachment = {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                fileId: response.data.fileId,
                attachmentType: getAttachmentType(file) as any,
                description: file.name,
                file: response.data,
              };

              console.log('📎 创建附件对象:', attachment);
              newAttachments.push(attachment);
            } else {
              console.warn('📎 上传失败，响应不成功:', response);
            }
          }

          console.log('📎 新建模式上传完成，新附件数量:', newAttachments.length);

          const updatedAttachments = [...attachments, ...newAttachments];
          setAttachments(updatedAttachments);
          onChange?.(updatedAttachments);

          toast.success(`成功上传 ${newAttachments.length} 个附件`);

          // 调用上传成功回调
          if (newAttachments.length > 0) {
            onUploadSuccess?.();
          }
        } catch (error) {
          console.error('附件上传失败:', error);
          toast.error('附件上传失败，请重试');
        } finally {
          setUploading(false);
        }
      },
      [transactionId, attachments, onChange, onUploadSuccess],
    );

    // 根据文件类型确定附件类型
    const getAttachmentType = useCallback((file: File): string => {
      if (file.type.startsWith('image/')) {
        return 'PHOTO';
      } else if (file.type === 'application/pdf') {
        return 'RECEIPT';
      }
      return 'DOCUMENT';
    }, []);

    // 显示删除确认对话框
    const showDeleteConfirm = useCallback(
      (attachmentId: string) => {
        const attachment = attachments.find((a) => a.id === attachmentId);
        if (!attachment) return;

        setDeleteConfirm({
          isOpen: true,
          attachment,
          loading: false,
        });
      },
      [attachments],
    );

    // 确认删除附件
    const handleConfirmDelete = useCallback(async () => {
      const { attachment } = deleteConfirm;
      if (!attachment) return;

      setDeleteConfirm((prev) => ({ ...prev, loading: true }));

      try {
        // 如果是已保存的附件，标记为待删除，不立即删除
        if (transactionId && !attachment.id.startsWith('temp-')) {
          console.log('📎 标记附件为待删除:', attachment.id);
          const fileIdToDelete = attachment.fileId || attachment.id;
          setPendingDeletes((prev) => [...prev, { id: attachment.id, fileId: fileIdToDelete }]);
          toast.success('附件已标记删除，保存记账后生效');
        } else {
          // 临时附件直接删除
          console.log('📎 删除临时附件:', attachment.id);
          toast.success('附件已删除');
        }

        // 从UI中移除附件
        const updatedAttachments = attachments.filter((a) => a.id !== attachment.id);
        setAttachments(updatedAttachments);
        onChange?.(updatedAttachments);

        setDeleteConfirm({ isOpen: false, attachment: null, loading: false });
      } catch (error) {
        console.error('删除附件失败:', error);
        toast.error('删除附件失败，请重试');
        setDeleteConfirm((prev) => ({ ...prev, loading: false }));
      }
    }, [deleteConfirm, transactionId, attachments, onChange]);

    // 取消删除
    const handleCancelDelete = useCallback(() => {
      setDeleteConfirm({ isOpen: false, attachment: null, loading: false });
    }, []);

    // 执行真正的删除操作（在记账保存后调用）
    const executePendingDeletes = useCallback(async () => {
      if (pendingDeletes.length === 0) return;

      console.log('📎 执行待删除附件:', pendingDeletes);

      for (const deleteItem of pendingDeletes) {
        try {
          await apiClient.delete(`/transactions/attachments/${deleteItem.fileId}`);
          console.log('📎 附件删除成功:', deleteItem.fileId);
        } catch (error) {
          console.error('📎 删除附件失败:', deleteItem.id, error);
          // 继续删除其他附件，不中断流程
        }
      }

      // 清空待删除列表
      setPendingDeletes([]);
    }, [pendingDeletes]);

    // 暴露执行删除的函数给父组件
    React.useImperativeHandle(
      ref,
      () => ({
        executePendingDeletes,
      }),
      [executePendingDeletes],
    );

    // 处理文件上传组件的变化
    const handleFileUploadChange = useCallback((files: FileUploadItem[]) => {
      // 这里主要用于UI状态同步，实际上传在uploadFiles中处理
    }, []);

    // 处理文件删除
    const handleFileRemove = useCallback(
      (fileId: string) => {
        // 从文件ID找到对应的附件并删除
        const attachment = attachments.find((a) => a.file?.id === fileId || a.id === fileId);
        if (attachment) {
          showDeleteConfirm(attachment.id);
        }
      },
      [attachments, showDeleteConfirm],
    );

    // 处理增强版预览
    const handleEnhancedPreview = useCallback((file: any, index: number) => {
      setEnhancedPreview({ isOpen: true, currentIndex: index });
    }, []);

    const handleEnhancedPreviewClose = useCallback(() => {
      setEnhancedPreview({ isOpen: false, currentIndex: 0 });
    }, []);

    const handleEnhancedPreviewNavigate = useCallback((index: number) => {
      setEnhancedPreview((prev) => ({ ...prev, currentIndex: index }));
    }, []);

    const handleEnhancedPreviewDownload = useCallback((file: any) => {
      if (file.url) {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.originalName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }, []);

    // 获取有效的附件文件列表
    const validAttachmentFiles = attachments
      .filter((attachment) => attachment.file)
      .map((attachment) => {
        // 确保每个文件都有唯一的id
        return {
          ...attachment.file!,
          // 如果文件没有id，使用附件id作为备用
          id: attachment.file!.id || attachment.id,
        };
      });

    return (
      <div className={className}>
        <div className="space-y-4">
          {/* 紧凑型文件上传区域 */}
          <CompactFileUpload
            accept={ALLOWED_TYPES}
            multiple={true}
            maxSize={10 * 1024 * 1024} // 10MB
            maxFiles={maxFiles}
            onUpload={uploadFiles}
            disabled={disabled || uploading}
            uploading={uploading}
          />

          {/* 已上传的附件列表 - 增强版 */}
          {validAttachmentFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">已上传的附件 ({validAttachmentFiles.length})</h4>
              <EnhancedAttachmentGrid
                files={validAttachmentFiles}
                onPreview={handleEnhancedPreview}
                onRemove={(file) => {
                  const attachment = attachments.find((a) => a.file?.id === file.id);
                  if (attachment) {
                    showDeleteConfirm(attachment.id);
                  }
                }}
                disabled={disabled}
              />
            </div>
          )}

          {/* 增强版附件预览模态框 */}
          <EnhancedAttachmentPreview
            files={validAttachmentFiles}
            currentIndex={enhancedPreview.currentIndex}
            isOpen={enhancedPreview.isOpen}
            onClose={handleEnhancedPreviewClose}
            onNavigate={handleEnhancedPreviewNavigate}
            onDownload={handleEnhancedPreviewDownload}
            onDelete={(file, index) => {
              // 根据文件ID找到对应的附件并删除
              const attachmentToDelete = attachments.find((att) => att.file?.id === file.id);
              if (attachmentToDelete) {
                handleRemoveAttachment(attachmentToDelete.id);
              }
              handleEnhancedPreviewClose();
            }}
          />

          {/* 删除确认对话框 */}
          <ConfirmDialog
            isOpen={deleteConfirm.isOpen}
            title="删除附件"
            message={
              transactionId &&
              deleteConfirm.attachment &&
              !deleteConfirm.attachment.id.startsWith('temp-')
                ? '确定要删除此附件吗？此操作将在保存记账后生效。'
                : '确定要删除此附件吗？'
            }
            confirmText="删除"
            cancelText="取消"
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
            isDangerous={true}
            loading={deleteConfirm.loading}
          />
        </div>
      </div>
    );
  },
);

TransactionAttachmentUpload.displayName = 'TransactionAttachmentUpload';

// 附件卡片组件
interface AttachmentCardProps {
  attachment: TransactionAttachment;
  onRemove: () => void;
  onPreview?: () => void;
  disabled?: boolean;
}

function AttachmentCard({ attachment, onRemove, onPreview, disabled }: AttachmentCardProps) {
  const file = attachment.file;
  if (!file) return null;

  const isImage = file.mimeType.startsWith('image/');
  const isPDF = file.mimeType === 'application/pdf';

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800">
      <div className="flex items-start gap-3">
        {/* 文件预览 */}
        <div
          className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onPreview}
          title="点击预览"
        >
          <AttachmentThumbnail file={file} onClick={onPreview} size="medium" />
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{file.originalName}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {formatFileSize(file.size)} • {getAttachmentTypeLabel(attachment.attachmentType)}
          </p>
          {attachment.description && attachment.description !== file.originalName && (
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">{attachment.description}</p>
          )}
        </div>

        {/* 删除按钮 */}
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
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

// 获取附件类型标签
function getAttachmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    RECEIPT: '收据',
    INVOICE: '发票',
    CONTRACT: '合同',
    PHOTO: '照片',
    DOCUMENT: '文档',
    OTHER: '其他',
  };
  return labels[type] || '未知';
}
