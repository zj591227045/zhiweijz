'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageContainer } from '@/components/layout/page-container';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// 使用FontAwesome图标，不需要导入
import { TransactionType } from '@/types';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { toast } from 'sonner';
import { getIconClass } from '@/lib/utils';

// 可用的分类图标
const availableIcons = [
  'restaurant',
  'shopping',
  'daily',
  'transport',
  'sports',
  'entertainment',
  'communication',
  'clothing',
  'beauty',
  'home',
  'child',
  'elder',
  'social',
  'travel',
  'digital',
  'car',
  'medical',
  'repayment',
  'insurance',
  'education',
  'office',
  'repair',
  'interest',
  'salary',
  'part-time',
  'investment',
  'bonus',
  'commission',
  'other',
];

// 分离使用 useSearchParams 的组件
function NewCategoryForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createCategory, isLoading } = useCategoryStore();
  const { currentAccountBook } = useAccountBookStore();

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    type: (searchParams.get('type') as TransactionType) || TransactionType.EXPENSE,
    icon: 'other',
    color: '#3B82F6',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // 验证表单
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '分类名称不能为空';
    } else if (formData.name.trim().length > 20) {
      newErrors.name = '分类名称不能超过20个字符';
    }

    if (!formData.type) {
      newErrors.type = '请选择分类类型';
    }

    if (!formData.icon) {
      newErrors.icon = '请选择分类图标';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (!currentAccountBook?.id) {
        toast.error('请先选择账本');
        return;
      }

      const success = await createCategory({
        name: formData.name.trim(),
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        accountBookId: currentAccountBook.id,
      });

      if (success) {
        toast.success('分类创建成功');
        router.push('/settings/categories');
      }
    } catch (error) {
      console.error('创建分类失败:', error);
      toast.error('创建分类失败');
    }
  };

  // 处理输入变化
  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // 清除对应字段的错误
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <PageContainer title="添加分类" showBack onBack={() => router.push('/settings/categories')}>
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <i className="fas fa-palette" />
              创建新分类
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 分类名称 */}
              <div className="space-y-2">
                <Label htmlFor="name">分类名称 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="请输入分类名称"
                  maxLength={20}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              {/* 分类类型 */}
              <div className="space-y-2">
                <Label htmlFor="type">分类类型 *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => handleInputChange('type', value)}
                >
                  <SelectTrigger className={errors.type ? 'border-red-500' : ''}>
                    <SelectValue placeholder="请选择分类类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TransactionType.EXPENSE}>支出</SelectItem>
                    <SelectItem value={TransactionType.INCOME}>收入</SelectItem>
                  </SelectContent>
                </Select>
                {errors.type && <p className="text-sm text-red-500">{errors.type}</p>}
              </div>

              {/* 分类图标 */}
              <div className="space-y-2">
                <Label htmlFor="icon">分类图标 *</Label>
                <div className="grid grid-cols-6 gap-3">
                  {availableIcons.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => handleInputChange('icon', iconName)}
                      className={`
                        p-3 rounded-lg border-2 transition-all duration-200
                        flex flex-col items-center gap-1
                        ${
                          formData.icon === iconName
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <i className={`${getIconClass(iconName)} text-xl`} />
                      <span className="text-xs text-gray-600 truncate w-full text-center">
                        {iconName}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.icon && <p className="text-sm text-red-500">{errors.icon}</p>}
              </div>

              {/* 分类颜色 */}
              <div className="space-y-2">
                <Label htmlFor="color">分类颜色</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* 预览 */}
              <div className="space-y-2">
                <Label>预览</Label>
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: formData.color + '20', color: formData.color }}
                    >
                      <i className={`${getIconClass(formData.icon)} text-xl`} />
                    </div>
                    <div>
                      <div className="font-medium">{formData.name || '分类名称'}</div>
                      <div className="text-sm text-gray-500">
                        {formData.type === TransactionType.EXPENSE ? '支出' : '收入'}分类
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/settings/categories')}
                  className="flex-1"
                >
                  <i className="fas fa-arrow-left mr-2" />
                  取消
                </Button>
                <Button type="submit" disabled={isLoading} className="flex-1">
                  <i className="fas fa-save mr-2" />
                  {isLoading ? '创建中...' : '创建分类'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}

// 主页面组件，用 Suspense 包装
export default function NewCategoryPage() {
  return (
    <Suspense
      fallback={
        <PageContainer title="添加分类" showBack>
          <div className="max-w-2xl mx-auto p-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <i className="fas fa-palette" />
                  创建新分类
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </div>
                  <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                    <div className="grid grid-cols-6 gap-3">
                      {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded-lg"></div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </PageContainer>
      }
    >
      <NewCategoryForm />
    </Suspense>
  );
}
