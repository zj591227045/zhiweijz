'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
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

export default function TransactionDetailClient({ params }: TransactionDetailClientProps) {
  const router = useRouter();
  const { id: transactionId } = params;
  const { token, isAuthenticated } = useAuthStore();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 获取交易详情
  useEffect(() => {
    const fetchTransactionDetail = async () => {
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
        } else {
          const errorData = await response.json();
          setError(errorData.message || '获取交易详情失败');
        }
      } catch (error) {
        console.error('获取交易详情失败:', error);
        setError('获取交易详情失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (transactionId && isAuthenticated) {
      fetchTransactionDetail();
    }
  }, [transactionId, token, isAuthenticated]);

  // 处理删除交易
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
        toast.success('交易已删除');
        setIsDeleteDialogOpen(false);
        router.push('/transactions');
      } else {
        const error = await response.json();
        toast.error(error.message || '删除交易失败');
      }
    } catch (error) {
      console.error('删除交易失败:', error);
      toast.error('删除交易失败');
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
            返回交易列表
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!transaction) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
          <div>交易不存在</div>
          <Button onClick={() => router.push('/transactions')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回交易列表
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
            <h1 className="text-2xl font-bold">交易详情</h1>
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

        {/* 交易信息卡片 */}
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
                <label className="text-sm font-medium text-muted-foreground">交易日期</label>
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
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="删除交易"
        description={`确定要删除交易 "${transaction.description}" 吗？此操作无法撤销。`}
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDeleteTransaction}
        isLoading={isProcessing}
        variant="destructive"
      />
    </PageContainer>
  );
}
