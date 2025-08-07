/**
 * Capacitor集成模块
 * 处理Capacitor App插件的集成和硬件后退按钮
 */

import { navigationManager } from './mobile-navigation';
import { platformGestureHandler } from './platform-gesture-handler';
import { handleShortcutsDeepLink } from './shortcuts-deep-link-handler';

// Capacitor插件接口
interface CapacitorApp {
  addListener: (eventName: string, callback: (data: any) => void) => { remove: () => void };
  exitApp: () => void;
  getInfo: () => Promise<{ name: string; id: string; build: string; version: string }>;
  getState: () => Promise<{ isActive: boolean }>;
  minimizeApp: () => void;
}

interface CapacitorPlugins {
  App: CapacitorApp;
  StatusBar?: any;
  SplashScreen?: any;
  Keyboard?: any;
}

interface CapacitorGlobal {
  Capacitor: {
    Plugins: CapacitorPlugins;
    getPlatform: () => string;
    isNativePlatform: () => boolean;
    isPluginAvailable: (name: string) => boolean;
  };
}

// 后退按钮处理配置
interface BackButtonConfig {
  // 是否启用硬件后退按钮处理
  enabled: boolean;
  // 双击退出的时间间隔（毫秒）
  doubleClickExitInterval: number;
  // 退出确认提示
  exitConfirmation: boolean;
  // 自定义退出处理
  customExitHandler?: () => boolean;
}

// 默认配置
const DEFAULT_BACK_BUTTON_CONFIG: BackButtonConfig = {
  enabled: true,
  doubleClickExitInterval: 2000,
  exitConfirmation: false,
};

export class CapacitorIntegration {
  private capacitor: CapacitorGlobal['Capacitor'] | null = null;
  private backButtonListener: { remove: () => void } | null = null;
  private appStateListener: { remove: () => void } | null = null;
  private urlOpenListener: { remove: () => void } | null = null;
  private appRestoredListener: { remove: () => void } | null = null;
  private config: BackButtonConfig;
  private lastBackPress = 0;
  private exitToast: any = null;
  private isDestroyed = false;

  constructor(config: Partial<BackButtonConfig> = {}) {
    this.config = { ...DEFAULT_BACK_BUTTON_CONFIG, ...config };
    this.initialize();
  }

  // 初始化Capacitor集成
  private initialize() {
    if (typeof window === 'undefined') {
      console.log('🔌 [Capacitor] 非浏览器环境，跳过初始化');
      return;
    }

    // 检查Capacitor是否可用
    this.capacitor = (window as any).Capacitor;

    if (!this.capacitor) {
      console.log('🔌 [Capacitor] Capacitor不可用，使用Web模式');
      return;
    }

    console.log('🔌 [Capacitor] Capacitor已检测到:', {
      platform: this.capacitor.getPlatform(),
      isNative: this.capacitor.isNativePlatform(),
    });

    this.setupAppListeners();
    this.setupBackButtonHandler();
    this.setupStatusBar();
    this.setupKeyboard();
  }

  // 设置应用监听器
  private setupAppListeners() {
    if (!this.capacitor?.Plugins?.App || this.isDestroyed) return;

    const { App } = this.capacitor.Plugins;

    try {
      // 应用状态变化监听
      this.appStateListener = App.addListener('appStateChange', (state) => {
        if (this.isDestroyed) return; // 检查是否已销毁

        console.log('🔌 [Capacitor] 应用状态变化:', state);

        if (state.isActive) {
          // 应用激活时的处理
          this.onAppActivated();
        } else {
          // 应用进入后台时的处理
          this.onAppDeactivated();
        }
      });

      // URL打开监听
      this.urlOpenListener = App.addListener('appUrlOpen', (data) => {
        if (this.isDestroyed) return;

        console.log('🔌 [Capacitor] URL打开:', data);
        this.handleUrlOpen(data.url);

        // 处理快捷指令深度链接
        if (data.url.startsWith('zhiweijz://')) {
          console.log('🔌 [Capacitor] 检测到快捷指令URL，开始处理');
          handleShortcutsDeepLink(data.url).catch(error => {
            console.error('🔌 [Capacitor] 快捷指令处理失败:', error);
          });
        }
      });

      // 应用恢复监听
      this.appRestoredListener = App.addListener('appRestoredResult', (data) => {
        if (this.isDestroyed) return;

        console.log('🔌 [Capacitor] 应用恢复:', data);
      });

      console.log('🔌 [Capacitor] 应用监听器已设置');
    } catch (error) {
      console.error('🔌 [Capacitor] 设置应用监听器失败:', error);
    }
  }

