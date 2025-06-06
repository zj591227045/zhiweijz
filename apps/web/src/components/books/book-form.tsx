'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AccountBook } from '@/types';
import { BookPreview } from './book-preview';
import { AIServiceBinding } from './ai-service-binding';

// 表单验证模式
const bookFormSchema = z.object({
  name: z.string().min(1, '账本名称不能为空').max(30, '账本名称不能超过30个字符'),
  description: z.string().max(100, '账本描述不能超过100个字符').optional(),
  isDefault: z.boolean().optional().default(false),
});

export type BookFormValues = z.infer<typeof bookFormSchema>;

interface BookFormProps {
  id?: string;
  book?: AccountBook | null;
  isSubmitting?: boolean;
  onSubmit: (data: BookFormValues) => void;
}

export function BookForm({
  id = 'book-form',
  book,
  isSubmitting = false,
  onSubmit,
}: BookFormProps) {
  const [previewData, setPreviewData] = useState<{
    name: string;
    description: string;
    isDefault: boolean;
  }>({
    name: book?.name || '个人账本',
    description: book?.description || '日常开支记录',
    isDefault: book?.isDefault || false,
  });

  // 表单初始化
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BookFormValues>({
    resolver: zodResolver(bookFormSchema),
    defaultValues: {
      name: book?.name || '',
      description: book?.description || '',
      isDefault: book?.isDefault || false,
    },
  });

  // 监听表单值变化，更新预览
  const watchedName = watch('name');
  const watchedDescription = watch('description');
  const watchedIsDefault = watch('isDefault');

  // 当表单值变化时更新预览
  useEffect(() => {
    setPreviewData({
      name: watchedName || '账本名称',
      description: watchedDescription || '账本描述',
      isDefault: watchedIsDefault || false,
    });
  }, [watchedName, watchedDescription, watchedIsDefault]);

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)}>
      {/* 账本基本信息 */}
      <div className="form-group">
        <label className="form-label" htmlFor="book-name">
          账本名称
        </label>
        <input
          type="text"
          id="book-name"
          className="form-input"
          placeholder="输入账本名称"
          maxLength={30}
          {...register('name')}
        />
        {errors.name && <div className="form-hint text-red-500">{errors.name.message}</div>}
        {!errors.name && <div className="form-hint">最多30个字符</div>}
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="book-description">
          账本描述
        </label>
        <textarea
          id="book-description"
          className="form-textarea"
          placeholder="描述这个账本的用途（可选）"
          maxLength={100}
          {...register('description')}
        ></textarea>
        {errors.description && (
          <div className="form-hint text-red-500">{errors.description.message}</div>
        )}
        {!errors.description && <div className="form-hint">最多100个字符</div>}
      </div>

      <div className="form-group">
        <div className="toggle-container">
          <div className="toggle-label">设为默认账本</div>
          <label className="toggle-switch">
            <input type="checkbox" {...register('isDefault')} />
            <span className="toggle-slider"></span>
          </label>
        </div>
        <div className="form-hint">默认账本将在登录后自动选择</div>
      </div>

      {/* AI服务绑定 */}
      {book?.id && <AIServiceBinding accountBookId={book.id} />}

      {/* 预览 */}
      <BookPreview
        name={previewData.name}
        description={previewData.description}
        isDefault={previewData.isDefault}
      />

      {/* 底部按钮 - 在页面组件中实现 */}
    </form>
  );
}
