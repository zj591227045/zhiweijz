'use client';

import { useThemeEditorStore } from '@/store/theme-editor-store';

/**
 * 主题信息表单组件
 */
export function ThemeInfoForm() {
  const {
    currentTheme,
    baseThemes,
    updateThemeName,
    updateThemeDescription,
    updateBaseTheme
  } = useThemeEditorStore();

  return (
    <form className="theme-form">
      <div className="form-group">
        <label
          htmlFor="theme-name"
          className="form-label"
        >
          主题名称
        </label>
        <input
          id="theme-name"
          type="text"
          value={currentTheme.name}
          onChange={(e) => updateThemeName(e.target.value)}
          placeholder="输入主题名称"
          maxLength={30}
          className="form-input"
        />
        <div className="form-hint">最多30个字符</div>
      </div>

      <div className="form-group">
        <label
          htmlFor="base-theme"
          className="form-label"
        >
          基于主题
        </label>
        <select
          id="base-theme"
          value={currentTheme.baseTheme}
          onChange={(e) => updateBaseTheme(e.target.value)}
          className="form-select"
        >
          {baseThemes.map((theme) => (
            <option key={theme.id} value={theme.id}>
              {theme.name}
            </option>
          ))}
        </select>
        <div className="form-hint">选择一个基础主题作为起点</div>
      </div>

      <div className="form-group">
        <label
          htmlFor="theme-description"
          className="form-label"
        >
          主题描述
        </label>
        <textarea
          id="theme-description"
          value={currentTheme.description || ''}
          onChange={(e) => updateThemeDescription(e.target.value)}
          placeholder="输入主题描述（可选）"
          maxLength={100}
          rows={3}
          className="form-input"
        />
        <div className="form-hint">最多100个字符</div>
      </div>
    </form>
  );
}
