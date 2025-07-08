'use client';

import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, Camera, FileText } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface QuickUploadModalProps {
  isOpen: boolean;
  transactionId: string;
  transactionName: string;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export function QuickUploadModal({
  isOpen,
  transactionId,
  transactionName,
  onClose,
  onUploadSuccess
}: QuickUploadModalProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

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
      onUploadSuccess();
      onClose();
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
    </div>
  );

  return createPortal(modalContent, document.body);
}