  // 设置硬件后退按钮处理
  private setupBackButtonHandler() {
    if (!this.config.enabled || !this.capacitor?.Plugins?.App) {
      console.log('🔌 [Capacitor] 后退按钮处理已禁用');
      return;
    }

    const { App } = this.capacitor.Plugins;

    this.backButtonListener = App.addListener('backButton', (data) => {
      console.log('🔌 [Capacitor] 硬件后退按钮触发:', data);
      this.handleBackButton();
    });

    console.log('🔌 [Capacitor] 硬件后退按钮监听器已设置');
  }

  // 处理硬件后退按钮
  private handleBackButton() {
    console.log('⬅️ [Capacitor] 处理硬件后退按钮');

    // 1. 优先使用自定义退出处理
    if (this.config.customExitHandler) {
      const handled = this.config.customExitHandler();
      if (handled) {
        console.log('⬅️ [Capacitor] 自定义处理器已处理后退');
        return;
      }
    }

    // 2. 使用导航管理器处理
    const navigationHandled = navigationManager.handleBackAction();
    if (navigationHandled) {
      console.log('⬅️ [Capacitor] 导航管理器已处理后退');
      return;
    }

    // 3. 检查是否可以退出应用
    const canExit = navigationManager.getNavigationState().canExitApp();
    if (canExit) {
      this.handleAppExit();
    } else {
      console.log('⬅️ [Capacitor] 无法退出应用，当前不在根页面');
    }
  }

  // 处理应用退出
  private handleAppExit() {
    const now = Date.now();

    if (this.config.exitConfirmation) {
      // 显示退出确认
      this.showExitConfirmation();
      return;
    }

    // 双击退出逻辑
    if (now - this.lastBackPress < this.config.doubleClickExitInterval) {
      // 双击退出
      console.log('🚪 [Capacitor] 双击退出应用');
      this.exitApp();
    } else {
      // 第一次按下，显示提示
      this.lastBackPress = now;
      this.showExitToast();
    }
  }

