'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, Camera, FileText, Eye, Download, Trash2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { AttachmentThumbnail, EnhancedAttachmentPreview } from './attachment-preview';

interface AttachmentFile {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url?: string;
}

interface TransactionAttachment {
  id: string;
  fileId: string;
  attachmentType: string;
  description?: string;
  file?: AttachmentFile;
}

interface QuickUploadModalProps {
  isOpen: boolean;
  transactionId: string;
  transactionName: string;
  onClose: () => void;
  onUploadSuccess: () => void;
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function QuickUploadModal({
  isOpen,
  transactionId,
  transactionName,
  onClose,
  onUploadSuccess
}: QuickUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [existingAttachments, setExistingAttachments] = useState<TransactionAttachment[]>([]);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<AttachmentFile[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // 获取已有附件
  useEffect(() => {
    if (isOpen && transactionId) {
      fetchExistingAttachments();
    }
  }, [isOpen, transactionId]);

  const fetchExistingAttachments = async () => {
    setLoadingAttachments(true);
    try {
      const response = await apiClient.get(`/transactions/${transactionId}/attachments`);
      setExistingAttachments(response.data || []);
    } catch (error) {
      console.error('获取附件失败:', error);
      setExistingAttachments([]);
    } finally {
      setLoadingAttachments(false);
    }
  };

  if (!isOpen) return null;

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('attachment', file);

        return apiClient.post(`/transactions/${transactionId}/attachments`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      });

      await Promise.all(uploadPromises);

      toast.success(`成功上传 ${files.length} 个文件`);

      // 刷新附件列表
      await fetchExistingAttachments();

      onUploadSuccess();
    } catch (error) {
      console.error('文件上传失败:', error);
      toast.error('文件上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleCameraSelect = () => {
    cameraInputRef.current?.click();
  };

  // 删除附件
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('确定要删除这个附件吗？')) {
      return;
    }

    try {
      await apiClient.delete(`/transactions/attachments/${attachmentId}`);
      toast.success('附件删除成功');

      // 刷新附件列表
      await fetchExistingAttachments();
      onUploadSuccess();
    } catch (error) {
      console.error('删除附件失败:', error);
      toast.error('删除附件失败，请重试');
    }
  };

  // 预览附件
  const handlePreviewAttachment = (attachment: TransactionAttachment) => {
    if (attachment.file) {
      // 获取所有附件文件
      const allFiles = existingAttachments
        .map(att => att.file)
        .filter(Boolean) as AttachmentFile[];

      // 找到当前文件的索引
      const currentIndex = allFiles.findIndex(file => file.id === attachment.file!.id);

      setPreviewFiles(allFiles);
      setPreviewIndex(Math.max(0, currentIndex));
      setShowPreview(true);
    }
  };

  // 处理预览关闭
  const handlePreviewClose = () => {
    setShowPreview(false);
    setPreviewFiles([]);
    setPreviewIndex(0);
  };

  // 处理预览导航
  const handlePreviewNavigate = (index: number) => {
    setPreviewIndex(index);
  };

  // 处理预览下载
  const handlePreviewDownload = async (file: AttachmentFile) => {
    try {
      // 使用apiClient下载文件，自动携带认证信息
      const response = await apiClient.get(`/file-storage/${file.id}/download`, {
        responseType: 'blob'
      });

      // 创建blob URL
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);

      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载文件失败:', error);
      // 回退到直接URL下载
      if (file.url) {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.originalName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  // 下载附件
  const handleDownloadAttachment = async (attachment: TransactionAttachment) => {
    if (!attachment.file) return;

    try {
      // 使用apiClient下载文件，自动携带认证信息
      const response = await apiClient.get(`/file-storage/${attachment.file.id}/download`, {
        responseType: 'blob'
      });

      // 创建blob URL
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);

      // 创建下载链接
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 清理blob URL
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下载文件失败:', error);
      // 回退到直接URL下载
      if (attachment.file?.url) {
        const link = document.createElement('a');
        link.href = attachment.file.url;
        link.download = attachment.file.originalName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  const modalContent = (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            快速上传附件
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={uploading}
          >
            <X size={20} />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              为交易 <span className="font-medium">"{transactionName}"</span> 上传附件
            </p>
          </div>

          {/* 已有附件列表 */}
          {loadingAttachments ? (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-sm text-gray-600">加载附件中...</span>
              </div>
            </div>
          ) : existingAttachments.length > 0 ? (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                已有附件 ({existingAttachments.length})
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <div className="space-y-2">
                  {existingAttachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center justify-between bg-white rounded p-2 shadow-sm">
                      <div className="flex items-center flex-1 min-w-0">
                        <div className="w-8 h-8 mr-2 flex-shrink-0">
                          {attachment.file?.mimeType?.startsWith('image/') ? (
                            <AttachmentThumbnail
                              file={attachment.file}
                              size="small"
                              className="w-full h-full rounded"
                            />
                          ) : (
                            <div className="w-full h-full bg-blue-100 rounded flex items-center justify-center">
                              <FileText size={16} className="text-blue-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">
                            {attachment.file?.originalName || '未知文件'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {attachment.file?.size ? formatFileSize(attachment.file.size) : '大小未知'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1 ml-2">
                        <button
                          onClick={() => handlePreviewAttachment(attachment)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="预览"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => handleDownloadAttachment(attachment)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="下载"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteAttachment(attachment.id)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {/* 拖拽上传区域 */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragOver
                ? 'border-blue-400 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-sm text-gray-600 mb-4">
              拖拽文件到此处，或点击下方按钮选择文件
            </p>

            {/* 操作按钮 */}
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleFileSelect}
                disabled={uploading}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FileText size={16} className="mr-2" />
                选择文件
              </button>
              
              <button
                onClick={handleCameraSelect}
                disabled={uploading}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera size={16} className="mr-2" />
                拍照
              </button>
            </div>

            {uploading && (
              <div className="mt-4">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">上传中...</span>
                </div>
              </div>
            )}
          </div>

          {/* 支持格式说明 */}
          <div className="mt-4 text-xs text-gray-500">
            支持格式：JPG、PNG、GIF、WebP、PDF
          </div>
        </div>

        {/* 隐藏的文件输入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,application/pdf"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
        
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* 简约版附件预览模态框 */}
      {showPreview && previewFiles.length > 0 && (
        <EnhancedAttachmentPreview
          files={previewFiles}
          currentIndex={previewIndex}
          isOpen={showPreview}
          onClose={handlePreviewClose}
          onNavigate={handlePreviewNavigate}
          onDownload={handlePreviewDownload}
        />
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}
