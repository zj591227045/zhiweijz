/**
 * 移动端导航管理系统
 * 解决Android/iOS手势后退问题，实现正确的页面层级导航
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// 页面层级定义
export enum PageLevel {
  DASHBOARD = 0, // 仪表盘页面（根页面）
  FEATURE = 1, // 功能页面（设置、记录列表等）
  MODAL = 2, // 模态框页面（详情、编辑等）
}

// 页面信息接口
export interface PageInfo {
  id: string;
  level: PageLevel;
  title: string;
  path: string;
  parentId?: string;
  canGoBack: boolean;
  timestamp: number;
}

// 导航历史状态
interface NavigationState {
  // 当前页面栈
  pageStack: PageInfo[];
  // 当前页面
  currentPage: PageInfo | null;
  // 模态框栈
  modalStack: PageInfo[];
  // 是否可以后退
  canGoBack: boolean;
  // 是否在移动端环境
  isMobile: boolean;
}

// 导航操作接口
interface NavigationActions {
  // 推入新页面
  pushPage: (page: Omit<PageInfo, 'timestamp'>) => void;
  // 弹出当前页面
  popPage: () => PageInfo | null;
  // 推入模态框
  pushModal: (modal: Omit<PageInfo, 'timestamp'>) => void;
  // 弹出模态框
  popModal: () => PageInfo | null;
  // 清空所有模态框
  clearModals: () => void;
  // 返回到指定页面
  goToPage: (pageId: string) => void;
  // 返回到仪表盘
  goToDashboard: () => void;
  // 执行后退操作
  goBack: () => boolean;
  // 重置导航状态
  reset: () => void;
  // 设置移动端状态
  setMobile: (isMobile: boolean) => void;
  // 获取当前层级
  getCurrentLevel: () => PageLevel;
  // 检查是否可以退出应用
  canExitApp: () => boolean;
}

// 创建导航状态管理
export const useNavigationStore = create<NavigationState & NavigationActions>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    pageStack: [],
    currentPage: null,
    modalStack: [],
    canGoBack: false,
    isMobile: false,

    // 推入新页面
    pushPage: (page) => {
      const timestamp = Date.now();
      const newPage: PageInfo = { ...page, timestamp };

      set((state) => {
        const newStack = [...state.pageStack, newPage];
        return {
          pageStack: newStack,
          currentPage: newPage,
          canGoBack: newStack.length > 1 || state.modalStack.length > 0,
        };
      });

      console.log('📱 [Navigation] 推入页面:', newPage);
    },

    // 弹出当前页面
    popPage: () => {
      const state = get();
      if (state.pageStack.length <= 1) {
        console.log('📱 [Navigation] 无法弹出页面：已在根页面');
        return null;
      }

      const poppedPage = state.pageStack[state.pageStack.length - 1];
      const newStack = state.pageStack.slice(0, -1);
      const newCurrentPage = newStack[newStack.length - 1] || null;

      set({
        pageStack: newStack,
        currentPage: newCurrentPage,
        canGoBack: newStack.length > 1 || state.modalStack.length > 0,
      });

      console.log('📱 [Navigation] 弹出页面:', poppedPage);
      return poppedPage;
    },

    // 推入模态框
    pushModal: (modal) => {
      const timestamp = Date.now();
      const newModal: PageInfo = { ...modal, timestamp };

      set((state) => ({
        modalStack: [...state.modalStack, newModal],
        canGoBack: true,
      }));

      console.log('📱 [Navigation] 推入模态框:', newModal);
    },

    // 弹出模态框
    popModal: () => {
      const state = get();
      if (state.modalStack.length === 0) {
        console.log('📱 [Navigation] 无法弹出模态框：模态框栈为空');
        return null;
      }

      const poppedModal = state.modalStack[state.modalStack.length - 1];
      const newModalStack = state.modalStack.slice(0, -1);

      set({
        modalStack: newModalStack,
        canGoBack: newModalStack.length > 0 || state.pageStack.length > 1,
      });

      console.log('📱 [Navigation] 弹出模态框:', poppedModal);
      return poppedModal;
    },

    // 清空所有模态框
    clearModals: () => {
      set((state) => ({
        modalStack: [],
        canGoBack: state.pageStack.length > 1,
      }));

      console.log('📱 [Navigation] 清空所有模态框');
    },

    // 返回到指定页面
    goToPage: (pageId) => {
      const state = get();
      const pageIndex = state.pageStack.findIndex((page) => page.id === pageId);

      if (pageIndex === -1) {
        console.log('📱 [Navigation] 页面不存在:', pageId);
        return;
      }

      const newStack = state.pageStack.slice(0, pageIndex + 1);
      const newCurrentPage = newStack[newStack.length - 1];

      set({
        pageStack: newStack,
        currentPage: newCurrentPage,
        modalStack: [], // 清空模态框
        canGoBack: newStack.length > 1,
      });

      console.log('📱 [Navigation] 跳转到页面:', pageId);
    },

    // 返回到仪表盘
    goToDashboard: () => {
      const state = get();
      const dashboardPage = state.pageStack.find((page) => page.level === PageLevel.DASHBOARD);

      if (!dashboardPage) {
        console.log('📱 [Navigation] 仪表盘页面不存在');
        return;
      }

      set({
        pageStack: [dashboardPage],
        currentPage: dashboardPage,
        modalStack: [],
        canGoBack: false,
      });

      console.log('📱 [Navigation] 返回到仪表盘');
    },

    // 执行后退操作
    goBack: () => {
      const state = get();

      // 优先关闭模态框
      if (state.modalStack.length > 0) {
        get().popModal();
        return true;
      }

      // 然后返回上一页面
      if (state.pageStack.length > 1) {
        get().popPage();
        return true;
      }

      // 无法后退
      console.log('📱 [Navigation] 无法后退：已在根页面且无模态框');
      return false;
    },

    // 重置导航状态
    reset: () => {
      set({
        pageStack: [],
        currentPage: null,
        modalStack: [],
        canGoBack: false,
      });

      console.log('📱 [Navigation] 重置导航状态');
    },

    // 设置移动端状态
    setMobile: (isMobile) => {
      set({ isMobile });
      console.log('📱 [Navigation] 设置移动端状态:', isMobile);
    },

    // 获取当前层级
    getCurrentLevel: () => {
      const state = get();

      if (state.modalStack.length > 0) {
        return PageLevel.MODAL;
      }

      if (state.currentPage) {
        return state.currentPage.level;
      }

      return PageLevel.DASHBOARD;
    },

    // 检查是否可以退出应用
    canExitApp: () => {
      const state = get();
      return (
        state.modalStack.length === 0 &&
        state.pageStack.length <= 1 &&
        (state.currentPage?.level === PageLevel.DASHBOARD || !state.currentPage)
      );
    },
  })),
);

// 导航工具函数
export class NavigationManager {
  private static instance: NavigationManager;
  private isInitialized = false;
  private maxStackSize = 10; // 限制栈大小，防止内存累积

  static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  // 初始化导航管理器
  initialize() {
    // 防止重复初始化
    if (this.isInitialized) {
      console.log('📱 [NavigationManager] 已初始化，跳过重复初始化');
      return;
    }

    const store = useNavigationStore.getState();

    // 检测移动端环境
    const isMobile = this.detectMobileEnvironment();
    store.setMobile(isMobile);

    // 清理可能存在的无效状态
    this.cleanupInvalidStates();

    // 初始化仪表盘页面
    if (store.pageStack.length === 0) {
      store.pushPage({
        id: 'dashboard',
        level: PageLevel.DASHBOARD,
        title: '仪表盘',
        path: '/dashboard',
        canGoBack: false,
      });
    }

    this.isInitialized = true;
    console.log('📱 [NavigationManager] 初始化完成');
  }

  // 清理无效状态
  private cleanupInvalidStates() {
    const store = useNavigationStore.getState();

    // 限制页面栈大小
    if (store.pageStack.length > this.maxStackSize) {
      const trimmedStack = store.pageStack.slice(-this.maxStackSize);
      console.log(
        '📱 [NavigationManager] 清理过大的页面栈:',
        store.pageStack.length,
        '->',
        trimmedStack.length,
      );

      useNavigationStore.setState({
        pageStack: trimmedStack,
        currentPage: trimmedStack[trimmedStack.length - 1] || null,
      });
    }

    // 清理过时的模态框
    if (store.modalStack.length > 5) {
      console.log('📱 [NavigationManager] 清理过多的模态框');
      useNavigationStore.setState({
        modalStack: [],
        canGoBack: store.pageStack.length > 1,
      });
    }
  }

  // 检测移动端环境
  private detectMobileEnvironment(): boolean {
    if (typeof window === 'undefined') return false;

    // 检查是否在Capacitor环境中
    const isCapacitor = !!(window as any).Capacitor;

    // 检查用户代理
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);

    return isCapacitor || isMobileUA;
  }

  // 处理页面导航
  navigateToPage(pageInfo: Omit<PageInfo, 'timestamp'>) {
    const store = useNavigationStore.getState();

    // 如果是同一页面，不重复推入
    if (store.currentPage?.id === pageInfo.id) {
      console.log('📱 [NavigationManager] 跳过重复页面:', pageInfo.id);
      return;
    }

    // 智能导航逻辑
    this.smartNavigate(pageInfo);
  }

  // 智能导航 - 根据页面层级决定是推入、替换还是重置
  private smartNavigate(pageInfo: Omit<PageInfo, 'timestamp'>) {
    const store = useNavigationStore.getState();

    // 对于仪表盘级别的页面，直接替换或重置到该页面
    if (pageInfo.level === PageLevel.DASHBOARD) {
      const existingDashboard = store.pageStack.find((p) => p.level === PageLevel.DASHBOARD);
      if (existingDashboard) {
        // 重置到仪表盘
        store.goToDashboard();
        console.log('📱 [NavigationManager] 重置到仪表盘页面');
      } else {
        // 推入新的仪表盘页面
        store.pushPage(pageInfo);
        console.log('📱 [NavigationManager] 推入仪表盘页面');
      }
      return;
    }

    // 对于模态框页面，推入到模态框栈
    if (pageInfo.level === PageLevel.MODAL) {
      // 确保有正确的父页面在页面栈中
      this.ensureParentPageExists(pageInfo.path);

      store.pushModal(pageInfo);
      console.log('📱 [NavigationManager] 推入模态框页面:', pageInfo.id);
      return;
    }

    // 对于功能页面，检查是否应该替换当前页面
    if (pageInfo.level === PageLevel.FEATURE) {
      const currentPage = store.currentPage;

      // 如果当前页面也是功能页面
      if (currentPage && currentPage.level === PageLevel.FEATURE) {
        const currentCategory = this.getPageCategory(currentPage.path);
        const newCategory = this.getPageCategory(pageInfo.path);

        // 如果是不同的主要功能区域，替换而不是推入
        if (currentCategory !== newCategory) {
          // 确保仪表盘页面在栈底
          this.ensureDashboardInStack();
          this.replacePage(pageInfo);
          console.log('📱 [NavigationManager] 替换功能页面:', pageInfo.id);
          return;
        } else if (currentPage.path === pageInfo.path) {
          // 相同页面，不重复推入
          console.log('📱 [NavigationManager] 相同功能页面，跳过推入:', pageInfo.id);
          return;
        }
      } else {
        // 当前页面不是功能页面，确保仪表盘页面在栈中
        this.ensureDashboardInStack();
      }
    }

    // 默认推入页面
    store.pushPage(pageInfo);
    console.log('📱 [NavigationManager] 推入新页面:', pageInfo.id);

    // 定期清理
    this.cleanupInvalidStates();
  }

  // 替换当前页面
  private replacePage(pageInfo: Omit<PageInfo, 'timestamp'>) {
    const store = useNavigationStore.getState();
    const timestamp = Date.now();
    const newPage: PageInfo = { ...pageInfo, timestamp };

    // 如果有页面栈，替换最后一个；否则推入新页面
    if (store.pageStack.length > 0) {
      const newStack = [...store.pageStack.slice(0, -1), newPage];
      useNavigationStore.setState({
        pageStack: newStack,
        currentPage: newPage,
        canGoBack: newStack.length > 1 || store.modalStack.length > 0,
      });
    } else {
      store.pushPage(pageInfo);
    }
  }

  // 获取页面类别 - 用于判断是否应该替换页面
  private getPageCategory(path: string): string {
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/statistics')) return 'statistics';
    if (path.startsWith('/budgets')) return 'budgets';
    if (path.startsWith('/transactions')) return 'transactions';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/auth')) return 'auth';
    return 'other';
  }

  // 确保仪表盘页面在页面栈中
  private ensureDashboardInStack() {
    const store = useNavigationStore.getState();

    // 检查是否有仪表盘页面
    const hasDashboard = store.pageStack.some(page => page.level === PageLevel.DASHBOARD);

    if (!hasDashboard) {
      // 在栈底添加仪表盘页面
      const dashboardPage: Omit<PageInfo, 'timestamp'> = {
        id: 'dashboard',
        level: PageLevel.DASHBOARD,
        title: '仪表盘',
        path: '/dashboard',
        canGoBack: false,
      };

      // 将仪表盘页面插入到栈底
      const timestamp = Date.now();
      const newDashboardPage: PageInfo = { ...dashboardPage, timestamp };

      useNavigationStore.setState((state) => ({
        pageStack: [newDashboardPage, ...state.pageStack],
        canGoBack: true, // 现在有多个页面了
      }));

      console.log('📱 [NavigationManager] 自动添加仪表盘页面到栈底');
    }
  }

  // 确保父页面存在于页面栈中
  private ensureParentPageExists(modalPath: string) {
    const store = useNavigationStore.getState();

    // 首先确保仪表盘在栈中
    this.ensureDashboardInStack();

    // 根据模态框路径推断父页面路径
    let parentPath = '';
    let parentTitle = '';

    if (modalPath.startsWith('/settings/')) {
      parentPath = '/settings';
      parentTitle = '设置';
    } else if (modalPath.startsWith('/budgets/')) {
      parentPath = '/budgets';
      parentTitle = '预算管理';
    } else if (modalPath.startsWith('/transactions/')) {
      parentPath = '/transactions';
      parentTitle = '记账记录';
    } else {
      // 无法推断父页面，跳过
      return;
    }

    // 检查父页面是否已在页面栈中
    const parentExists = store.pageStack.some(page => page.path === parentPath);

    if (!parentExists) {
      // 推入父页面
      const parentPageInfo: Omit<PageInfo, 'timestamp'> = {
        id: parentPath.replace(/^\//, '').replace(/\//g, '_') || 'dashboard',
        level: PageLevel.FEATURE,
        title: parentTitle,
        path: parentPath,
        canGoBack: true,
      };

      store.pushPage(parentPageInfo);
      console.log('📱 [NavigationManager] 自动推入父页面:', parentPageInfo);
    }
  }

  // 处理模态框导航
  openModal(modalInfo: Omit<PageInfo, 'timestamp'>) {
    const store = useNavigationStore.getState();
    store.pushModal(modalInfo);
  }

  // 关闭模态框
  closeModal() {
    const store = useNavigationStore.getState();
    return store.popModal();
  }

  // 执行后退操作
  handleBackAction(): boolean {
    const store = useNavigationStore.getState();
    return store.goBack();
  }

  // 获取当前导航状态
  getNavigationState() {
    return useNavigationStore.getState();
  }
}

// 导出单例实例
export const navigationManager = NavigationManager.getInstance();
