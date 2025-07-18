/**
 * 移动端导航管理系统
 * 解决Android/iOS手势后退问题，实现正确的页面层级导航
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// 页面层级定义
export enum PageLevel {
  DASHBOARD = 0,    // 仪表盘页面（根页面）
  FEATURE = 1,      // 功能页面（设置、记录列表等）
  MODAL = 2,        // 模态框页面（详情、编辑等）
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
      const pageIndex = state.pageStack.findIndex(page => page.id === pageId);
      
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
      const dashboardPage = state.pageStack.find(page => page.level === PageLevel.DASHBOARD);
      
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
      return state.modalStack.length === 0 && 
             state.pageStack.length <= 1 && 
             (state.currentPage?.level === PageLevel.DASHBOARD || !state.currentPage);
    },
  }))
);

// 导航工具函数
export class NavigationManager {
  private static instance: NavigationManager;
  
  static getInstance(): NavigationManager {
    if (!NavigationManager.instance) {
      NavigationManager.instance = new NavigationManager();
    }
    return NavigationManager.instance;
  }

  // 初始化导航管理器
  initialize() {
    const store = useNavigationStore.getState();
    
    // 检测移动端环境
    const isMobile = this.detectMobileEnvironment();
    store.setMobile(isMobile);
    
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
    
    console.log('📱 [NavigationManager] 初始化完成');
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
    
    store.pushPage(pageInfo);
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
