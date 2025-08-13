'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 布局密度类型
export type LayoutDensity = 'comfortable' | 'compact';

// 布局配置接口
export interface LayoutConfig {
  density: LayoutDensity;
}

// 默认布局配置
export const defaultLayoutConfig: LayoutConfig = {
  density: 'comfortable',
};

interface LayoutState extends LayoutConfig {
  setDensity: (density: LayoutDensity) => void;
  toggleDensity: () => void;
}

// 应用布局配置到DOM
function applyLayoutConfig(config: LayoutConfig): void {
  if (typeof window === 'undefined') return;

  const html = document.documentElement;
  
  // 使用requestAnimationFrame批量处理DOM操作，减少重绘
  requestAnimationFrame(() => {
    // 移除所有布局密度类
    html.classList.remove('layout-comfortable', 'layout-compact');
    
    // 添加当前布局密度类
    html.classList.add(`layout-${config.density}`);
    
    // 设置CSS变量用于动态样式调整
    if (config.density === 'compact') {
      html.style.setProperty('--layout-density', 'compact');
      html.style.setProperty('--card-padding', '10px');
      html.style.setProperty('--card-margin', '4px');
      html.style.setProperty('--section-spacing', '6px');
      html.style.setProperty('--header-height', '48px');
      html.style.setProperty('--bottom-nav-height', '48px');
      html.style.setProperty('--font-size-title', '16px');
      html.style.setProperty('--font-size-body', '13px');
      html.style.setProperty('--font-size-small', '11px');
      html.style.setProperty('--icon-size', '24px');
      html.style.setProperty('--nav-icon-size', '18px');
      html.style.setProperty('--transaction-icon-size', '28px');
    } else {
      html.style.setProperty('--layout-density', 'comfortable');
      html.style.setProperty('--card-padding', '16px');
      html.style.setProperty('--card-margin', '8px');
      html.style.setProperty('--section-spacing', '14px');
      html.style.setProperty('--header-height', '56px');
      html.style.setProperty('--bottom-nav-height', '56px');
      html.style.setProperty('--font-size-title', '18px');
      html.style.setProperty('--font-size-body', '14px');
      html.style.setProperty('--font-size-small', '12px');
      html.style.setProperty('--icon-size', '32px');
      html.style.setProperty('--nav-icon-size', '20px');
      html.style.setProperty('--transaction-icon-size', '32px');
    }
  });
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set, get) => ({
      ...defaultLayoutConfig,

      setDensity: (density: LayoutDensity) => {
        const newConfig = { ...get(), density };
        set(newConfig);
        applyLayoutConfig(newConfig);
      },

      toggleDensity: () => {
        const currentDensity = get().density;
        const newDensity: LayoutDensity = currentDensity === 'comfortable' ? 'compact' : 'comfortable';
        const newConfig = { ...get(), density: newDensity };
        set(newConfig);
        applyLayoutConfig(newConfig);
      },
    }),
    {
      name: 'layout-storage',
      onRehydrateStorage: (state) => {
        // 立即应用默认布局，避免闪烁
        if (typeof window !== 'undefined') {
          applyLayoutConfig(defaultLayoutConfig);
        }

        return (rehydratedState) => {
          if (rehydratedState) {
            // 在客户端应用布局
            applyLayoutConfig(rehydratedState);
          } else if (typeof window !== 'undefined') {
            // 如果没有恢复状态，应用默认布局
            applyLayoutConfig(defaultLayoutConfig);
          }
        };
      },
    },
  ),
);

// 确保在客户端立即应用布局
if (typeof window !== 'undefined') {
  // 使用setTimeout确保在DOM完全加载后应用布局
  setTimeout(() => {
    const state = useLayoutStore.getState();
    applyLayoutConfig(state);
  }, 0);
}
