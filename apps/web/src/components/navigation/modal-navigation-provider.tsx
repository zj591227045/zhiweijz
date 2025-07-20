/**
 * 模态框导航提供者
 * 管理模态框的导航历史和状态
 */

'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useNavigationStore, PageLevel, navigationManager } from '@/lib/mobile-navigation';

// 模态框配置接口
export interface ModalConfig {
  id: string;
  title: string;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  maskClosable?: boolean;
  onClose?: () => void;
  onOpen?: () => void;
}

// 模态框上下文接口
interface ModalContextType {
  // 打开模态框
  openModal: (config: ModalConfig) => void;
  // 关闭当前模态框
  closeModal: () => void;
  // 关闭所有模态框
  closeAllModals: () => void;
  // 更新模态框配置
  updateModal: (id: string, updates: Partial<ModalConfig>) => void;
  // 获取当前模态框
  getCurrentModal: () => ModalConfig | null;
  // 获取模态框栈
  getModalStack: () => ModalConfig[];
  // 检查模态框是否打开
  isModalOpen: (id?: string) => boolean;
}

// 创建上下文
const ModalContext = createContext<ModalContextType | null>(null);

// 模态框状态管理
interface ModalState {
  modals: Map<string, ModalConfig>;
  modalStack: string[];
}

export function ModalNavigationProvider({ children }: { children: React.ReactNode }) {
  const [modalState, setModalState] = React.useState<ModalState>({
    modals: new Map(),
    modalStack: [],
  });

  const navigationState = useNavigationStore();

  // 打开模态框
  const openModal = useCallback((config: ModalConfig) => {
    console.log('🎭 [ModalNavigation] 打开模态框:', config.id);

    setModalState((prev) => {
      const newModals = new Map(prev.modals);
      newModals.set(config.id, config);

      const newStack = [...prev.modalStack];

      // 如果模态框已存在于栈中，先移除
      const existingIndex = newStack.indexOf(config.id);
      if (existingIndex !== -1) {
        newStack.splice(existingIndex, 1);
      }

      // 添加到栈顶
      newStack.push(config.id);

      return {
        modals: newModals,
        modalStack: newStack,
      };
    });

    // 注册到导航管理器
    navigationManager.openModal({
      id: config.id,
      level: PageLevel.MODAL,
      title: config.title,
      path: window.location.pathname,
      canGoBack: true,
    });

    // 执行打开回调
    if (config.onOpen) {
      config.onOpen();
    }
  }, []);

  // 关闭当前模态框
  const closeModal = useCallback(() => {
    const currentModalId = modalState.modalStack[modalState.modalStack.length - 1];

    if (!currentModalId) {
      console.log('🎭 [ModalNavigation] 没有模态框可关闭');
      return;
    }

    console.log('🎭 [ModalNavigation] 关闭模态框:', currentModalId);

    const modalConfig = modalState.modals.get(currentModalId);

    setModalState((prev) => {
      const newModals = new Map(prev.modals);
      newModals.delete(currentModalId);

      const newStack = prev.modalStack.slice(0, -1);

      return {
        modals: newModals,
        modalStack: newStack,
      };
    });

    // 从导航管理器中移除
    navigationManager.closeModal();

    // 执行关闭回调
    if (modalConfig?.onClose) {
      modalConfig.onClose();
    }
  }, [modalState.modalStack, modalState.modals]);

  // 关闭所有模态框
  const closeAllModals = useCallback(() => {
    console.log('🎭 [ModalNavigation] 关闭所有模态框');

    // 执行所有模态框的关闭回调
    modalState.modalStack.forEach((modalId) => {
      const modalConfig = modalState.modals.get(modalId);
      if (modalConfig?.onClose) {
        modalConfig.onClose();
      }
    });

    setModalState({
      modals: new Map(),
      modalStack: [],
    });

    // 清空导航管理器中的模态框
    navigationManager.getNavigationState().clearModals();
  }, [modalState]);

  // 更新模态框配置
  const updateModal = useCallback((id: string, updates: Partial<ModalConfig>) => {
    console.log('🎭 [ModalNavigation] 更新模态框:', id, updates);

    setModalState((prev) => {
      const existingConfig = prev.modals.get(id);
      if (!existingConfig) {
        console.warn('🎭 [ModalNavigation] 模态框不存在:', id);
        return prev;
      }

      const newModals = new Map(prev.modals);
      newModals.set(id, { ...existingConfig, ...updates });

      return {
        ...prev,
        modals: newModals,
      };
    });
  }, []);

  // 获取当前模态框
  const getCurrentModal = useCallback((): ModalConfig | null => {
    const currentModalId = modalState.modalStack[modalState.modalStack.length - 1];
    return currentModalId ? modalState.modals.get(currentModalId) || null : null;
  }, [modalState]);

  // 获取模态框栈
  const getModalStack = useCallback((): ModalConfig[] => {
    return modalState.modalStack
      .map((id) => modalState.modals.get(id))
      .filter((config): config is ModalConfig => config !== undefined);
  }, [modalState]);

  // 检查模态框是否打开
  const isModalOpen = useCallback(
    (id?: string): boolean => {
      if (id) {
        return modalState.modalStack.includes(id);
      }
      return modalState.modalStack.length > 0;
    },
    [modalState.modalStack],
  );

  // 监听导航状态变化，同步模态框状态
  useEffect(() => {
    const unsubscribe = useNavigationStore.subscribe(
      (state) => state.modalStack,
      (modalStack) => {
        // 如果导航管理器的模态框栈为空，清空本地模态框
        if (modalStack.length === 0 && modalState.modalStack.length > 0) {
          console.log('🎭 [ModalNavigation] 同步清空模态框');
          closeAllModals();
        }
      },
    );

    return unsubscribe;
  }, [modalState.modalStack.length, closeAllModals]);

  const contextValue: ModalContextType = {
    openModal,
    closeModal,
    closeAllModals,
    updateModal,
    getCurrentModal,
    getModalStack,
    isModalOpen,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
      <ModalRenderer
        modals={modalState.modals}
        modalStack={modalState.modalStack}
        onClose={closeModal}
      />
    </ModalContext.Provider>
  );
}