  // 显示退出提示
  private showExitToast() {
    // 这里可以集成Toast组件或使用原生提示
    console.log('💬 [Capacitor] 显示退出提示：再按一次退出应用');

    // 简单的原生alert（实际项目中应该使用更好的UI组件）
    if (this.capacitor?.isNativePlatform()) {
      // 在原生环境中可以使用Toast插件
      this.showNativeToast('再按一次退出应用');
    } else {
      // Web环境使用简单提示
      const toast = document.createElement('div');
      toast.textContent = '再按一次退出应用';
      toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
        font-size: 14px;
      `;

      document.body.appendChild(toast);

      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
    }
  }

  // 显示原生Toast
  private showNativeToast(message: string) {
    // 这里可以集成Capacitor Toast插件
    console.log('📱 [Capacitor] 原生Toast:', message);
  }

  // 显示退出确认
  private showExitConfirmation() {
    const confirmed = confirm('确定要退出应用吗？');
    if (confirmed) {
      this.exitApp();
    }
  }

  // 退出应用
  private exitApp() {
    if (!this.capacitor?.Plugins?.App) {
      console.log('🚪 [Capacitor] 无法退出：App插件不可用');
      return;
    }

    console.log('🚪 [Capacitor] 退出应用');
    this.capacitor.Plugins.App.exitApp();
  }

  // 设置状态栏
  private setupStatusBar() {
    if (!this.capacitor?.Plugins?.StatusBar) return;

    const { StatusBar } = this.capacitor.Plugins;

    try {
      // 设置状态栏样式
      StatusBar.setStyle({ style: 'LIGHT' });
      StatusBar.setBackgroundColor({ color: '#FFFFFF' });
      StatusBar.setOverlaysWebView({ overlay: false });

      console.log('🔌 [Capacitor] 状态栏已配置');
    } catch (error) {
      console.error('🔌 [Capacitor] 状态栏配置失败:', error);
    }
  }

  // 设置键盘
  private setupKeyboard() {
    if (!this.capacitor?.Plugins?.Keyboard) return;

    const { Keyboard } = this.capacitor.Plugins;

    try {
      // 键盘显示/隐藏监听
      Keyboard.addListener('keyboardWillShow', (info) => {
        console.log('⌨️ [Capacitor] 键盘将显示:', info);
        document.body.classList.add('keyboard-open');
      });

      Keyboard.addListener('keyboardWillHide', () => {
        console.log('⌨️ [Capacitor] 键盘将隐藏');
        document.body.classList.remove('keyboard-open');
      });

      console.log('🔌 [Capacitor] 键盘监听器已设置');
    } catch (error) {
      console.error('🔌 [Capacitor] 键盘设置失败:', error);
    }
  }

  // 应用激活处理
  private onAppActivated() {
    console.log('🔌 [Capacitor] 应用已激活');

    // 重新初始化导航状态
    navigationManager.initialize();

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('app:activated'));
  }

  // 应用进入后台处理
  private onAppDeactivated() {
    console.log('🔌 [Capacitor] 应用进入后台');

    // 清理临时状态
    this.lastBackPress = 0;

    // 触发自定义事件
    window.dispatchEvent(new CustomEvent('app:deactivated'));
  }

  // 处理URL打开
  private handleUrlOpen(url: string) {
    console.log('🔗 [Capacitor] 处理URL打开:', url);

    // 这里可以添加深度链接处理逻辑
    // 例如：解析URL并导航到相应页面
  }

  // 更新配置
  public updateConfig(config: Partial<BackButtonConfig>) {
    this.config = { ...this.config, ...config };
    console.log('⚙️ [Capacitor] 配置已更新:', this.config);
  }

  // 获取应用信息
  public async getAppInfo() {
    if (!this.capacitor?.Plugins?.App || !this.capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const info = await this.capacitor.Plugins.App.getInfo();
      console.log('ℹ️ [Capacitor] 应用信息:', info);
      return info;
    } catch (error) {
      console.error('ℹ️ [Capacitor] 获取应用信息失败:', error);
      return null;
    }
  }

  // 获取应用状态
  public async getAppState() {
    if (!this.capacitor?.Plugins?.App || !this.capacitor.isNativePlatform()) {
      return null;
    }

    try {
      const state = await this.capacitor.Plugins.App.getState();
      console.log('📊 [Capacitor] 应用状态:', state);
      return state;
    } catch (error) {
      console.error('📊 [Capacitor] 获取应用状态失败:', error);
      return null;
    }
  }

  // 检查是否在原生环境
  public isNative(): boolean {
    return this.capacitor?.isNativePlatform() || false;
  }

  // 获取平台
  public getPlatform(): string {
    return this.capacitor?.getPlatform() || 'web';
  }

  // 销毁
  public destroy() {
    this.isDestroyed = true;

    // 清理所有监听器
    try {
      if (this.backButtonListener) {
        this.backButtonListener.remove();
        this.backButtonListener = null;
      }

      if (this.appStateListener) {
        this.appStateListener.remove();
        this.appStateListener = null;
      }

      if (this.urlOpenListener) {
        this.urlOpenListener.remove();
        this.urlOpenListener = null;
      }

      if (this.appRestoredListener) {
        this.appRestoredListener.remove();
        this.appRestoredListener = null;
      }

      // 清理其他状态
      this.lastBackPress = 0;
      this.exitToast = null;

      console.log('💥 [Capacitor] Capacitor集成已销毁');
    } catch (error) {
      console.error('💥 [Capacitor] 销毁过程中出现错误:', error);
    }
  }
}

// 创建全局实例
export const capacitorIntegration = new CapacitorIntegration();

// 初始化函数
export function initializeCapacitorIntegration(config?: Partial<BackButtonConfig>) {
  if (config) {
    capacitorIntegration.updateConfig(config);
  }

  console.log('🚀 [Capacitor] Capacitor集成已初始化');
  return capacitorIntegration;
}
