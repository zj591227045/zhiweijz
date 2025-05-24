'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// 主题信息表单验证模式
const themeInfoSchema = z.object({
  name: z.string().min(1, '主题名称不能为空').max(30, '主题名称最多30个字符'),
  description: z.string().max(100, '主题描述最多100个字符').optional(),
  baseTheme: z.string().min(1, '请选择基础主题'),
});

export type ThemeInfoFormValues = z.infer<typeof themeInfoSchema>;

interface ThemeInfoFormProps {
  initialData?: Partial<ThemeInfoFormValues>;
  onSubmit: (data: ThemeInfoFormValues) => void;
  baseThemes?: Array<{ id: string; name: string }>;
}

const defaultBaseThemes = [
  { id: 'light', name: '浅色主题' },
  { id: 'dark', name: '深色主题' },
  { id: 'auto', name: '跟随系统' },
];

export function ThemeInfoForm({ 
  initialData, 
  onSubmit, 
  baseThemes = defaultBaseThemes 
}: ThemeInfoFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ThemeInfoFormValues>({
    resolver: zodResolver(themeInfoSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      baseTheme: initialData?.baseTheme || 'light',
    },
  });

  const watchedName = watch('name');
  const watchedDescription = watch('description');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="theme-form">
      <div className="form-group">
        <label htmlFor="theme-name" className="form-label">
          主题名称
        </label>
        <input
          id="theme-name"
          type="text"
          {...register('name')}
          placeholder="输入主题名称"
          className={`form-input ${errors.name ? 'border-red-500' : ''}`}
        />
        <div className="flex justify-between items-center mt-1">
          {errors.name ? (
            <div className="text-red-500 text-xs">{errors.name.message}</div>
          ) : (
            <div className="form-hint">最多30个字符</div>
          )}
          <div className="character-counter">
            {watchedName?.length || 0}/30
          </div>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="base-theme" className="form-label">
          基于主题
        </label>
        <select
          id="base-theme"
          {...register('baseTheme')}
          className={`form-input ${errors.baseTheme ? 'border-red-500' : ''}`}
        >
          {baseThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
        {errors.baseTheme ? (
          <div className="text-red-500 text-xs mt-1">{errors.baseTheme.message}</div>
        ) : (
          <div className="form-hint">选择一个基础主题作为起点</div>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="theme-description" className="form-label">
          主题描述
        </label>
        <textarea
          id="theme-description"
          {...register('description')}
          placeholder="输入主题描述（可选）"
          rows={3}
          className={`form-textarea ${errors.description ? 'border-red-500' : ''}`}
        />
        <div className="flex justify-between items-center mt-1">
          {errors.description ? (
            <div className="text-red-500 text-xs">{errors.description.message}</div>
          ) : (
            <div className="form-hint">最多100个字符</div>
          )}
          <div className="character-counter">
            {watchedDescription?.length || 0}/100
          </div>
        </div>
      </div>
    </form>
  );
}
