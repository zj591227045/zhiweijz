import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  ThemeEditorState, 
  ThemeConfig, 
  defaultThemeConfig, 
  ColorFormat,
  PreviewMode,
  ThemeMode,
  ColorGroup
} from '@/types/theme';

// 颜色变量分组
const colorGroups: ColorGroup[] = [
  {
    name: 'primary',
    label: '主要颜色',
    expanded: true,
    variables: [
      { name: 'default', label: 'primary', value: '' },
      { name: 'hover', label: 'primary-hover', value: '' },
      { name: 'active', label: 'primary-active', value: '' },
    ],
  },
  {
    name: 'background',
    label: '背景颜色',
    expanded: true,
    variables: [
      { name: 'default', label: 'background', value: '' },
      { name: 'card', label: 'card-background', value: '' },
      { name: 'input', label: 'input-background', value: '' },
    ],
  },
  {
    name: 'text',
    label: '文本颜色',
    expanded: true,
    variables: [
      { name: 'primary', label: 'text-primary', value: '' },
      { name: 'secondary', label: 'text-secondary', value: '' },
      { name: 'muted', label: 'text-muted', value: '' },
    ],
  },
  {
    name: 'status',
    label: '状态颜色',
    expanded: true,
    variables: [
      { name: 'error', label: 'error', value: '' },
      { name: 'success', label: 'success', value: '' },
      { name: 'warning', label: 'warning', value: '' },
    ],
  },
  {
    name: 'border',
    label: '边框颜色',
    expanded: true,
    variables: [
      { name: 'border', label: 'border', value: '' },
    ],
  },
];

// 初始化状态
const initialState: ThemeEditorState = {
  mode: 'create',
  originalTheme: null,
  currentTheme: { ...defaultThemeConfig },
  baseThemes: [
    { id: 'light', name: '默认亮色' },
    { id: 'dark', name: '默认暗色' },
    { id: 'blue', name: '蓝色主题' },
    { id: 'green', name: '绿色主题' },
    { id: 'purple', name: '紫色主题' },
  ],
  previewMode: 'components',
  previewThemeMode: 'light',
  colorPickerOpen: false,
  currentColorVariable: null,
  colorFormat: 'hex',
  expandedGroups: colorGroups.reduce((acc, group) => {
    acc[group.name] = group.expanded || false;
    return acc;
  }, {} as Record<string, boolean>),
  hasUnsavedChanges: false,
  saveStatus: 'idle',
  errorMessage: null,
  unsavedChangesDialogOpen: false,
};

// 创建store
export const useThemeEditorStore = create<ThemeEditorState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // 设置编辑模式
        setMode: (mode: 'create' | 'edit') => set({ mode }),

        // 设置当前主题
        setCurrentTheme: (theme: ThemeConfig) => set({ 
          currentTheme: theme,
          hasUnsavedChanges: true 
        }),

        // 设置原始主题
        setOriginalTheme: (theme: ThemeConfig | null) => set({ 
          originalTheme: theme,
          currentTheme: theme ? { ...theme } : { ...defaultThemeConfig },
          hasUnsavedChanges: false
        }),

        // 设置基础主题列表
        setBaseThemes: (themes: { id: string; name: string }[]) => set({ 
          baseThemes: themes 
        }),

        // 更新主题名称
        updateThemeName: (name: string) => set(state => ({
          currentTheme: { ...state.currentTheme, name },
          hasUnsavedChanges: true
        })),

        // 更新主题描述
        updateThemeDescription: (description: string) => set(state => ({
          currentTheme: { ...state.currentTheme, description },
          hasUnsavedChanges: true
        })),

        // 更新基础主题
        updateBaseTheme: (baseTheme: string) => set(state => ({
          currentTheme: { ...state.currentTheme, baseTheme },
          hasUnsavedChanges: true
        })),

        // 更新颜色变量
        updateColorVariable: (group: string, name: string, value: string) => set(state => {
          const newTheme = { ...state.currentTheme };
          
          if (group === 'status') {
            // 状态颜色组是扁平的
            (newTheme.colors as any)[name] = value;
          } else if (group === 'border') {
            // 边框颜色是扁平的
            newTheme.colors.border = value;
          } else {
            // 嵌套的颜色组
            (newTheme.colors as any)[group][name] = value;
          }
          
          return {
            currentTheme: newTheme,
            hasUnsavedChanges: true
          };
        }),

        // 切换预览模式
        togglePreviewMode: () => set(state => ({
          previewMode: state.previewMode === 'components' ? 'page' : 'components'
        })),

        // 切换预览主题模式
        togglePreviewThemeMode: () => set(state => ({
          previewThemeMode: state.previewThemeMode === 'light' ? 'dark' : 'light'
        })),

        // 打开颜色选择器
        openColorPicker: (group: string, name: string, value: string) => set({
          colorPickerOpen: true,
          currentColorVariable: { group, name, value }
        }),

        // 关闭颜色选择器
        closeColorPicker: () => set({
          colorPickerOpen: false,
          currentColorVariable: null
        }),

        // 应用选择的颜色
        applySelectedColor: (color: string) => {
          const { currentColorVariable } = get();
          if (currentColorVariable) {
            const { group, name } = currentColorVariable;
            get().updateColorVariable(group, name, color);
            set({
              colorPickerOpen: false,
              currentColorVariable: null
            });
          }
        },

        // 切换颜色格式
        toggleColorFormat: () => set(state => {
          const formats: ColorFormat[] = ['hex', 'rgb', 'hsl'];
          const currentIndex = formats.indexOf(state.colorFormat);
          const nextIndex = (currentIndex + 1) % formats.length;
          return { colorFormat: formats[nextIndex] };
        }),

        // 切换颜色组展开状态
        toggleGroupExpanded: (groupName: string) => set(state => ({
          expandedGroups: {
            ...state.expandedGroups,
            [groupName]: !state.expandedGroups[groupName]
          }
        })),

        // 设置保存状态
        setSaveStatus: (status: 'idle' | 'saving' | 'success' | 'error', errorMessage?: string) => set({
          saveStatus: status,
          errorMessage: errorMessage || null,
          hasUnsavedChanges: status !== 'success'
        }),

        // 重置主题
        resetTheme: () => set(state => ({
          currentTheme: state.originalTheme ? { ...state.originalTheme } : { ...defaultThemeConfig },
          hasUnsavedChanges: false
        })),

        // 打开未保存更改对话框
        openUnsavedChangesDialog: () => set({ unsavedChangesDialogOpen: true }),

        // 关闭未保存更改对话框
        closeUnsavedChangesDialog: () => set({ unsavedChangesDialogOpen: false }),

        // 重置状态
        resetState: () => set({ ...initialState }),
      }),
      {
        name: 'theme-editor-storage',
        partialize: (state) => ({
          currentTheme: state.currentTheme,
          hasUnsavedChanges: state.hasUnsavedChanges,
        }),
      }
    )
  )
);

// 获取颜色变量分组
export const getColorGroups = (theme: ThemeConfig): ColorGroup[] => {
  return colorGroups.map(group => {
    return {
      ...group,
      variables: group.variables.map(variable => {
        let value = '';
        
        if (group.name === 'status') {
          // 状态颜色组是扁平的
          value = (theme.colors as any)[variable.name];
        } else if (group.name === 'border') {
          // 边框颜色是扁平的
          value = theme.colors.border;
        } else {
          // 嵌套的颜色组
          value = (theme.colors as any)[group.name][variable.name];
        }
        
        return {
          ...variable,
          value
        };
      })
    };
  });
};
