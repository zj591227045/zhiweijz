'use client';

import React, { useState } from 'react';
import { TransactionAttachmentUpload } from '@/components/transactions/transaction-attachment-upload';

// 模拟附件数据
const mockAttachments = [
  {
    id: '1',
    fileId: 'file-1',
    attachmentType: 'RECEIPT' as const,
    description: '测试收据',
    file: {
      id: 'file-1',
      filename: 'receipt-001.jpg',
      originalName: '收据-001.jpg',
      mimeType: 'image/jpeg',
      size: 1024 * 500, // 500KB
      url: 'https://picsum.photos/400/600?random=1'
    }
  },
  {
    id: '2',
    fileId: 'file-2',
    attachmentType: 'INVOICE' as const,
    description: '测试发票',
    file: {
      id: 'file-2',
      filename: 'invoice-001.pdf',
      originalName: '发票-001.pdf',
      mimeType: 'application/pdf',
      size: 1024 * 1024 * 2, // 2MB
      url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    }
  },
  {
    id: '3',
    fileId: 'file-3',
    attachmentType: 'PHOTO' as const,
    description: '测试照片',
    file: {
      id: 'file-3',
      filename: 'photo-001.jpg',
      originalName: '照片-001.jpg',
      mimeType: 'image/jpeg',
      size: 1024 * 800, // 800KB
      url: 'https://picsum.photos/600/400?random=2'
    }
  },
  {
    id: '4',
    fileId: 'file-4',
    attachmentType: 'DOCUMENT' as const,
    description: '测试文档',
    file: {
      id: 'file-4',
      filename: 'document-001.jpg',
      originalName: '文档-001.jpg',
      mimeType: 'image/jpeg',
      size: 1024 * 300, // 300KB
      url: 'https://picsum.photos/500/700?random=3'
    }
  }
];

export default function TestAttachmentPage() {
  const [attachments, setAttachments] = useState(mockAttachments);

  const handleAttachmentsChange = (newAttachments: any[]) => {
    console.log('附件变化:', newAttachments);
    setAttachments(newAttachments);
  };

  const handleUploadSuccess = (newAttachments: any[]) => {
    console.log('上传成功:', newAttachments);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">附件上传组件测试</h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">增强版附件上传组件</h2>
              <p className="text-gray-600 mb-4">
                测试功能：更大的预览窗口、滑动切换、内置删除按钮、全屏预览、紧凑上传区域、格式说明提示等
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">新功能说明：</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 紧凑型上传区域，节省空间</li>
                  <li>• 点击"添加附件"旁的信息图标查看支持格式</li>
                  <li>• 更大的附件预览卡片（150-200px）</li>
                  <li>• 滑动浏览多个附件</li>
                  <li>• 右下角内置删除按钮</li>
                  <li>• 点击预览可全屏查看，支持缩放平移</li>
                </ul>
              </div>
              
              <TransactionAttachmentUpload
                transactionId="test-transaction"
                initialAttachments={attachments}
                onChange={handleAttachmentsChange}
                onUploadSuccess={handleUploadSuccess}
                maxFiles={10}
                className="border border-gray-200 rounded-lg p-4"
              />
            </div>

            <div className="mt-8">
              <h3 className="text-md font-semibold mb-2">当前附件状态</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(attachments, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
