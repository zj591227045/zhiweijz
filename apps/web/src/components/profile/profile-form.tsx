'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';

// 表单验证模式
const profileFormSchema = z.object({
  username: z.string().min(2, '用户名至少需要2个字符').max(20, '用户名最多20个字符'),
  bio: z.string().max(200, '个人简介最多200个字符').optional(),
  birthDate: z.string().optional(),
});

export type ProfileFormValues = z.infer<typeof profileFormSchema>;

interface ProfileFormProps {
  id?: string;
  profile?: {
    username: string;
    bio?: string;
    birthDate?: string;
    email: string;
    createdAt: string;
  };
  onSubmit: (data: ProfileFormValues) => void;
  isSubmitting?: boolean;
}

export function ProfileForm({
  id = 'profile-form',
  profile,
  onSubmit,
  isSubmitting = false,
}: ProfileFormProps) {
  // 将 ISO 日期格式转换为 HTML date input 需要的格式 (YYYY-MM-DD)
  const formatDateForInput = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return dayjs(dateString).format('YYYY-MM-DD');
    } catch (error) {
      console.error('日期格式转换失败:', error);
      return '';
    }
  };

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      username: profile?.username || '',
      bio: profile?.bio || '',
      birthDate: formatDateForInput(profile?.birthDate),
    },
  });

  const watchedUsername = watch('username');
  const watchedBio = watch('bio');

  // 当 profile 数据更新时，重置表单值
  useEffect(() => {
    if (profile) {
      reset({
        username: profile.username || '',
        bio: profile.bio || '',
        birthDate: formatDateForInput(profile.birthDate),
      });
    }
  }, [profile, reset]);

  // 格式化日期用于显示
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return dayjs(dateString).format('YYYY年M月D日');
  };

  return (
    <form id={id} onSubmit={handleSubmit(onSubmit)} className="profile-form">
      <div className="form-group">
        <label className="form-label" htmlFor="username">
          用户名
        </label>
        <input
          type="text"
          id="username"
          className={`form-input ${errors.username ? 'border-red-500' : ''}`}
          {...register('username')}
          maxLength={20}
        />
        <div className="flex justify-between items-center mt-1">
          {errors.username ? (
            <div className="text-red-500 text-xs">{errors.username.message}</div>
          ) : (
            <div className="w-0"></div>
          )}
          <div className="character-counter">
            <span>{watchedUsername?.length || 0}</span>/20
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="bio">
          个人简介
        </label>
        <textarea
          id="bio"
          className={`form-textarea ${errors.bio ? 'border-red-500' : ''}`}
          {...register('bio')}
          maxLength={200}
          placeholder="介绍一下自己..."
        ></textarea>
        <div className="flex justify-between items-center mt-1">
          {errors.bio ? (
            <div className="text-red-500 text-xs">{errors.bio.message}</div>
          ) : (
            <div className="w-0"></div>
          )}
          <div className="character-counter">
            <span>{watchedBio?.length || 0}</span>/200
          </div>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="birthDate">
          出生日期
        </label>
        <input type="date" id="birthDate" className="date-picker" {...register('birthDate')} />
      </div>

      <div className="form-group">
        <label className="readonly-label">
          <span className="form-label">邮箱</span>
          <span className="readonly-badge">不可修改</span>
        </label>
        <div className="readonly-field">{profile?.email}</div>
      </div>

      <div className="form-group">
        <label className="form-label">注册日期</label>
        <div className="readonly-field">{formatDate(profile?.createdAt)}</div>
      </div>
    </form>
  );
}
