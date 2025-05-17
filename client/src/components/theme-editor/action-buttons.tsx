'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useThemeEditorStore } from '@/store/theme-editor-store';
import { themeService } from '@/lib/api/theme-service';
import { Loader2 } from 'lucide-react';

/**
 * 操作按钮组件
 */
export function ActionButtons() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  const {
    mode,
    currentTheme,
    resetTheme,
    setSaveStatus
  } = useThemeEditorStore();

  // 重置主题
  const handleReset = () => {
    resetTheme();
  };

  // 保存主题
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveStatus('saving');

      if (mode === 'create') {
        await themeService.createTheme(currentTheme);
      } else if (currentTheme.id) {
        await themeService.updateTheme(currentTheme.id, currentTheme);
      }

      setSaveStatus('success');
      setTimeout(() => {
        router.push('/settings/theme');
      }, 1000);
    } catch (error) {
      console.error('保存主题失败:', error);
      setSaveStatus('error', '保存失败，请重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 保存并应用主题
  const handleSaveAndApply = async () => {
    try {
      setIsApplying(true);
      setSaveStatus('saving');

      let themeId = currentTheme.id;

      if (mode === 'create') {
        const newTheme = await themeService.createTheme(currentTheme);
        themeId = newTheme.id;
      } else if (themeId) {
        await themeService.updateTheme(themeId, currentTheme);
      }

      if (themeId) {
        await themeService.applyTheme(themeId);
      }

      setSaveStatus('success');
      setTimeout(() => {
        router.push('/settings/theme');
      }, 1000);
    } catch (error) {
      console.error('保存并应用主题失败:', error);
      setSaveStatus('error', '保存失败，请重试');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="bottom-actions">
      <button
        onClick={handleReset}
        disabled={isSaving || isApplying}
        className="reset-button"
      >
        重置
      </button>

      <button
        onClick={handleSave}
        disabled={isSaving || isApplying}
        className="save-button"
      >
        {isSaving ? (
          <>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
            保存中...
          </>
        ) : (
          '保存'
        )}
      </button>

      <button
        onClick={handleSaveAndApply}
        disabled={isSaving || isApplying}
        className="save-apply-button"
      >
        {isApplying ? (
          <>
            <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>
            应用中...
          </>
        ) : (
          '保存并应用'
        )}
      </button>
    </div>
  );
}
