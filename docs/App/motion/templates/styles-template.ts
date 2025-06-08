// iOS 风格样式模板
// 统一的设计系统和样式规范

export const IOSStyles = {
  // 颜色系统
  colors: {
    primary: 'var(--primary-color)',
    background: 'var(--background-color)',
    backgroundSecondary: 'var(--background-secondary)',
    textPrimary: 'var(--text-color)',
    textSecondary: 'var(--text-secondary)',
    border: 'var(--border-color)',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  },

  // 圆角规范
  borderRadius: {
    small: '8px',
    medium: '12px',
    large: '20px',
    round: '50%'
  },

  // 间距系统
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
    xxl: '24px',
    xxxl: '32px'
  },

  // 字体层级
  typography: {
    largeTitle: {
      fontSize: '32px',
      fontWeight: '600',
      lineHeight: '1.2'
    },
    title: {
      fontSize: '20px',
      fontWeight: '600',
      lineHeight: '1.3'
    },
    headline: {
      fontSize: '18px',
      fontWeight: '600',
      lineHeight: '1.4'
    },
    body: {
      fontSize: '16px',
      fontWeight: '500',
      lineHeight: '1.5'
    },
    caption: {
      fontSize: '14px',
      fontWeight: '500',
      lineHeight: '1.4'
    },
    small: {
      fontSize: '12px',
      fontWeight: '500',
      lineHeight: '1.3'
    }
  },

  // 组件样式
  components: {
    // 全屏模态框
    fullScreenModal: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--background-color)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column' as const,
      overflow: 'hidden'
    },

    // 卡片容器
    card: {
      backgroundColor: 'var(--background-color)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '16px'
    },

    // 输入框
    input: {
      width: '100%',
      border: 'none',
      outline: 'none',
      backgroundColor: 'transparent',
      fontSize: '16px',
      color: 'var(--text-color)',
      padding: '0'
    },

    // 标签
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: 'var(--text-secondary)',
      marginBottom: '8px'
    },

    // 主要按钮
    primaryButton: {
      width: '100%',
      height: '48px',
      borderRadius: '12px',
      border: 'none',
      backgroundColor: 'var(--primary-color)',
      color: 'white',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    },

    // 次要按钮
    secondaryButton: {
      width: '100%',
      height: '48px',
      borderRadius: '12px',
      border: '1px solid var(--border-color)',
      backgroundColor: 'var(--background-color)',
      color: 'var(--text-color)',
      fontSize: '16px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },

    // 分段控制器
    segmentedControl: {
      display: 'flex',
      backgroundColor: 'var(--background-secondary)',
      borderRadius: '12px',
      padding: '4px'
    },

    segmentedControlButton: {
      flex: 1,
      height: '40px',
      borderRadius: '8px',
      border: 'none',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease'
    },

    // 网格布局
    grid2: {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '12px'
    },

    grid3: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '12px'
    },

    grid4: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '12px'
    },

    grid6: {
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '8px'
    },

    // 图标按钮
    iconButton: {
      width: '32px',
      height: '32px',
      borderRadius: '16px',
      border: 'none',
      backgroundColor: 'var(--background-secondary)',
      color: 'var(--text-secondary)',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },

    // 头像
    avatar: {
      width: '48px',
      height: '48px',
      borderRadius: '24px',
      backgroundColor: 'var(--primary-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '18px'
    },

    // 标签徽章
    badge: {
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500'
    },

    // 底部抽屉
    bottomDrawer: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'flex-end'
    },

    bottomDrawerContent: {
      width: '100%',
      backgroundColor: 'var(--background-color)',
      borderTopLeftRadius: '20px',
      borderTopRightRadius: '20px',
      maxHeight: '70vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column' as const
    },

    // 错误提示
    errorMessage: {
      backgroundColor: '#fee2e2',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      padding: '12px',
      color: '#dc2626',
      fontSize: '14px',
      textAlign: 'center' as const
    },

    // 成功提示
    successMessage: {
      backgroundColor: '#d1fae5',
      border: '1px solid #a7f3d0',
      borderRadius: '8px',
      padding: '12px',
      color: '#065f46',
      fontSize: '14px',
      textAlign: 'center' as const
    },

    // iOS 开关
    iosSwitch: {
      position: 'relative' as const,
      display: 'inline-block',
      width: '48px',
      height: '28px'
    },

    iosSwitchInput: {
      opacity: 0,
      width: 0,
      height: 0
    },

    iosSwitchSlider: {
      position: 'absolute' as const,
      cursor: 'pointer',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: '28px',
      transition: '0.4s'
    },

    iosSwitchHandle: {
      position: 'absolute' as const,
      height: '20px',
      width: '20px',
      bottom: '4px',
      backgroundColor: 'white',
      borderRadius: '50%',
      transition: '0.4s'
    }
  }
};

// 工具函数
export const createStyle = (baseStyle: any, overrides: any = {}) => ({
  ...baseStyle,
  ...overrides
});

export const getActiveStyle = (isActive: boolean, activeStyle: any, inactiveStyle: any) =>
  isActive ? activeStyle : inactiveStyle;