// 模态框渲染器
interface ModalRendererProps {
  modals: Map<string, ModalConfig>;
  modalStack: string[];
  onClose: () => void;
}

function ModalRenderer({ modals, modalStack, onClose }: ModalRendererProps) {
  if (modalStack.length === 0) {
    return null;
  }

  return (
    <>
      {modalStack.map((modalId, index) => {
        const config = modals.get(modalId);
        if (!config) return null;

        const isTopModal = index === modalStack.length - 1;
        const Component = config.component;

        return (
          <div
            key={modalId}
            className={`fixed inset-0 z-50 ${isTopModal ? 'block' : 'hidden'}`}
            style={{ zIndex: 1000 + index }}
          >
            {/* 遮罩层 */}
            <div
              className="absolute inset-0 bg-black bg-opacity-50"
              onClick={config.maskClosable ? onClose : undefined}
            />

            {/* 模态框内容 */}
            <div className="relative z-10 flex items-center justify-center min-h-full p-4">
              <div
                className={`
                  bg-white rounded-lg shadow-xl max-h-full overflow-auto
                  ${config.size === 'sm' ? 'max-w-sm' : ''}
                  ${config.size === 'md' ? 'max-w-md' : ''}
                  ${config.size === 'lg' ? 'max-w-lg' : ''}
                  ${config.size === 'xl' ? 'max-w-xl' : ''}
                  ${config.size === 'full' ? 'w-full h-full max-w-none' : ''}
                  ${!config.size ? 'max-w-md' : ''}
                `}
              >
                {/* 关闭按钮 */}
                {config.closable !== false && (
                  <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-20 p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                )}

                {/* 模态框内容 */}
                <Component {...(config.props || {})} onClose={onClose} isOpen={true} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

// Hook：使用模态框上下文
export function useModalNavigation() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModalNavigation must be used within ModalNavigationProvider');
  }
  return context;
}

// Hook：模态框后退处理
export function useModalBackHandler(modalId: string) {
  const { closeModal, isModalOpen } = useModalNavigation();

  const handleBack = useCallback(() => {
    if (isModalOpen(modalId)) {
      closeModal();
      return true; // 表示已处理后退
    }
    return false; // 未处理，继续其他后退逻辑
  }, [modalId, closeModal, isModalOpen]);

  return { handleBack };
}
