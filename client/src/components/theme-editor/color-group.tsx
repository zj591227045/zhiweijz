'use client';

import { ColorGroup as ColorGroupType } from '@/types/theme';
import { ColorVariable } from './color-variable';

interface ColorGroupProps {
  group: ColorGroupType;
  expanded: boolean;
  onToggle: () => void;
  onSelectVariable: (group: string, name: string, value: string) => void;
}

/**
 * 颜色组组件
 */
export function ColorGroup({
  group,
  expanded,
  onToggle,
  onSelectVariable
}: ColorGroupProps) {
  return (
    <div className="color-group">
      <div
        className="group-header"
        onClick={onToggle}
      >
        <div className="group-title">{group.label}</div>
        <div className={`group-toggle ${expanded ? 'expanded' : ''}`}>
          <i className={`fas ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
        </div>
      </div>

      {expanded && (
        <div className="color-variables">
          {group.variables.map((variable) => (
            <ColorVariable
              key={variable.name}
              variable={variable}
              onSelect={(name, value) => onSelectVariable(group.name, name, value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
