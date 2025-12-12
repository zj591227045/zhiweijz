/**
 * 平台特定手势处理器
 * 处理Android和iOS的手势后退差异
 */

import { navigationManager, PageLevel } from './mobile-navigation';

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
  minDistance: 30, // 降低最小距离，提高灵敏度
  maxTime: 500,    // 增加最大时间，允许更慢的手势
  edgeWidth: 30,   // 增加边缘检测区域
};

// 触摸点信息
interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

// 手势监听器信息
interface GestureListener {
  handler: (direction: 'left' | 'right') => boolean;
  priority: number; // 优先级，数字越大优先级越高
  pageLevel?: PageLevel; // 页面层级
}

export class PlatformGestureHandler {
  private platform: Platform;
  private config: GestureConfig;
  private startTouch: TouchPoint | null = null;
  private isGestureActive = false;
  private gestureListeners: GestureListener[] = [];

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
    let swipeIndicator: HTMLElement | null = null;

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

        // 创建滑动指示器
        this.createSwipeIndicator(isLeftEdge ? 'left' : 'right');

        console.log('👆 [GestureHandler] 边缘滑动开始:', {
          x: touch.clientX,
          edge: isLeftEdge ? 'left' : 'right',
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!startTouch || !isEdgeSwipe || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - startTouch.x;
      const deltaY = touch.clientY - startTouch.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // 更新滑动指示器
      this.updateSwipeIndicator(deltaX);

      // 检查手势有效性
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) * 1.5; // 更严格的水平检测
      const isMinDistance = distance > this.config.minDistance;
      const isValidTime = Date.now() - startTouch.timestamp < this.config.maxTime;
      const direction = deltaX > 0 ? 'right' : 'left';
      const isFromLeftEdge = startTouch.x <= this.config.edgeWidth;
      const isBackGesture = direction === 'right' && isFromLeftEdge;

      // 检查是否为有效的后退手势
      if (isHorizontalSwipe && isMinDistance && isValidTime && isBackGesture) {
        console.log('👆 [GestureHandler] 检测到有效后退手势:', {
          deltaX,
          deltaY,
          distance,
          duration: Date.now() - startTouch.timestamp
        });

        // 阻止默认行为
        e.preventDefault();

        // 触发后退处理
        this.handleBackGesture();

        // 重置状态
        this.cleanupSwipeIndicator();
        startTouch = null;
        isEdgeSwipe = false;
      } else if (isMinDistance && !isHorizontalSwipe) {
        // 如果不是水平滑动，取消手势
        console.log('👆 [GestureHandler] 非水平滑动，取消手势');
        this.cleanupSwipeIndicator();
        startTouch = null;
        isEdgeSwipe = false;
      }
    };

