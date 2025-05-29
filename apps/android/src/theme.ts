import { MD3LightTheme, configureFonts } from 'react-native-paper';

/**
 * 字体配置
 */
const fontConfig = {
  default: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300' as const,
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100' as const,
    },
  },
};

/**
 * 应用主题配置
 * 基于Material Design 3规范
 */
export const theme = {
  ...MD3LightTheme,
  fonts: configureFonts({ config: fontConfig }),
  colors: {
    ...MD3LightTheme.colors,
    // 主色调 - 蓝色系
    primary: '#2563eb',
    onPrimary: '#ffffff',
    primaryContainer: '#dbeafe',
    onPrimaryContainer: '#1e3a8a',
    
    // 次要色调
    secondary: '#64748b',
    onSecondary: '#ffffff',
    secondaryContainer: '#f1f5f9',
    onSecondaryContainer: '#334155',
    
    // 第三色调
    tertiary: '#7c3aed',
    onTertiary: '#ffffff',
    tertiaryContainer: '#ede9fe',
    onTertiaryContainer: '#5b21b6',
    
    // 错误色调
    error: '#dc2626',
    onError: '#ffffff',
    errorContainer: '#fecaca',
    onErrorContainer: '#991b1b',
    
    // 背景色调
    background: '#f8fafc',
    onBackground: '#0f172a',
    surface: '#ffffff',
    onSurface: '#0f172a',
    surfaceVariant: '#f1f5f9',
    onSurfaceVariant: '#64748b',
    
    // 轮廓色调
    outline: '#cbd5e1',
    outlineVariant: '#e2e8f0',
    
    // 其他色调
    shadow: '#000000',
    scrim: '#000000',
    inverseSurface: '#1e293b',
    inverseOnSurface: '#f1f5f9',
    inversePrimary: '#60a5fa',
    
    // 自定义色调
    success: '#16a34a',
    warning: '#d97706',
    info: '#0ea5e9',
  },
  roundness: 12, // 圆角大小
};
