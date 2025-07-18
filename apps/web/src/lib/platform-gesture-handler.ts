/**
 * 平台特定手势处理器
 * 处理Android和iOS的手势后退差异
 */

import { navigationManager } from './mobile-navigation';

// 平台类型
export enum Platform {
  WEB = 'web',
  ANDROID = 'android',
  IOS = 'ios',
  UNKNOWN = 'unknown',
}

// 手势配置
interface GestureConfig {
  // 是否启用手势
  enabled: boolean;
  // 手势灵敏度 (0-1)
  sensitivity: number;
  // 最小滑动距离 (px)
  minDistance: number;
  // 最大滑动时间 (ms)
  maxTime: number;
  // 边缘检测区域宽度 (px)
  edgeWidth: number;
}

// 默认手势配置
const DEFAULT_GESTURE_CONFIG: GestureConfig = {
  enabled: true,
  sensitivity: 0.3,
  minDistance: 50,
  maxTime: 300,
  edgeWidth: 20,
};

// 触摸点信息
interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export class PlatformGestureHandler {
  private platform: Platform;
  private config: GestureConfig;
  private startTouch: TouchPoint | null = null;
  private isGestureActive = false;
  private gestureListeners: Set<(direction: 'left' | 'right') => boolean> = new Set();

  constructor(config: Partial<GestureConfig> = {}) {
    this.platform = this.detectPlatform();
    this.config = { ...DEFAULT_GESTURE_CONFIG, ...config };
    
    console.log('🎯 [GestureHandler] 初始化平台手势处理器:', this.platform);
    
    this.initialize();
  }

  // 检测当前平台
  private detectPlatform(): Platform {
    if (typeof window === 'undefined') {
      return Platform.UNKNOWN;
    }

    const capacitor = (window as any).Capacitor;
    if (capacitor) {
      const platform = capacitor.getPlatform();
      switch (platform) {
        case 'android':
          return Platform.ANDROID;
        case 'ios':
          return Platform.IOS;
        default:
          return Platform.WEB;
      }
    }

    // 检查用户代理
    const userAgent = navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) {
      return Platform.ANDROID;
    }
    if (/iphone|ipad|ipod/.test(userAgent)) {
      return Platform.IOS;
    }

    return Platform.WEB;
  }

  // 初始化手势处理
  private initialize() {
    if (!this.config.enabled || typeof window === 'undefined') {
      return;
    }

    switch (this.platform) {
      case Platform.ANDROID:
        this.initializeAndroidGestures();
        break;
      case Platform.IOS:
        this.initializeIOSGestures();
        break;
      case Platform.WEB:
        this.initializeWebGestures();
        break;
    }
  }

  // Android手势处理
  private initializeAndroidGestures() {
    console.log('🤖 [GestureHandler] 初始化Android手势');

    // Android主要依赖硬件后退按钮，但也支持边缘滑动
    this.setupEdgeSwipeGestures();
    
    // 禁用默认的浏览器手势
    this.disableBrowserGestures();
  }

  // iOS手势处理
  private initializeIOSGestures() {
    console.log('🍎 [GestureHandler] 初始化iOS手势');

    // iOS主要依赖边缘滑动手势
    this.setupEdgeSwipeGestures();
    
    // 尝试启用iOS特定的手势
    this.enableIOSSpecificGestures();
  }

  // Web手势处理
  private initializeWebGestures() {
    console.log('🌐 [GestureHandler] 初始化Web手势');

    // Web环境支持键盘和鼠标手势
    this.setupKeyboardGestures();
    this.setupMouseGestures();
  }

  // 设置边缘滑动手势
  private setupEdgeSwipeGestures() {
    let startTouch: TouchPoint | null = null;
    let isEdgeSwipe = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const touch = e.touches[0];
      const isLeftEdge = touch.clientX <= this.config.edgeWidth;
      const isRightEdge = touch.clientX >= window.innerWidth - this.config.edgeWidth;

      if (isLeftEdge || isRightEdge) {
        startTouch = {
          x: touch.clientX,
          y: touch.clientY,
          timestamp: Date.now(),
        };
        isEdgeSwipe = true;
        
        console.log('👆 [GestureHandler] 边缘滑动开始:', { x: touch.clientX, edge: isLeftEdge ? 'left' : 'right' });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startTouch || !isEdgeSwipe || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startTouch.x;
      const deltaY = touch.clientY - startTouch.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 检查是否为有效的水平滑动
      if (Math.abs(deltaX) > Math.abs(deltaY) && distance > this.config.minDistance) {
        const direction = deltaX > 0 ? 'right' : 'left';
        
        // 只处理从左边缘向右滑动（后退手势）
        if (startTouch.x <= this.config.edgeWidth && direction === 'right') {
          console.log('👆 [GestureHandler] 检测到后退手势');
          
          // 阻止默认行为
          e.preventDefault();
          
          // 触发后退处理
          this.handleBackGesture();
          
          // 重置状态
          startTouch = null;
          isEdgeSwipe = false;
        }
      }
    };

    const handleTouchEnd = () => {
      startTouch = null;
      isEdgeSwipe = false;
    };

    // 添加事件监听器
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    console.log('👆 [GestureHandler] 边缘滑动手势已设置');
  }

  // 启用iOS特定手势
  private enableIOSSpecificGestures() {
    // 尝试禁用iOS的默认后退手势，使用自定义处理
    const style = document.createElement('style');
    style.textContent = `
      body {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -webkit-tap-highlight-color: transparent;
        overscroll-behavior: none;
      }
      
      * {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
      }
    `;
    document.head.appendChild(style);

    // 监听iOS特定事件
    if ('ontouchstart' in window) {
      // 禁用iOS的默认滑动行为
      document.addEventListener('touchmove', (e) => {
        // 只在特定条件下阻止默认行为
        if (this.shouldPreventDefault(e)) {
          e.preventDefault();
        }
      }, { passive: false });
    }

    console.log('🍎 [GestureHandler] iOS特定手势已启用');
  }

  // 判断是否应该阻止默认行为
  private shouldPreventDefault(e: TouchEvent): boolean {
    // 如果是边缘滑动且可能是后退手势，阻止默认行为
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const isLeftEdge = touch.clientX <= this.config.edgeWidth;
      
      if (isLeftEdge) {
        return true;
      }
    }
    
    return false;
  }

  // 设置键盘手势
  private setupKeyboardGestures() {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC键或Alt+左箭头触发后退
      if (e.key === 'Escape' || (e.altKey && e.key === 'ArrowLeft')) {
        console.log('⌨️ [GestureHandler] 键盘后退手势:', e.key);
        e.preventDefault();
        this.handleBackGesture();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    console.log('⌨️ [GestureHandler] 键盘手势已设置');
  }

  // 设置鼠标手势
  private setupMouseGestures() {
    const handleMouseDown = (e: MouseEvent) => {
      // 鼠标侧键（后退按钮）
      if (e.button === 3) { // 后退按钮
        console.log('🖱️ [GestureHandler] 鼠标后退按钮');
        e.preventDefault();
        this.handleBackGesture();
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    console.log('🖱️ [GestureHandler] 鼠标手势已设置');
  }

  // 禁用浏览器默认手势
  private disableBrowserGestures() {
    // 禁用浏览器的默认滑动导航
    const style = document.createElement('style');
    style.textContent = `
      html, body {
        overscroll-behavior-x: none;
        overscroll-behavior-y: auto;
      }
    `;
    document.head.appendChild(style);

    console.log('🚫 [GestureHandler] 浏览器默认手势已禁用');
  }

  // 处理后退手势
  private handleBackGesture() {
    console.log('⬅️ [GestureHandler] 处理后退手势');
    
    // 使用导航管理器处理后退
    const handled = navigationManager.handleBackAction();
    
    if (!handled) {
      console.log('⬅️ [GestureHandler] 导航管理器未处理，尝试其他方式');
      
      // 通知注册的监听器
      for (const listener of this.gestureListeners) {
        if (listener('left')) {
          console.log('⬅️ [GestureHandler] 监听器已处理后退手势');
          return;
        }
      }
      
      // 最后尝试浏览器历史后退
      if (window.history.length > 1) {
        console.log('⬅️ [GestureHandler] 执行浏览器历史后退');
        window.history.back();
      }
    }
  }

  // 添加手势监听器
  public addGestureListener(listener: (direction: 'left' | 'right') => boolean) {
    this.gestureListeners.add(listener);
    console.log('👂 [GestureHandler] 添加手势监听器');
  }

  // 移除手势监听器
  public removeGestureListener(listener: (direction: 'left' | 'right') => boolean) {
    this.gestureListeners.delete(listener);
    console.log('👂 [GestureHandler] 移除手势监听器');
  }

  // 更新配置
  public updateConfig(config: Partial<GestureConfig>) {
    this.config = { ...this.config, ...config };
    console.log('⚙️ [GestureHandler] 更新配置:', this.config);
  }

  // 获取当前平台
  public getPlatform(): Platform {
    return this.platform;
  }

  // 获取配置
  public getConfig(): GestureConfig {
    return { ...this.config };
  }

  // 销毁处理器
  public destroy() {
    this.gestureListeners.clear();
    console.log('💥 [GestureHandler] 手势处理器已销毁');
  }
}

// 创建全局手势处理器实例
export const platformGestureHandler = new PlatformGestureHandler();

// 初始化函数
export function initializePlatformGestures(config?: Partial<GestureConfig>) {
  if (config) {
    platformGestureHandler.updateConfig(config);
  }
  
  console.log('🚀 [GestureHandler] 平台手势处理器已初始化');
  return platformGestureHandler;
}