    const handleTouchEnd = () => {
      if (isEdgeSwipe) {
        this.cleanupSwipeIndicator();
      }
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
      document.addEventListener(
        'touchmove',
        (e) => {
          // 只在特定条件下阻止默认行为
          if (this.shouldPreventDefault(e)) {
            e.preventDefault();
          }
        },
        { passive: false },
      );
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
      if (e.button === 3) {
        // 后退按钮
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

    // 添加触觉反馈
    this.triggerHapticFeedback();

    // 添加视觉反馈
    this.triggerVisualFeedback();

    // 按优先级排序监听器（优先级高的先处理）
    const sortedListeners = [...this.gestureListeners].sort((a, b) => b.priority - a.priority);

    console.log('⬅️ [GestureHandler] 处理手势监听器，数量:', sortedListeners.length);

    // 优先通知注册的监听器（useMobileBackHandler）
    for (const listener of sortedListeners) {
      console.log('⬅️ [GestureHandler] 尝试监听器，优先级:', listener.priority, '页面层级:', listener.pageLevel);
      if (listener.handler('left')) {
        console.log('⬅️ [GestureHandler] 监听器已处理后退手势，优先级:', listener.priority);
        return;
      }
    }

    // 如果没有监听器处理，使用导航管理器处理后退
    const handled = navigationManager.handleBackAction();

    if (!handled) {
      console.log('⬅️ [GestureHandler] 导航管理器未处理，尝试浏览器历史后退');

      // 最后尝试浏览器历史后退
      if (window.history.length > 1) {
        console.log('⬅️ [GestureHandler] 执行浏览器历史后退');
        window.history.back();
      }
    } else {
      console.log('⬅️ [GestureHandler] 导航管理器已处理后退');
    }
  }

  // 触发触觉反馈
  private triggerHapticFeedback() {
    try {
      // iOS设备的触觉反馈
      if ('navigator' in window && 'vibrate' in navigator) {
        // 轻微振动反馈
        navigator.vibrate(50);
        console.log('📳 [GestureHandler] 触发触觉反馈');
      }

      // Capacitor环境的触觉反馈
      const capacitor = (window as any).Capacitor;
      if (capacitor?.Plugins?.Haptics) {
        capacitor.Plugins.Haptics.impact({ style: 'light' });
        console.log('📳 [GestureHandler] 触发Capacitor触觉反馈');
      }
    } catch (error) {
      console.warn('📳 [GestureHandler] 触觉反馈失败:', error);
    }
  }

  // 触发视觉反馈
  private triggerVisualFeedback() {
    try {
      // 创建临时的视觉反馈元素
      const feedbackElement = document.createElement('div');
      feedbackElement.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.1);
        pointer-events: none;
        z-index: 9999;
        animation: gestureFlash 0.2s ease-out;
      `;

      // 添加动画样式
      if (!document.getElementById('gesture-feedback-styles')) {
        const style = document.createElement('style');
        style.id = 'gesture-feedback-styles';
        style.textContent = `
          @keyframes gestureFlash {
            0% { opacity: 0; }
            50% { opacity: 1; }
            100% { opacity: 0; }
          }

          @keyframes swipeIndicator {
            0% { transform: translateX(-100%); opacity: 0; }
            100% { transform: translateX(0); opacity: 1; }
          }

          @keyframes swipeProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `;
        document.head.appendChild(style);
      }

      document.body.appendChild(feedbackElement);

      // 200ms后移除元素
      setTimeout(() => {
        if (feedbackElement.parentNode) {
          feedbackElement.parentNode.removeChild(feedbackElement);
        }
      }, 200);

      console.log('✨ [GestureHandler] 触发视觉反馈');
    } catch (error) {
      console.warn('✨ [GestureHandler] 视觉反馈失败:', error);
    }
  }

  // 创建滑动指示器
  private createSwipeIndicator(edge: 'left' | 'right') {
    try {
      // 清理可能存在的指示器
      this.cleanupSwipeIndicator();

      const indicator = document.createElement('div');
      indicator.id = 'swipe-indicator';
      indicator.style.cssText = `
        position: fixed;
        top: 0;
        ${edge}: 0;
        width: 4px;
        height: 100%;
        background: linear-gradient(to bottom, rgba(0, 122, 255, 0.8), rgba(0, 122, 255, 0.4));
        pointer-events: none;
        z-index: 9998;
        transform: translateX(${edge === 'left' ? '-100%' : '100%'});
        transition: transform 0.2s ease-out;
      `;

      document.body.appendChild(indicator);

      // 触发动画
      requestAnimationFrame(() => {
        indicator.style.transform = 'translateX(0)';
      });

      console.log('📍 [GestureHandler] 创建滑动指示器:', edge);
    } catch (error) {
      console.warn('📍 [GestureHandler] 创建滑动指示器失败:', error);
    }
  }

  // 更新滑动指示器
  private updateSwipeIndicator(deltaX: number) {
    try {
      const indicator = document.getElementById('swipe-indicator');
      if (!indicator) return;

      // 计算进度（0-1）
      const progress = Math.min(Math.abs(deltaX) / 100, 1);

      // 更新指示器的透明度和宽度
      indicator.style.opacity = (0.4 + progress * 0.6).toString();
      indicator.style.width = (4 + progress * 6) + 'px';

      // 当进度达到阈值时，改变颜色
      if (progress > 0.7) {
        indicator.style.background = 'linear-gradient(to bottom, rgba(52, 199, 89, 0.8), rgba(52, 199, 89, 0.4))';
      }
    } catch (error) {
      console.warn('📍 [GestureHandler] 更新滑动指示器失败:', error);
    }
  }

  // 清理滑动指示器
  private cleanupSwipeIndicator() {
    try {
      const indicator = document.getElementById('swipe-indicator');
      if (indicator) {
        indicator.style.transform = 'translateX(-100%)';
        setTimeout(() => {
          if (indicator.parentNode) {
            indicator.parentNode.removeChild(indicator);
          }
        }, 200);
      }
    } catch (error) {
      console.warn('📍 [GestureHandler] 清理滑动指示器失败:', error);
    }
  }

  // 添加手势监听器
  public addGestureListener(
    handler: (direction: 'left' | 'right') => boolean,
    pageLevel: PageLevel = PageLevel.FEATURE
  ) {
    // 根据页面层级设置优先级
    let priority = 0;
    switch (pageLevel) {
      case PageLevel.MODAL:
        priority = 100; // 模态框最高优先级
        break;
      case PageLevel.FEATURE:
        priority = 50;  // 功能页面中等优先级
        break;
      case PageLevel.DASHBOARD:
        priority = 10;  // 仪表盘最低优先级
        break;
    }

    const listener: GestureListener = {
      handler,
      priority,
      pageLevel,
    };

    this.gestureListeners.push(listener);
    // 日志已精简：手势监听器添加/移除太频繁
  }

  // 移除手势监听器
  public removeGestureListener(handler: (direction: 'left' | 'right') => boolean) {
    const index = this.gestureListeners.findIndex(listener => listener.handler === handler);
    if (index !== -1) {
      this.gestureListeners.splice(index, 1);
      // 日志已精简：手势监听器添加/移除太频繁
    }
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
