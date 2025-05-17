'use client';

import { useThemeEditorStore } from '@/store/theme-editor-store';
import { PreviewComponents } from './preview-components';
import { PreviewPage } from './preview-page';
import { Moon, Sun } from 'lucide-react';

/**
 * 实时预览组件
 */
export function LivePreview() {
  const {
    previewMode,
    togglePreviewMode,
    previewThemeMode,
    togglePreviewThemeMode
  } = useThemeEditorStore();

  return (
    <div>
      <div className="section-title">实时预览</div>

      <div className="preview-section">
        <div className="preview-tabs">
          <button
            className={`preview-tab ${previewMode === 'components' ? 'active' : ''}`}
            onClick={() => togglePreviewMode()}
          >
            组件预览
          </button>
          <button
            className={`preview-tab ${previewMode === 'page' ? 'active' : ''}`}
            onClick={() => togglePreviewMode()}
          >
            页面预览
          </button>
        </div>

        <div className="theme-mode-toggle">
          <span className="mode-label">
            {previewThemeMode === 'dark' ? '暗色模式' : '亮色模式'}
          </span>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={previewThemeMode === 'dark'}
              onChange={() => togglePreviewThemeMode()}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="component-preview" style={{ display: previewMode === 'components' ? 'block' : 'none' }}>
          <PreviewComponents />
        </div>

        <div className="page-preview" style={{ display: previewMode === 'page' ? 'block' : 'none' }}>
          <div className="page-preview-content">
            <PreviewPage />
          </div>
        </div>
      </div>
    </div>
  );
}
