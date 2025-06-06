'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { fetchApi } from '@/lib/api-client';

interface TransactionEditClientProps {
  params: {
    id: string;
  };
}

interface Category {
  id: string;
  name: string;
  color: string;
  type: 'INCOME' | 'EXPENSE';
}

interface Transaction {
  id: string;
  amount: number;
  description: string;
  categoryId: string;
  type: 'INCOME' | 'EXPENSE';
  date: string;
}

export default function TransactionEditClient({ params }: TransactionEditClientProps) {
  const router = useRouter();
  const { id: transactionId } = params;
  const { token, isAuthenticated } = useAuthStore();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    categoryId: '',
    type: 'EXPENSE' as 'INCOME' | 'EXPENSE',
    date: '',
  });

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  // 获取交易详情和分类列表
  useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        setError('未提供认证令牌');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 并行获取交易详情和分类列表
        const [transactionResponse, categoriesResponse] = await Promise.all([
          fetchApi(`/api/transactions/${transactionId}`),
          fetchApi('/api/categories'),
        ]);

        if (transactionResponse.ok && categoriesResponse.ok) {
          const transactionData = await transactionResponse.json();
          const categoriesData = await categoriesResponse.json();

          setTransaction(transactionData);
          setCategories(categoriesData.categories || []);

          // 设置表单数据
          setFormData({
            amount: Math.abs(transactionData.amount).toString(),
            description: transactionData.description,
            categoryId: transactionData.categoryId,
            type: transactionData.type,
            date: transactionData.date.split('T')[0], // 提取日期部分
          });
        } else {
          setError('获取数据失败');
        }
      } catch (error) {
        console.error('获取数据失败:', error);
        setError('获取数据失败');
      } finally {
        setIsLoading(false);
      }
    };

    if (transactionId && isAuthenticated) {
      fetchData();
    }
  }, [transactionId, token, isAuthenticated]);

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error('未提供认证令牌');
      return;
    }

    if (!formData.amount || !formData.description || !formData.categoryId || !formData.date) {
      toast.error('请填写所有必填字段');
      return;
    }

    setIsSaving(true);

    try {
      const amount = parseFloat(formData.amount);
      const finalAmount = formData.type === 'EXPENSE' ? -Math.abs(amount) : Math.abs(amount);

      const response = await fetchApi(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        body: JSON.stringify({
          amount: finalAmount,
          description: formData.description,
          categoryId: formData.categoryId,
          date: formData.date,
        }),
      });

      if (response.ok) {
        toast.success('交易更新成功');
        router.push(`/transactions/${transactionId}`);
      } else {
        const error = await response.json();
        toast.error(error.message || '更新交易失败');
      }
    } catch (error) {
      console.error('更新交易失败:', error);
      toast.error('更新交易失败');
    } finally {
      setIsSaving(false);
    }
  };

  // 获取过滤后的分类
  const filteredCategories = categories.filter((category) => category.type === formData.type);

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
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/transactions/${transactionId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold">编辑交易</h1>
        </div>

        {/* 编辑表单 */}
        <Card>
          <CardHeader>
            <CardTitle>交易信息</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 交易类型 */}
              <div className="space-y-2">
                <Label htmlFor="type">类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'INCOME' | 'EXPENSE') => {
                    setFormData({ ...formData, type: value, categoryId: '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCOME">收入</SelectItem>
                    <SelectItem value="EXPENSE">支出</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 金额 */}
              <div className="space-y-2">
                <Label htmlFor="amount">金额</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>

              {/* 描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">描述</Label>
                <Textarea
                  id="description"
                  placeholder="请输入交易描述"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              {/* 分类 */}
              <div className="space-y-2">
                <Label htmlFor="category">分类</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredCategories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <span>{category.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 日期 */}
              <div className="space-y-2">
                <Label htmlFor="date">日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>

              {/* 提交按钮 */}
              <div className="flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/transactions/${transactionId}`)}
                >
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
