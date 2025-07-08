'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload, FileUploadItem } from '@/components/ui/file-upload';
import { AuthenticatedImage } from '@/components/ui/authenticated-image';
import { AttachmentPreview, AttachmentThumbnail } from './attachment-preview';
import { processAvatarUrl } from '@/lib/image-proxy';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

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
  /** 交易ID（编辑模式时提供） */
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
  'application/pdf'
].join(',');

export function TransactionAttachmentUpload({
  transactionId,
  initialAttachments = [],
  onChange,
  onUploadSuccess,
  disabled = false,
  maxFiles = 10,
  className
}: TransactionAttachmentUploadProps) {
  const [attachments, setAttachments] = useState<TransactionAttachment[]>(initialAttachments);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<TransactionAttachment | null>(null);

  // 当 initialAttachments 更新时，同步更新本地状态
  useEffect(() => {
    console.log('📎 TransactionAttachmentUpload: initialAttachments 更新:', initialAttachments);
    setAttachments(initialAttachments);
  }, [initialAttachments]);

  // 上传文件到服务器
  const uploadFiles = useCallback(async (files: File[]) => {
    if (!files.length) return;

    setUploading(true);
    const newAttachments: TransactionAttachment[] = [];

    try {
      for (const file of files) {
        console.log('📎 开始上传附件:', file.name, file.size, 'bytes');

        const formData = new FormData();
        formData.append('attachment', file);
        formData.append('attachmentType', getAttachmentType(file));
        formData.append('description', `${file.name}`);

        let response;
        if (transactionId) {
          // 编辑模式：直接上传到指定交易
          console.log('📎 编辑模式：上传到交易', transactionId);
          response = await apiClient.post(
            `/transactions/${transactionId}/attachments`,
            formData,
            {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            }
          );
        } else {
          // 新建模式：先上传到临时存储
          console.log('📎 新建模式：上传到临时存储');
          response = await apiClient.post('/file-storage/upload', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
        }

        console.log('📎 上传响应:', response);

        if (response.success) {
          const attachment: TransactionAttachment = transactionId
            ? response.data.attachment
            : {
                id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                fileId: response.data.fileId,
                attachmentType: getAttachmentType(file) as any,
                description: file.name,
                file: response.data
              };

          console.log('📎 创建附件对象:', attachment);
          newAttachments.push(attachment);
        } else {
          console.warn('📎 上传失败，响应不成功:', response);
        }
      }

      console.log('📎 上传完成，新附件数量:', newAttachments.length);

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
  }, [transactionId, attachments, onChange, onUploadSuccess]);

  // 根据文件类型确定附件类型
  const getAttachmentType = useCallback((file: File): string => {
    if (file.type.startsWith('image/')) {
      return 'PHOTO';
    } else if (file.type === 'application/pdf') {
      return 'RECEIPT';
    }
    return 'DOCUMENT';
  }, []);

  // 删除附件
  const handleRemoveAttachment = useCallback(async (attachmentId: string) => {
    try {
      const attachment = attachments.find(a => a.id === attachmentId);
      if (!attachment) return;

      // 如果是已保存的附件，调用删除API
      if (transactionId && !attachment.id.startsWith('temp-')) {
        // 使用 fileId 而不是 attachmentId 来删除
        const fileIdToDelete = attachment.fileId || attachment.id;
        console.log('📎 删除附件:', { attachmentId, fileId: fileIdToDelete, attachment });
        await apiClient.delete(`/transactions/attachments/${fileIdToDelete}`);
      }

      const updatedAttachments = attachments.filter(a => a.id !== attachmentId);
      setAttachments(updatedAttachments);
      onChange?.(updatedAttachments);

      toast.success('附件已删除');
    } catch (error) {
      console.error('删除附件失败:', error);
      toast.error('删除附件失败，请重试');
    }
  }, [transactionId, attachments, onChange]);

  // 处理文件上传组件的变化
  const handleFileUploadChange = useCallback((files: FileUploadItem[]) => {
    // 这里主要用于UI状态同步，实际上传在uploadFiles中处理
  }, []);

  // 处理文件删除
  const handleFileRemove = useCallback((fileId: string) => {
    // 从文件ID找到对应的附件并删除
    const attachment = attachments.find(a => a.file?.id === fileId || a.id === fileId);
    if (attachment) {
      handleRemoveAttachment(attachment.id);
    }
  }, [attachments, handleRemoveAttachment]);

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* 文件上传组件 */}
        <FileUpload
          accept={ALLOWED_TYPES}
          multiple={true}
          maxSize={10 * 1024 * 1024} // 10MB
          maxFiles={maxFiles}
          showCamera={true}
          onUpload={uploadFiles}
          onChange={handleFileUploadChange}
          onRemove={handleFileRemove}
          disabled={disabled || uploading}
          placeholder="上传收据、发票或其他相关文件"
        />

        {/* 已上传的附件列表 */}
        {attachments.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">已上传的附件 ({attachments.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {attachments.map((attachment) => (
                <AttachmentCard
                  key={attachment.id}
                  attachment={attachment}
                  onRemove={() => handleRemoveAttachment(attachment.id)}
                  onPreview={() => setPreviewFile(attachment)}
                  disabled={disabled}
                />
              ))}
            </div>
          </div>
        )}

        {/* 附件预览模态框 */}
        {previewFile && previewFile.file && (
          <AttachmentPreview
            file={previewFile.file}
            isOpen={!!previewFile}
            onClose={() => setPreviewFile(null)}
            onDownload={() => {
              if (previewFile.file?.url) {
                const link = document.createElement('a');
                link.href = previewFile.file.url;
                link.download = previewFile.file.originalName;
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}

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
    <div className="border rounded-lg p-3 bg-white">
      <div className="flex items-start gap-3">
        {/* 文件预览 */}
        <div
          className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onPreview}
          title="点击预览"
        >
          <AttachmentThumbnail
            file={file}
            onClick={onPreview}
            size="medium"
          />
        </div>

        {/* 文件信息 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{file.originalName}</p>
          <p className="text-xs text-gray-500">
            {formatFileSize(file.size)} • {getAttachmentTypeLabel(attachment.attachmentType)}
          </p>
          {attachment.description && attachment.description !== file.originalName && (
            <p className="text-xs text-gray-600 mt-1">{attachment.description}</p>
          )}
        </div>

        {/* 删除按钮 */}
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="text-gray-400 hover:text-red-500 disabled:opacity-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
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
    OTHER: '其他'
  };
  return labels[type] || '未知';
}
