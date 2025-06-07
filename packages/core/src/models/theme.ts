/**
 * 主题相关类型定义
 */

// 主题类型（亮色/暗色）
export type ThemeMode = 'light' | 'dark';

// 主题颜色
export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'orange-light';

// 基础主题类型
export type BaseTheme = 'light' | 'dark' | 'blue' | 'green' | 'purple' | 'orange' | 'red';

// 颜色格式
export type ColorFormat = 'hex' | 'rgb' | 'hsl';

// 颜色变量组
export interface ColorGroup {
  name: string;
  label: string;
  variables: ColorVariable[];
  expanded?: boolean;
}

// 颜色变量
export interface ColorVariable {
  name: string;
  label: string;
  value: string;
  description?: string;
}

// 主题配置
export interface ThemeConfig {
  id?: string;
  name: string;
  description?: string;
  baseTheme: BaseTheme;
  colors: ThemeColors;
  createdAt?: string;
  updatedAt?: string;
}

// 主题颜色配置
export interface ThemeColors {
  primary: {
    default: string;
    hover: string;
    active: string;
  };
  background: {
    default: string;
    card: string;
    input: string;
  };
  text: {
    primary: string;
    secondary: string;
    muted: string;
  };
  border: string;
  error: string;
  success: string;
  warning: string;
}

// 预览模式
export type PreviewMode = 'components' | 'page';

// 预设颜色
export interface PresetColor {
  value: string;
  label?: string;
}

// 主题编辑器状态
export interface ThemeEditorState {
  // 编辑模式
  mode: 'create' | 'edit';
  
  // 主题数据
  originalTheme: ThemeConfig | null;
  currentTheme: ThemeConfig;
  
  // 基础主题列表
  baseThemes: { id: string; name: string }[];
  
  // 预览设置
  previewMode: PreviewMode;
  previewThemeMode: ThemeMode;
  
  // 颜色选择器状态
  colorPickerOpen: boolean;
  currentColorVariable: {
    group: string;
    name: string;
    value: string;
  } | null;
  colorFormat: ColorFormat;
  
  // 颜色组展开状态
  expandedGroups: Record<string, boolean>;
  
  // 保存状态
  hasUnsavedChanges: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  errorMessage: string | null;
  
  // 对话框状态
  unsavedChangesDialogOpen: boolean;
}

// 默认主题配置
export const defaultThemeConfig: ThemeConfig = {
  name: '新主题',
  baseTheme: 'light',
  colors: {
    primary: {
      default: '#3B82F6',
      hover: '#2563EB',
      active: '#1D4ED8',
    },
    background: {
      default: '#F9FAFB',
      card: '#FFFFFF',
      input: '#F3F4F6',
    },
    text: {
      primary: '#111827',
      secondary: '#4B5563',
      muted: '#9CA3AF',
    },
    border: '#E5E7EB',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
};

// 暗色主题配置
export const darkThemeConfig: ThemeConfig = {
  name: '暗色主题',
  baseTheme: 'dark',
  colors: {
    primary: {
      default: '#3B82F6',
      hover: '#2563EB',
      active: '#1D4ED8',
    },
    background: {
      default: '#111827',
      card: '#1F2937',
      input: '#374151',
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#D1D5DB',
      muted: '#9CA3AF',
    },
    border: '#374151',
    error: '#EF4444',
    success: '#10B981',
    warning: '#F59E0B',
  },
};

// 预设颜色列表
export const presetColors: PresetColor[] = [
  { value: '#EF4444' }, // 红色
  { value: '#F59E0B' }, // 橙色
  { value: '#10B981' }, // 绿色
  { value: '#3B82F6' }, // 蓝色
  { value: '#6366F1' }, // 靛蓝色
  { value: '#8B5CF6' }, // 紫色
  { value: '#EC4899' }, // 粉色
  { value: '#F43F5E' }, // 玫红色
  { value: '#FFFFFF' }, // 白色
  { value: '#A0A0A0' }, // 灰色
  { value: '#6B7280' }, // 深灰色
  { value: '#1F2937' }, // 近黑色
];
