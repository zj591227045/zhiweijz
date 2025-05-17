'use client';

import { useThemeEditorStore, getColorGroups } from '@/store/theme-editor-store';
import { ColorGroup } from './color-group';
import { ColorPicker } from './color-picker';

/**
 * 颜色面板组件
 */
export function ColorPalette() {
  const {
    currentTheme,
    expandedGroups,
    toggleGroupExpanded,
    colorPickerOpen,
    currentColorVariable,
    openColorPicker,
    closeColorPicker,
    applySelectedColor
  } = useThemeEditorStore();

  // 获取颜色组
  const colorGroups = getColorGroups(currentTheme);

  // 处理选择颜色变量
  const handleSelectVariable = (group: string, name: string, value: string) => {
    openColorPicker(group, name, value);
  };

  return (
    <div className="color-groups">
      <div className="section-title">颜色变量</div>

      <div>
        {colorGroups.map((group) => (
          <ColorGroup
            key={group.name}
            group={group}
            expanded={expandedGroups[group.name] || false}
            onToggle={() => toggleGroupExpanded(group.name)}
            onSelectVariable={handleSelectVariable}
          />
        ))}
      </div>

      {colorPickerOpen && currentColorVariable && (
        <ColorPicker
          title={`选择 ${currentColorVariable.group} 颜色`}
          color={currentColorVariable.value}
          onChange={applySelectedColor}
          onClose={closeColorPicker}
        />
      )}
    </div>
  );
}
