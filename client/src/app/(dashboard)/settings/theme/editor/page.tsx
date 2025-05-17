'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { PageContainer } from '@/components/layout/page-container';
import { ThemeInfoForm } from '@/components/theme-editor/theme-info-form';
import { ColorPalette } from '@/components/theme-editor/color-palette';
import { LivePreview } from '@/components/theme-editor/live-preview';
import { ActionButtons } from '@/components/theme-editor/action-buttons';
import { UnsavedChangesDialog } from '@/components/theme-editor/unsaved-changes-dialog';
import { useThemeEditorStore } from '@/store/theme-editor-store';
import { themeService } from '@/lib/api/theme-service';

import './theme-editor.css';

/**
 * 主题编辑器页面
 */
export default function ThemeEditorPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const themeId = searchParams.get('id');

  const {
    mode,
    setMode,
    setOriginalTheme,
    setBaseThemes,
    hasUnsavedChanges,
    openUnsavedChangesDialog
  } = useThemeEditorStore();

  // 获取基础主题列表
  const { data: baseThemes } = useQuery({
    queryKey: ['baseThemes'],
    queryFn: () => themeService.getBaseThemes(),
    staleTime: Infinity,
  });

  // 获取主题详情
  const { data: themeData, isLoading } = useQuery({
    queryKey: ['theme', themeId],
    queryFn: () => themeId ? themeService.getThemeById(themeId) : null,
    enabled: !!themeId,
    staleTime: Infinity,
  });

  // 初始化编辑器状态
  useEffect(() => {
    if (baseThemes) {
      setBaseThemes(baseThemes);
    }
  }, [baseThemes, setBaseThemes]);

  // 设置编辑模式和主题数据
  useEffect(() => {
    if (themeId) {
      setMode('edit');
      if (themeData) {
        setOriginalTheme(themeData);
      }
    } else {
      setMode('create');
      setOriginalTheme(null);
    }
  }, [themeId, themeData, setMode, setOriginalTheme]);

  // 处理返回按钮点击
  const handleBackClick = () => {
    if (hasUnsavedChanges) {
      openUnsavedChangesDialog();
    } else {
      router.push('/settings/theme');
    }
  };

  return (
    <PageContainer title="主题编辑器" showBackButton={true} onBackClick={handleBackClick}>
      <div className="main-content">
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '160px' }}>
            <div style={{ color: 'var(--text-secondary)' }}>加载中...</div>
          </div>
        ) : (
          <>
            <ThemeInfoForm />
            <ColorPalette />
            <LivePreview />
          </>
        )}
      </div>
      <ActionButtons />
      <UnsavedChangesDialog />
    </PageContainer>
  );
}
