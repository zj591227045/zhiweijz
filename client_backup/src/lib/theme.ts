// 主题系统
export type Theme = 'default' | 'dark' | 'green' | 'purple' | string;

// 内置主题配置
export const builtInThemes: Record<string, Record<string, string>> = {
  default: {
    // 主色调
    '--primary': '59, 130, 246', // 蓝色
    '--primary-foreground': '255, 255, 255',
    '--secondary': '16, 185, 129', // 绿色
    '--secondary-foreground': '255, 255, 255',
    
    // 功能色
    '--success': '34, 197, 94',
    '--success-foreground': '255, 255, 255',
    '--warning': '245, 158, 11',
    '--warning-foreground': '255, 255, 255',
    '--error': '239, 68, 68',
    '--error-foreground': '255, 255, 255',
    '--info': '59, 130, 246',
    '--info-foreground': '255, 255, 255',
    
    // 中性色
    '--background': '249, 250, 251',
    '--foreground': '31, 41, 55',
    '--card': '255, 255, 255',
    '--card-foreground': '31, 41, 55',
    '--muted': '243, 244, 246',
    '--muted-foreground': '107, 114, 128',
    '--border': '229, 231, 235',
    
    // 交互状态
    '--ring': '59, 130, 246',
    '--focus': '59, 130, 246',
    '--hover': '59, 130, 246',
  },
  
  dark: {
    // 中性色
    '--background': '17, 24, 39',
    '--foreground': '243, 244, 246',
    '--card': '31, 41, 55',
    '--card-foreground': '243, 244, 246',
    '--muted': '55, 65, 81',
    '--muted-foreground': '156, 163, 175',
    '--border': '55, 65, 81',
  },
  
  green: {
    '--primary': '16, 185, 129',
    '--primary-foreground': '255, 255, 255',
    '--secondary': '59, 130, 246',
    '--ring': '16, 185, 129',
    '--focus': '16, 185, 129',
    '--hover': '16, 185, 129',
  },
  
  purple: {
    '--primary': '139, 92, 246',
    '--primary-foreground': '255, 255, 255',
    '--secondary': '249, 115, 22',
    '--ring': '139, 92, 246',
    '--focus': '139, 92, 246',
    '--hover': '139, 92, 246',
  }
};

// 获取当前主题
export const getTheme = (): Theme => {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem('theme') as Theme || 'default';
};

// 应用主题
export const applyTheme = (theme: Theme): void => {
  if (typeof window === 'undefined') return;
  
  // 设置文档的data-theme属性
  document.documentElement.setAttribute('data-theme', theme);
  
  // 保存主题到本地存储
  localStorage.setItem('theme', theme);
  
  // 应用主题变量
  const themeColors = getThemeColors(theme);
  Object.entries(themeColors).forEach(([property, value]) => {
    document.documentElement.style.setProperty(property, value);
  });
};

// 获取主题颜色
export const getThemeColors = (theme: Theme): Record<string, string> => {
  // 如果是内置主题
  if (theme in builtInThemes) {
    return builtInThemes[theme];
  }
  
  // 如果是自定义主题，从本地存储获取
  try {
    const customThemes = JSON.parse(localStorage.getItem('customThemes') || '{}');
    if (theme in customThemes) {
      return customThemes[theme];
    }
  } catch (error) {
    console.error('获取自定义主题失败:', error);
  }
  
  // 默认返回默认主题
  return builtInThemes.default;
};

// 获取所有自定义主题
export const getCustomThemes = (): Record<string, Record<string, string>> => {
  if (typeof window === 'undefined') return {};
  
  try {
    return JSON.parse(localStorage.getItem('customThemes') || '{}');
  } catch (error) {
    console.error('获取自定义主题列表失败:', error);
    return {};
  }
};

// 保存自定义主题
export const saveCustomTheme = (name: string, colors: Record<string, string>): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const customThemes = getCustomThemes();
    customThemes[name] = colors;
    localStorage.setItem('customThemes', JSON.stringify(customThemes));
  } catch (error) {
    console.error('保存自定义主题失败:', error);
  }
};

// 删除自定义主题
export const deleteCustomTheme = (name: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const customThemes = getCustomThemes();
    delete customThemes[name];
    localStorage.setItem('customThemes', JSON.stringify(customThemes));
  } catch (error) {
    console.error('删除自定义主题失败:', error);
  }
};
