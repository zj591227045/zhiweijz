'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { TransactionType } from '@/types';
import { useCategoryStore } from '@/store/category-store';
import { useAccountBookStore } from '@/store/account-book-store';
import { toast } from 'sonner';
import { getIconClass } from '@/lib/utils';

// 可用的分类图标
const availableIcons = [
  'restaurant', 'shopping', 'daily', 'transport', 'sports', 'entertainment',
  'clothing', 'clinic', 'beauty', 'housing', 'communication', 'electronics',
  'social', 'travel', 'digital', 'car', 'medical', 'reading',
  'investment', 'education', 'office', 'repair', 'insurance', 'salary',
  'part-time', 'investment-income', 'bonus', 'commission', 'other'
];

// 预设颜色
const presetColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];

interface FormData {
  name: string;
  type: TransactionType;
  icon: string;
  color: string;
  isHidden: boolean;
}

interface EditCategoryFormProps {
  categoryId: string;
}

export default function EditCategoryForm({ categoryId }: EditCategoryFormProps) {
  const router = useRouter();
  
  const { categories, updateCategory, fetchCategories, getCategory } = useCategoryStore();
  const { currentAccountBook } = useAccountBookStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [category, setCategory] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    type: TransactionType.EXPENSE,
    icon: 'restaurant',
    color: '#FF6B6B',
    isHidden: false
  });

  // 初始化获取分类数据
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsInitialLoading(true);
        
        // 如果分类列表为空，先获取分类列表
        if (categories.length === 0) {
          await fetchCategories();
        }
        
        // 尝试从已有分类列表中查找
        let foundCategory = categories.find(cat => cat.id === categoryId);
        
        // 如果在分类列表中没找到，直接获取该分类
        if (!foundCategory && categoryId !== 'placeholder') {
          foundCategory = await getCategory(categoryId);
        }
        
        if (foundCategory) {
          setCategory(foundCategory);
          setFormData({
            name: foundCategory.name,
            type: foundCategory.type,
            icon: foundCategory.icon || 'restaurant',
            color: foundCategory.color || '#FF6B6B',
            isHidden: foundCategory.isHidden || false
          });
        }
      } catch (error) {
        console.error('初始化分类数据失败:', error);
        toast.error('加载分类信息失败');
      } finally {
        setIsInitialLoading(false);
      }
    };

    if (categoryId && categoryId !== 'placeholder') {
      initializeData();
    } else {
      setIsInitialLoading(false);
    }
  }, [categoryId, categories, fetchCategories, getCategory]);

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('请输入分类名称');
      return;
    }

    if (!currentAccountBook) {
      toast.error('请先选择账本');
      return;
    }

    setIsLoading(true);
    try {
      const success = await updateCategory(categoryId, {
        name: formData.name.trim(),
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        isHidden: formData.isHidden,
      });
      
      if (success) {
        toast.success('分类更新成功');
        router.push('/settings/categories');
      }
    } catch (error) {
      console.error('更新分类失败:', error);
      toast.error('更新分类失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <div>加载中...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!category && categoryId !== 'placeholder') {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardContent className="text-center py-8">
            <div className="mb-4">未找到该分类</div>
            <Button onClick={() => router.push('/settings/categories')}>
              返回分类列表
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 检查是否为默认分类
  const isDefaultCategory = category?.isDefault;

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <i className="fas fa-edit" />
            编辑分类
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 分类名称 */}
            <div className="space-y-2">
              <Label htmlFor="name">分类名称 *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="请输入分类名称"
                disabled={isDefaultCategory}
              />
              {isDefaultCategory && (
                <p className="text-sm text-gray-500">默认分类名称不可修改</p>
              )}
            </div>

            {/* 分类类型 */}
            <div className="space-y-2">
              <Label htmlFor="type">分类类型 *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
                disabled={isDefaultCategory}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TransactionType.EXPENSE}>支出</SelectItem>
                  <SelectItem value={TransactionType.INCOME}>收入</SelectItem>
                </SelectContent>
              </Select>
              {isDefaultCategory && (
                <p className="text-sm text-gray-500">默认分类类型不可修改</p>
              )}
            </div>

            {/* 分类图标 */}
            <div className="space-y-2">
              <Label>分类图标 *</Label>
              <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {availableIcons.map((iconName) => (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => handleInputChange('icon', iconName)}
                    className={`
                      p-3 rounded-lg border-2 transition-all duration-200 
                      flex flex-col items-center gap-1 hover:scale-105
                      ${formData.icon === iconName
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
            </div>

            {/* 分类颜色 */}
            <div className="space-y-2">
              <Label>分类颜色</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
                />
                <span className="text-sm text-gray-600">{formData.color}</span>
              </div>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {presetColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => handleInputChange('color', color)}
                    className={`
                      w-8 h-8 rounded-lg border-2 transition-all duration-200
                      ${formData.color === color ? 'border-gray-800 scale-110' : 'border-gray-300'}
                    `}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* 隐藏分类 */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>隐藏分类</Label>
                <p className="text-sm text-gray-500">
                  隐藏后该分类不会在添加记录时显示
                </p>
              </div>
              <Switch
                checked={formData.isHidden}
                onCheckedChange={(checked) => handleInputChange('isHidden', checked)}
              />
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
                      {formData.isHidden && ' (已隐藏)'}
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
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1"
              >
                <i className="fas fa-save mr-2" />
                {isLoading ? '保存中...' : '保存修改'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 