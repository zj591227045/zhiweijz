'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// 简单的SVG图标组件
const ArrowLeft = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const Save = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a1.994 1.994 0 01-1.414.586H7a4 4 0 01-4-4V7a4 4 0 014-4z"
    />
  </svg>
);
import { toast } from 'sonner';

interface BookEditClientProps {
  params: {
    id: string;
  };
}

interface Book {
  id: string;
  name: string;
  description?: string;
  currency: string;
  createdAt: string;
}

export default function BookEditClient({ params }: BookEditClientProps) {
  const router = useRouter();
  const { id: bookId } = params;
  const { token, isAuthenticated } = useAuthStore();

  const [book, setBook] = useState<Book | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    currency: 'CNY',
  });

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 获取账本详情
  useEffect(() => {
    const fetchBookDetail = async () => {
      if (!token) {
        setError('未提供认证令牌');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`/api/books/${bookId}`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBook(data);
          setFormData({
            name: data.name,
            description: data.description || '',
            currency: data.currency,
          });
        } else {
          const errorData = await response.json();
          setError(errorData.message || '获取账本详情失败');
        }
      } catch (error) {
        console.error('获取账本详情失败:', error);
        setError('获取账本详情失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (bookId && isAuthenticated) {
      fetchBookDetail();
    }
  }, [bookId, token, isAuthenticated]);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('未提供认证令牌');
      return;
    }

    if (!formData.name.trim()) {
      toast.error('请输入账本名称');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/books/${bookId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          currency: formData.currency,
        }),
      });

      if (response.ok) {
        toast.success('账本更新成功');
        router.push('/books');
      } else {
        const error = await response.json();
        toast.error(error.message || '更新账本失败');
      }
    } catch (error) {
      console.error('更新账本失败:', error);
      toast.error('更新账本失败');
    } finally {
      setIsSaving(false);
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
          <Button onClick={() => router.push('/books')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回账本列表
          </Button>
        </div>
      </PageContainer>
    );
  }

  if (!book) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
          <div>账本不存在</div>
          <Button onClick={() => router.push('/books')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回账本列表
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* 头部 */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={() => router.push('/books')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">编辑账本</h1>
        </div>

        {/* 编辑表单 */}
        <Card>
          <CardHeader>
            <CardTitle>账本信息</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 账本名称 */}
              <div className="space-y-2">
                <Label htmlFor="name">账本名称</Label>
                <Input
                  id="name"
                  placeholder="请输入账本名称"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Textarea
                  id="description"
                  placeholder="请输入账本描述"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* 货币 */}
              <div className="space-y-2">
                <Label htmlFor="currency">货币</Label>
                <Input
                  id="currency"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  placeholder="CNY"
                  required
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => router.push('/books')}>
                  取消
                </Button>
                <Button type="submit" disabled={isSaving}>
                  <Save className="mr-2 h-4 w-4" />
                  {isSaving ? '保存中...' : '保存'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
