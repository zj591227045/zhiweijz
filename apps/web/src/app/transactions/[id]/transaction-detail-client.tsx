'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { AttachmentThumbnail, EnhancedAttachmentPreview } from '@/components/transactions/attachment-preview';
// 简单的SVG图标组件
const ArrowLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const Edit = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const Trash2 = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const Paperclip = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
    />
  </svg>
);
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from 'sonner';
import { fetchApi } from '@/lib/api-client';
import Link from 'next/link';

interface TransactionDetailClientProps {
  params: {
    id: string;
  };
}

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
  attachmentType: string;
  description?: string;
  file?: AttachmentFile;
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  category: {
    id: string;
    name: string;
    color: string;
  };
  type: 'INCOME' | 'EXPENSE';
  date: string;
  createdAt: string;
  updatedAt: string;
}

// 格式化文件大小
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function TransactionDetailClient({ params }: TransactionDetailClientProps) {
  const router = useRouter();
  const { id: transactionId } = params;
  const { token, isAuthenticated } = useAuthStore();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [attachments, setAttachments] = useState<TransactionAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<AttachmentFile[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 获取记账详情
  useEffect(() => {
    const fetchTransactionDetail = async () => {
      // 如果是占位符，不执行数据获取
      if (transactionId === 'placeholder') {
        setError('这是一个静态导出的占位符页面。在实际应用中，请通过正确的路由访问记账详情页面。');
        setIsLoading(false);
        return;
      }

      if (!token) {
        setError('未提供认证令牌');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetchApi(`/api/transactions/${transactionId}`);

        if (response.ok) {
          const data = await response.json();
          setTransaction(data);

          // 获取附件信息
          try {
            const attachmentResponse = await fetchApi(`/api/transactions/${transactionId}/attachments`);
            if (attachmentResponse.ok) {
              const attachmentData = await attachmentResponse.json();
              if (attachmentData.success) {
                setAttachments(attachmentData.data || []);
              }
            }
          } catch (attachmentError) {
            console.error('获取附件信息失败:', attachmentError);
            // 附件获取失败不影响主要功能
          }
        } else {
          const errorData = await response.json();
          setError(errorData.message || '获取记账详情失败');
        }
      } catch (error) {
        console.error('获取记账详情失败:', error);
        setError('获取记账详情失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (transactionId && isAuthenticated) {
      fetchTransactionDetail();
    }
  }, [transactionId, token, isAuthenticated]);

  // 处理删除记账
  const handleDeleteTransaction = async () => {
    if (!token) {
      toast.error('未提供认证令牌');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetchApi(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('记账已删除');
        setIsDeleteDialogOpen(false);
        router.push('/transactions');
      } else {
        const error = await response.json();
        toast.error(error.message || '删除记账失败');
      }
    } catch (error) {
      console.error('删除记账失败:', error);
      toast.error('删除记账失败');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </PageContainer>
    );
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
          <div className="text-destructive">{error}</div>
          <Button onClick={() => router.push('/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回记账列表
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!transaction) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
          <div>记账不存在</div>
          <Button onClick={() => router.push('/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回记账列表
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/transactions')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold">记账详情</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/transactions/edit/${transaction.id}`}>
                <Edit className="mr-2 h-4 w-4" />
                编辑
              </Link>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              删除
            </Button>
          </div>
        </div>

        {/* 记账信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{transaction.description}</span>
              <Badge variant={transaction.type === 'INCOME' ? 'default' : 'destructive'}>
                {transaction.type === 'INCOME' ? '收入' : '支出'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">金额</label>
                <div
                  className={`text-2xl font-bold ${
                    transaction.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {transaction.type === 'INCOME' ? '+' : '-'}¥
                  {Math.abs(transaction.amount).toFixed(2)}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">分类</label>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: transaction.category.color }}
                  />
                  <span className="font-medium">{transaction.category.name}</span>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">记账日期</label>
                <div className="font-medium">
                  {new Date(transaction.date).toLocaleDateString('zh-CN')}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">创建时间</label>
                <div className="font-medium">
                  {new Date(transaction.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 附件预览区域 */}
        {attachments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Paperclip className="mr-2 h-5 w-5" />
                附件 ({attachments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {attachments.map((attachment) => (
                  attachment.file && (
                    <div key={attachment.id} className="space-y-2">
                      <AttachmentThumbnail
                        file={attachment.file}
                        onClick={() => {
                          // 获取所有附件文件
                          const allFiles = attachments
                            .map(att => att.file)
                            .filter(Boolean) as AttachmentFile[];

                          // 找到当前文件的索引
                          const currentIndex = allFiles.findIndex(file => file.id === attachment.file!.id);

                          setPreviewFiles(allFiles);
                          setPreviewIndex(Math.max(0, currentIndex));
                          setShowPreview(true);
                        }}
                        size="large"
                        className="w-full aspect-square"
                      />
                      <div className="text-xs text-center">
                        <p className="truncate font-medium" title={attachment.file.originalName}>
                          {attachment.file.originalName}
                        </p>
                        <p className="text-muted-foreground">
                          {formatFileSize(attachment.file.size)}
                        </p>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 简约版附件预览模态框 */}
      {showPreview && previewFiles.length > 0 && (
        <EnhancedAttachmentPreview
          files={previewFiles}
          currentIndex={previewIndex}
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setPreviewFiles([]);
            setPreviewIndex(0);
          }}
          onNavigate={setPreviewIndex}
          onDownload={async (file: AttachmentFile) => {
            try {
              // 使用fetch下载文件，携带认证信息
              const token = localStorage.getItem('auth-storage')
                ? JSON.parse(localStorage.getItem('auth-storage')!)?.state?.token
                : null;

              if (!token) {
                throw new Error('未找到认证令牌');
              }

              const apiBaseUrl = typeof window !== 'undefined' && localStorage.getItem('server-config-storage')
                ? JSON.parse(localStorage.getItem('server-config-storage')!)?.state?.config?.currentUrl || '/api'
                : '/api';

              const downloadUrl = `${apiBaseUrl}/file-storage/${file.id}/download`;

              const response = await fetch(downloadUrl, {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!response.ok) {
                throw new Error(`下载失败: ${response.status}`);
              }

              // 创建blob URL
              const blob = await response.blob();
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
          }}
        />
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="删除记账"
        description={`确定要删除记账 "${transaction.description}" 吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDeleteTransaction}
        isLoading={isProcessing}
        variant="destructive"
      />
    </PageContainer>
  );
}
