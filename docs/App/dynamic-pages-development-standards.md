# 动态页面开发规范

## 概述

本文档定义了项目中动态页面的开发标准，包括动态路由页面和全屏模态框组件的实现规范，以及全屏模态框的调用管理规范。确保跨平台（Web、iOS、Android）的一致性和可维护性。

## 目录

1. [架构设计原则](#1-架构设计原则)
2. [文件结构规范](#2-文件结构规范)
3. [动态路由页面规范](#3-动态路由页面规范)
4. [全屏模态框规范](#4-全屏模态框规范)
5. [样式规范](#5-样式规范)
6. [数据获取规范](#6-数据获取规范)
7. [全屏模态框调用管理规范](#7-全屏模态框调用管理规范)
8. [模态框生命周期管理](#8-模态框生命周期管理)
9. [调用规范最佳实践](#9-调用规范最佳实践)
10. [错误处理规范](#10-错误处理规范)
11. [平台特定规范](#11-平台特定规范)
12. [性能优化规范](#12-性能优化规范)
13. [测试规范](#13-测试规范)
14. [开发工作流](#14-开发工作流)
15. [维护指南](#15-维护指南)
16. [附录：常用代码模板](#附录常用代码模板)

## 1. 架构设计原则

### 1.1 双重实现策略
- **动态路由页面**：用于直接URL访问、SEO优化、外部链接支持
- **全屏模态框**：用于应用内导航、移动端优化体验

### 1.2 平台兼容性
- **Web端**：支持两种访问方式，优先使用模态框
- **iOS端**：主要使用模态框，动态路由作为fallback
- **Android端**：与iOS保持一致

## 2. 文件结构规范

### 2.1 目录结构
```
src/
├── app/                          # App Router 动态路由页面
│   └── [entity]/
│       └── [id]/
│           └── page.tsx          # 动态路由页面
├── components/                   # 全屏模态框组件
│   └── [entity]/
│       └── [entity]-modal.tsx   # 全屏模态框
└── pages/                        # Pages Router (Capacitor兼容)
    └── [entity]/
        └── [id].tsx              # Capacitor iOS兼容页面
```

### 2.2 命名规范
- 动态路由页面：`/app/[entity]/[id]/page.tsx`
- 模态框组件：`/components/[entity]/[entity]-modal.tsx`
- Pages Router：`/pages/[entity]/[id].tsx`

## 3. 动态路由页面规范

### 3.1 基本结构
```typescript
// app/[entity]/[id]/page.tsx
import { Metadata } from 'next';

interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `${entity} - ${params.id}`,
    description: `查看${entity}详情`,
  };
}

export default async function EntityDetailPage({ params }: PageProps) {
  // 服务端数据获取
  const data = await fetchEntityData(params.id);
  
  return (
    <div className="page-container">
      {/* 页面内容 */}
    </div>
  );
}
```

### 3.2 必需功能
- ✅ SEO元数据支持
- ✅ 服务端渲染(SSR)
- ✅ 错误边界处理
- ✅ 加载状态管理
- ✅ 响应式设计

## 4. 全屏模态框规范

### 4.1 基本结构
```typescript
// components/[entity]/[entity]-modal.tsx
interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
  initialData?: EntityData;
}

export default function EntityModal({ 
  isOpen, 
  onClose, 
  entityId, 
  initialData 
}: EntityModalProps) {
  // 客户端数据获取和状态管理
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--background-color)',
      zIndex: 9999,
      display: isOpen ? 'flex' : 'none',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 模态框内容 */}
    </div>
  );
}
```

### 4.2 必需功能
- ✅ 全屏覆盖显示
- ✅ 客户端数据获取
- ✅ 状态管理
- ✅ 移动端优化
- ✅ 关闭机制

## 5. 样式规范

### 5.1 容器样式
```css
/* 最外层容器 */
.modal-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100vw;
  height: 100vh;
  background-color: var(--background-color);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 应用容器 */
.app-container {
  max-width: 100vw;
  width: 100vw;
  height: 100vh;
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

/* 头部固定高度 */
.header {
  height: 64px !important;
  min-height: 64px !important;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}

/* 主要内容区域 */
.main-content {
  padding-bottom: 120px; /* 为底部按钮留空间 */
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  width: 100%;
  max-width: 100%;
  -webkit-overflow-scrolling: touch;
}
```

### 5.2 底部按钮样式
```css
/* 固定底部按钮容器 */
.bottom-button-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 100vw;
  padding: 16px 20px;
  padding-bottom: max(20px, env(safe-area-inset-bottom));
  background-color: white;
  border-top: 1px solid var(--border-color);
  z-index: 10001;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
}

/* 按钮样式 */
.bottom-button {
  width: 100%;
  height: 48px;
  border-radius: 12px;
  background-color: var(--primary-color);
  color: white;
  font-size: 16px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}
```

## 6. 数据获取规范

### 6.1 动态路由页面（服务端）
```typescript
// 服务端数据获取
async function fetchEntityData(id: string) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/entities/${id}`, {
      cache: 'no-store', // 或适当的缓存策略
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch data');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching entity data:', error);
    throw error;
  }
}
```

### 6.2 模态框组件（客户端）
```typescript
// 客户端数据获取
function useEntityData(id: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/entities/${id}`);
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    if (id) {
      fetchData();
    }
  }, [id]);
  
  return { data, loading, error };
}
```

## 7. 全屏模态框调用管理规范

### 7.1 全局模态框管理器
```typescript
// types/modal.ts
export interface ModalConfig {
  type: string;
  id: string;
  data?: any;
  options?: {
    closable?: boolean;
    backdrop?: boolean;
    animation?: boolean;
  };
}

export interface ModalState {
  isOpen: boolean;
  config: ModalConfig | null;
  history: ModalConfig[];
}

// context/ModalContext.tsx
import { createContext, useContext, useReducer, ReactNode } from 'react';

interface ModalContextType {
  state: ModalState;
  openModal: (config: ModalConfig) => void;
  closeModal: () => void;
  closeAllModals: () => void;
  goBack: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within ModalProvider');
  }
  return context;
}

function modalReducer(state: ModalState, action: any): ModalState {
  switch (action.type) {
    case 'OPEN_MODAL':
      return {
        isOpen: true,
        config: action.config,
        history: [...state.history, action.config],
      };
    case 'CLOSE_MODAL':
      return {
        isOpen: false,
        config: null,
        history: [],
      };
    case 'GO_BACK':
      const newHistory = state.history.slice(0, -1);
      const prevConfig = newHistory[newHistory.length - 1] || null;
      return {
        isOpen: !!prevConfig,
        config: prevConfig,
        history: newHistory,
      };
    default:
      return state;
  }
}

export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(modalReducer, {
    isOpen: false,
    config: null,
    history: [],
  });

  const openModal = (config: ModalConfig) => {
    dispatch({ type: 'OPEN_MODAL', config });
  };

  const closeModal = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const closeAllModals = () => {
    dispatch({ type: 'CLOSE_MODAL' });
  };

  const goBack = () => {
    dispatch({ type: 'GO_BACK' });
  };

  return (
    <ModalContext.Provider value={{ state, openModal, closeModal, closeAllModals, goBack }}>
      {children}
    </ModalContext.Provider>
  );
}
```

### 7.2 模态框注册系统
```typescript
// components/modals/ModalRegistry.tsx
import { lazy, Suspense } from 'react';
import { useModal } from '@/context/ModalContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// 动态导入所有模态框组件
const modalComponents = {
  'transaction': lazy(() => import('@/components/transactions/transaction-modal')),
  'book': lazy(() => import('@/components/books/book-modal')),
  'category': lazy(() => import('@/components/categories/category-modal')),
  'budget': lazy(() => import('@/components/budgets/budget-modal')),
  // 添加更多模态框类型...
};

export default function ModalRegistry() {
  const { state, closeModal } = useModal();

  if (!state.isOpen || !state.config) {
    return null;
  }

  const { type, id, data, options } = state.config;
  const ModalComponent = modalComponents[type as keyof typeof modalComponents];

  if (!ModalComponent) {
    console.error(`Modal component not found for type: ${type}`);
    return null;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ModalComponent
        isOpen={state.isOpen}
        onClose={closeModal}
        entityId={id}
        initialData={data}
        options={options}
      />
    </Suspense>
  );
}
```

### 7.3 统一调用接口
```typescript
// hooks/useEntityNavigation.ts
import { useRouter } from 'next/navigation';
import { useModal } from '@/context/ModalContext';

export function useEntityNavigation() {
  const router = useRouter();
  const { openModal } = useModal();

  const navigateToEntity = (
    entityType: string,
    entityId: string,
    data?: any,
    options?: {
      forceModal?: boolean;
      forceRoute?: boolean;
    }
  ) => {
    const isCapacitor = typeof window !== 'undefined' &&
      (window as any).Capacitor?.isNativePlatform();
    const isMobile = typeof window !== 'undefined' &&
      window.innerWidth <= 768;

    // 强制使用模态框
    if (options?.forceModal) {
      openModal({ type: entityType, id: entityId, data });
      return;
    }

    // 强制使用路由
    if (options?.forceRoute) {
      router.push(`/${entityType}/${entityId}`);
      return;
    }

    // 平台自动判断
    if (isCapacitor) {
      // Capacitor 使用完整URL
      const url = `capacitor://localhost/${entityType}/${entityId}.html`;
      window.location.href = url;
    } else if (isMobile) {
      // 移动端Web使用模态框
      openModal({ type: entityType, id: entityId, data });
    } else {
      // 桌面端使用路由
      router.push(`/${entityType}/${entityId}`);
    }
  };

  return { navigateToEntity };
}
```

### 7.4 页面级调用示例
```typescript
// 在列表页面中调用模态框
// pages/transactions/index.tsx
import { useEntityNavigation } from '@/hooks/useEntityNavigation';

export default function TransactionsPage() {
  const { navigateToEntity } = useEntityNavigation();

  const handleTransactionClick = (transactionId: string, transactionData?: any) => {
    navigateToEntity('transaction', transactionId, transactionData);
  };

  const handleEditTransaction = (transactionId: string) => {
    // 强制使用模态框进行编辑
    navigateToEntity('transaction', transactionId, null, { forceModal: true });
  };

  return (
    <div className="transactions-page">
      {transactions.map(transaction => (
        <div
          key={transaction.id}
          onClick={() => handleTransactionClick(transaction.id, transaction)}
          className="transaction-item"
        >
          {/* 记账项内容 */}
        </div>
      ))}
    </div>
  );
}
```

### 7.5 组件级调用示例
```typescript
// 在组件中调用模态框
// components/TransactionCard.tsx
import { useModal } from '@/context/ModalContext';

interface TransactionCardProps {
  transaction: Transaction;
}

export default function TransactionCard({ transaction }: TransactionCardProps) {
  const { openModal } = useModal();

  const handleEdit = () => {
    openModal({
      type: 'transaction',
      id: transaction.id,
      data: transaction,
      options: {
        closable: true,
        backdrop: true,
      }
    });
  };

  const handleViewCategory = () => {
    openModal({
      type: 'category',
      id: transaction.categoryId,
      data: { fromTransaction: transaction.id }
    });
  };

  return (
    <div className="transaction-card">
      {/* 卡片内容 */}
      <button onClick={handleEdit}>编辑</button>
      <button onClick={handleViewCategory}>查看分类</button>
    </div>
  );
}
```

### 7.6 模态框链式调用
```typescript
// 支持模态框之间的导航
// components/transactions/transaction-modal.tsx
import { useModal } from '@/context/ModalContext';

export default function TransactionModal({ isOpen, onClose, entityId }: TransactionModalProps) {
  const { openModal, goBack } = useModal();

  const handleEditCategory = (categoryId: string) => {
    // 打开分类编辑模态框，保持当前模态框在历史中
    openModal({
      type: 'category',
      id: categoryId,
      data: { returnTo: 'transaction', returnId: entityId }
    });
  };

  const handleEditBudget = (budgetId: string) => {
    openModal({
      type: 'budget',
      id: budgetId,
      data: { fromTransaction: entityId }
    });
  };

  return (
    <div className="transaction-modal">
      {/* 模态框内容 */}
      <button onClick={() => handleEditCategory(transaction.categoryId)}>
        编辑分类
      </button>
      <button onClick={() => handleEditBudget(transaction.budgetId)}>
        编辑预算
      </button>
      <button onClick={goBack}>返回上一级</button>
    </div>
  );
}
```

## 8. 模态框生命周期管理

### 8.1 模态框生命周期钩子
```typescript
// hooks/useModalLifecycle.ts
import { useEffect, useCallback } from 'react';
import { useModal } from '@/context/ModalContext';

interface ModalLifecycleOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onDataChange?: (data: any) => void;
  preventClose?: () => boolean;
}

export function useModalLifecycle(
  modalType: string,
  options: ModalLifecycleOptions = {}
) {
  const { state, closeModal } = useModal();
  const isCurrentModal = state.config?.type === modalType;

  // 模态框打开时的回调
  useEffect(() => {
    if (isCurrentModal && state.isOpen && options.onOpen) {
      options.onOpen();
    }
  }, [isCurrentModal, state.isOpen, options.onOpen]);

  // 模态框关闭时的回调
  useEffect(() => {
    if (!state.isOpen && options.onClose) {
      options.onClose();
    }
  }, [state.isOpen, options.onClose]);

  // 数据变化时的回调
  useEffect(() => {
    if (isCurrentModal && state.config?.data && options.onDataChange) {
      options.onDataChange(state.config.data);
    }
  }, [isCurrentModal, state.config?.data, options.onDataChange]);

  // 受控关闭
  const handleClose = useCallback(() => {
    if (options.preventClose && options.preventClose()) {
      return;
    }
    closeModal();
  }, [closeModal, options.preventClose]);

  return {
    isOpen: isCurrentModal && state.isOpen,
    data: state.config?.data,
    handleClose,
  };
}
```

### 8.2 模态框状态持久化
```typescript
// utils/modalPersistence.ts
const MODAL_STORAGE_KEY = 'app_modal_state';

export function saveModalState(state: ModalState) {
  try {
    localStorage.setItem(MODAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save modal state:', error);
  }
}

export function loadModalState(): ModalState | null {
  try {
    const saved = localStorage.getItem(MODAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load modal state:', error);
    return null;
  }
}

export function clearModalState() {
  try {
    localStorage.removeItem(MODAL_STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear modal state:', error);
  }
}

// 在ModalProvider中使用
export function ModalProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(modalReducer, {
    isOpen: false,
    config: null,
    history: [],
  });

  // 页面加载时恢复状态
  useEffect(() => {
    const savedState = loadModalState();
    if (savedState && savedState.isOpen) {
      dispatch({ type: 'RESTORE_STATE', state: savedState });
    }
  }, []);

  // 状态变化时保存
  useEffect(() => {
    if (state.isOpen) {
      saveModalState(state);
    } else {
      clearModalState();
    }
  }, [state]);

  // ... 其他代码
}
```

### 8.3 模态框权限控制
```typescript
// utils/modalPermissions.ts
interface ModalPermission {
  type: string;
  action: 'view' | 'edit' | 'create' | 'delete';
  requiredRole?: string[];
  customCheck?: (user: User, data?: any) => boolean;
}

export function checkModalPermission(
  permission: ModalPermission,
  user: User,
  data?: any
): boolean {
  // 角色检查
  if (permission.requiredRole && permission.requiredRole.length > 0) {
    if (!permission.requiredRole.includes(user.role)) {
      return false;
    }
  }

  // 自定义检查
  if (permission.customCheck) {
    return permission.customCheck(user, data);
  }

  return true;
}

// 在导航钩子中使用权限检查
export function useEntityNavigation() {
  const { openModal } = useModal();
  const { user } = useAuth();

  const navigateToEntity = (
    entityType: string,
    entityId: string,
    action: 'view' | 'edit' = 'view',
    data?: any
  ) => {
    // 权限检查
    const hasPermission = checkModalPermission(
      { type: entityType, action },
      user,
      data
    );

    if (!hasPermission) {
      // 显示权限错误或跳转到登录页
      showPermissionError();
      return;
    }

    // 正常导航逻辑...
    openModal({ type: entityType, id: entityId, data });
  };

  return { navigateToEntity };
}
```

## 9. 调用规范最佳实践

### 9.1 调用优先级规则
```typescript
// 调用优先级：权限 > 平台检测 > 用户偏好 > 默认行为

export function getNavigationStrategy(
  entityType: string,
  user: User,
  device: DeviceInfo
): 'modal' | 'route' | 'external' {
  // 1. 权限检查
  if (!hasViewPermission(entityType, user)) {
    return 'external'; // 跳转到登录或错误页
  }

  // 2. 平台检测
  if (device.isCapacitor) {
    return 'route'; // Capacitor使用路由
  }

  // 3. 用户偏好
  const userPreference = getUserNavigationPreference(user.id);
  if (userPreference) {
    return userPreference;
  }

  // 4. 默认行为
  return device.isMobile ? 'modal' : 'route';
}
```

### 9.2 错误处理和回退机制
```typescript
// hooks/useRobustNavigation.ts
export function useRobustNavigation() {
  const { openModal } = useModal();
  const router = useRouter();

  const navigateWithFallback = async (
    entityType: string,
    entityId: string,
    data?: any
  ) => {
    try {
      // 首选方案：模态框
      openModal({ type: entityType, id: entityId, data });
    } catch (modalError) {
      console.warn('Modal navigation failed, falling back to route:', modalError);

      try {
        // 回退方案：路由导航
        router.push(`/${entityType}/${entityId}`);
      } catch (routeError) {
        console.error('All navigation methods failed:', routeError);

        // 最终回退：显示错误信息
        showNavigationError(entityType, entityId);
      }
    }
  };

  return { navigateWithFallback };
}
```

### 9.3 性能优化策略
```typescript
// 模态框预加载策略
export function useModalPreloading() {
  const [preloadedModals, setPreloadedModals] = useState<Set<string>>(new Set());

  const preloadModal = useCallback((modalType: string) => {
    if (!preloadedModals.has(modalType)) {
      // 动态导入模态框组件
      import(`@/components/${modalType}/${modalType}-modal`)
        .then(() => {
          setPreloadedModals(prev => new Set([...prev, modalType]));
        })
        .catch(error => {
          console.warn(`Failed to preload modal ${modalType}:`, error);
        });
    }
  }, [preloadedModals]);

  // 预加载常用模态框
  useEffect(() => {
    const commonModals = ['transaction', 'category', 'budget'];
    commonModals.forEach(preloadModal);
  }, [preloadModal]);

  return { preloadModal, isPreloaded: (type: string) => preloadedModals.has(type) };
}
```

### 9.4 调用统计和分析
```typescript
// utils/modalAnalytics.ts
interface ModalUsageEvent {
  type: string;
  action: 'open' | 'close' | 'navigate';
  timestamp: number;
  source: string;
  duration?: number;
}

class ModalAnalytics {
  private events: ModalUsageEvent[] = [];
  private openTime: Map<string, number> = new Map();

  trackModalOpen(type: string, source: string) {
    const timestamp = Date.now();
    this.openTime.set(type, timestamp);

    this.events.push({
      type,
      action: 'open',
      timestamp,
      source,
    });
  }

  trackModalClose(type: string) {
    const timestamp = Date.now();
    const openTime = this.openTime.get(type);
    const duration = openTime ? timestamp - openTime : undefined;

    this.events.push({
      type,
      action: 'close',
      timestamp,
      source: 'user',
      duration,
    });

    this.openTime.delete(type);
  }

  getUsageStats() {
    return {
      totalOpens: this.events.filter(e => e.action === 'open').length,
      averageDuration: this.calculateAverageDuration(),
      mostUsedModals: this.getMostUsedModals(),
      usageBySource: this.getUsageBySource(),
    };
  }

  private calculateAverageDuration(): number {
    const durationsEvents = this.events.filter(e => e.duration);
    if (durationsEvents.length === 0) return 0;

    const totalDuration = durationsEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    return totalDuration / durationsEvents.length;
  }

  private getMostUsedModals(): Array<{ type: string; count: number }> {
    const counts = new Map<string, number>();

    this.events
      .filter(e => e.action === 'open')
      .forEach(e => {
        counts.set(e.type, (counts.get(e.type) || 0) + 1);
      });

    return Array.from(counts.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  private getUsageBySource(): Record<string, number> {
    const sources: Record<string, number> = {};

    this.events
      .filter(e => e.action === 'open')
      .forEach(e => {
        sources[e.source] = (sources[e.source] || 0) + 1;
      });

    return sources;
  }
}

export const modalAnalytics = new ModalAnalytics();

// 在ModalProvider中集成分析
export function ModalProvider({ children }: { children: ReactNode }) {
  // ... 其他代码

  const openModal = (config: ModalConfig, source: string = 'unknown') => {
    modalAnalytics.trackModalOpen(config.type, source);
    dispatch({ type: 'OPEN_MODAL', config });
  };

  const closeModal = () => {
    if (state.config) {
      modalAnalytics.trackModalClose(state.config.type);
    }
    dispatch({ type: 'CLOSE_MODAL' });
  };

  // ... 其他代码
}
```

## 10. 错误处理规范

### 10.1 统一错误组件
```typescript
// 错误显示组件
function ErrorDisplay({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div className="error-container">
      <i className="fas fa-exclamation-triangle" />
      <div className="error-message">{error}</div>
      {onRetry && (
        <button onClick={onRetry} className="retry-button">
          重试
        </button>
      )}
    </div>
  );
}
```

### 10.2 加载状态组件
```typescript
// 加载状态组件
function LoadingSpinner({ message = '加载中...' }: { message?: string }) {
  return (
    <div className="loading-container">
      <div className="spinner" />
      <div className="loading-message">{message}</div>
    </div>
  );
}
```

## 11. 平台特定规范

### 11.1 iOS Capacitor 兼容性
```typescript
// Pages Router 兼容页面
// pages/[entity]/[id].tsx
import { GetServerSideProps } from 'next';

interface PageProps {
  entityData: EntityData;
  entityId: string;
}

export default function EntityPage({ entityData, entityId }: PageProps) {
  // 检测Capacitor环境
  const isCapacitor = typeof window !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform();

  if (isCapacitor) {
    // Capacitor环境下的特殊处理
    return <EntityCapacitorView data={entityData} id={entityId} />;
  }

  // 标准Web环境
  return <EntityStandardView data={entityData} id={entityId} />;
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const entityId = params?.id as string;
  const entityData = await fetchEntityData(entityId);

  return {
    props: {
      entityData,
      entityId,
    },
  };
};
```

### 11.2 URL 路由处理
```typescript
// Capacitor URL 格式处理
function getCapacitorUrl(entityType: string, id: string): string {
  return `capacitor://localhost/${entityType}/${id}.html`;
}

// 跨平台导航函数
function navigateToEntity(id: string, entityType: string) {
  const isCapacitor = (window as any).Capacitor?.isNativePlatform();

  if (isCapacitor) {
    // Capacitor 使用完整URL格式
    const url = getCapacitorUrl(entityType, id);
    window.location.href = url;
  } else {
    // Web 使用模态框或路由
    if (isMobileWeb()) {
      openModal(entityType, id);
    } else {
      router.push(`/${entityType}/${id}`);
    }
  }
}
```

## 12. 性能优化规范

### 12.1 代码分割
```typescript
// 动态导入模态框组件
const EntityModal = dynamic(() => import('@/components/entity/entity-modal'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // 模态框不需要SSR
});

// 条件加载
function EntityContainer() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      {/* 主要内容 */}
      {showModal && (
        <EntityModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
```

### 12.2 数据缓存
```typescript
// SWR 数据缓存策略
function useEntityData(id: string) {
  const { data, error, mutate } = useSWR(
    id ? `/api/entities/${id}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1分钟去重
    }
  );

  return {
    data,
    loading: !error && !data,
    error,
    refresh: mutate,
  };
}
```

## 13. 测试规范

### 13.1 单元测试
```typescript
// 模态框组件测试
describe('EntityModal', () => {
  it('should render when open', () => {
    render(
      <EntityModal
        isOpen={true}
        onClose={jest.fn()}
        entityId="test-id"
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('should call onClose when close button clicked', () => {
    const onClose = jest.fn();
    render(
      <EntityModal
        isOpen={true}
        onClose={onClose}
        entityId="test-id"
      />
    );

    fireEvent.click(screen.getByLabelText('关闭'));
    expect(onClose).toHaveBeenCalled();
  });
});
```

### 13.2 E2E 测试
```typescript
// Playwright 跨平台测试
test('entity modal navigation', async ({ page }) => {
  await page.goto('/');

  // 点击实体项目
  await page.click('[data-testid="entity-item-1"]');

  // 验证模态框打开
  await expect(page.locator('[data-testid="entity-modal"]')).toBeVisible();

  // 验证内容加载
  await expect(page.locator('[data-testid="entity-content"]')).toBeVisible();

  // 关闭模态框
  await page.click('[data-testid="close-button"]');
  await expect(page.locator('[data-testid="entity-modal"]')).not.toBeVisible();
});
```

## 14. 开发工作流

### 14.1 新建动态页面步骤
1. **创建动态路由页面**
   ```bash
   mkdir -p src/app/[entity]/[id]
   touch src/app/[entity]/[id]/page.tsx
   ```

2. **创建模态框组件**
   ```bash
   mkdir -p src/components/[entity]
   touch src/components/[entity]/[entity]-modal.tsx
   ```

3. **创建 Pages Router 兼容页面**
   ```bash
   mkdir -p src/pages/[entity]
   touch src/pages/[entity]/[id].tsx
   ```

4. **实现数据获取逻辑**
   - 服务端API路由
   - 客户端数据钩子
   - 错误处理

5. **添加导航集成**
   - 更新导航组件
   - 添加模态框状态管理
   - 实现平台检测逻辑

### 14.2 代码审查清单
- [ ] 动态路由页面支持SSR
- [ ] 模态框组件支持客户端渲染
- [ ] Pages Router页面兼容Capacitor
- [ ] 样式符合移动端规范
- [ ] 错误处理完整
- [ ] 加载状态友好
- [ ] 性能优化到位
- [ ] 测试覆盖充分

## 15. 维护指南

### 15.1 版本迁移
- 保持向后兼容性
- 渐进式功能迁移
- 充分测试验证

### 15.2 性能监控
- 页面加载时间
- 模态框打开速度
- 内存使用情况
- 用户交互响应

### 15.3 问题排查
- 检查平台检测逻辑
- 验证URL路由配置
- 确认数据获取状态
- 测试跨平台兼容性

---

## 附录：常用代码模板

### A.1 基础模态框模板
```typescript
// components/[entity]/[entity]-modal.tsx
import { useState, useEffect } from 'react';

interface EntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityId: string;
}

export default function EntityModal({ isOpen, onClose, entityId }: EntityModalProps) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && entityId) {
      fetchData();
    }
  }, [isOpen, entityId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/entities/${entityId}`);
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'var(--background-color)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 头部 */}
      <div className="header">
        <button onClick={onClose}>
          <i className="fas fa-arrow-left"></i>
        </button>
        <div className="header-title">实体详情</div>
        <div style={{ width: '32px' }}></div>
      </div>

      {/* 内容 */}
      <div className="main-content">
        {loading && <LoadingSpinner />}
        {error && <ErrorDisplay error={error} onRetry={fetchData} />}
        {data && (
          <div style={{ padding: '0 20px' }}>
            {/* 实体内容 */}
          </div>
        )}
      </div>

      {/* 底部按钮 */}
      <div className="bottom-button-container">
        <button className="bottom-button">
          操作按钮
        </button>
      </div>
    </div>
  );
}
```

### A.2 基础动态路由模板
```typescript
// app/[entity]/[id]/page.tsx
import { Metadata } from 'next';
import { notFound } from 'next/navigation';

interface PageProps {
  params: { id: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await fetchEntityData(params.id);

  if (!data) {
    return {
      title: '页面未找到',
    };
  }

  return {
    title: `${data.name} - 实体详情`,
    description: data.description,
  };
}

async function fetchEntityData(id: string) {
  try {
    const response = await fetch(`${process.env.API_BASE_URL}/api/entities/${id}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching entity data:', error);
    return null;
  }
}

export default async function EntityDetailPage({ params }: PageProps) {
  const data = await fetchEntityData(params.id);

  if (!data) {
    notFound();
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>{data.name}</h1>
      </div>

      <div className="page-content">
        {/* 页面内容 */}
      </div>
    </div>
  );
}
```

### A.3 Pages Router 兼容模板
```typescript
// pages/[entity]/[id].tsx
import { GetServerSideProps } from 'next';

interface PageProps {
  entityData: EntityData;
  entityId: string;
  error?: string;
}

export default function EntityPage({ entityData, entityId, error }: PageProps) {
  if (error) {
    return <div>错误: {error}</div>;
  }

  return (
    <div className="capacitor-page">
      {/* Capacitor 兼容的页面内容 */}
      <div className="page-header">
        <h1>{entityData.name}</h1>
      </div>

      <div className="page-content">
        {/* 实体内容 */}
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  try {
    const entityId = params?.id as string;

    if (!entityId) {
      return { notFound: true };
    }

    const response = await fetch(`${process.env.API_BASE_URL}/api/entities/${entityId}`);

    if (!response.ok) {
      return { notFound: true };
    }

    const entityData = await response.json();

    return {
      props: {
        entityData,
        entityId,
      },
    };
  } catch (error) {
    return {
      props: {
        entityId: params?.id as string,
        error: '数据加载失败',
      },
    };
  }
};
```

### A.4 导航集成模板
```typescript
// hooks/useEntityNavigation.ts
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function useEntityNavigation() {
  const router = useRouter();
  const [modalState, setModalState] = useState({
    isOpen: false,
    entityType: '',
    entityId: '',
  });

  const navigateToEntity = (entityType: string, entityId: string) => {
    const isCapacitor = typeof window !== 'undefined' &&
      (window as any).Capacitor?.isNativePlatform();
    const isMobile = typeof window !== 'undefined' &&
      window.innerWidth <= 768;

    if (isCapacitor) {
      // Capacitor 使用完整URL
      const url = `capacitor://localhost/${entityType}/${entityId}.html`;
      window.location.href = url;
    } else if (isMobile) {
      // 移动端Web使用模态框
      setModalState({
        isOpen: true,
        entityType,
        entityId,
      });
    } else {
      // 桌面端使用路由
      router.push(`/${entityType}/${entityId}`);
    }
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      entityType: '',
      entityId: '',
    });
  };

  return {
    modalState,
    navigateToEntity,
    closeModal,
  };
}
```

---

## 总结

本规范文档提供了完整的动态页面开发标准，包括：

1. **双重实现策略** - 动态路由页面 + 全屏模态框
2. **跨平台兼容** - Web、iOS、Android统一体验
3. **模态框调用管理** - 全局状态管理、权限控制、生命周期管理
4. **性能优化** - 代码分割、数据缓存、懒加载、预加载策略
5. **开发工作流** - 标准化的开发步骤和审查清单
6. **代码模板** - 可复用的基础模板和最佳实践

### 模态框调用管理核心特性：

✅ **统一调用接口** - 通过 `useEntityNavigation` 钩子统一管理所有模态框调用
✅ **全局状态管理** - 使用 Context API 管理模态框状态和历史记录
✅ **动态组件注册** - 通过 `ModalRegistry` 实现模态框组件的动态加载
✅ **权限控制** - 内置权限检查机制，确保安全访问
✅ **生命周期管理** - 完整的打开、关闭、数据变化生命周期钩子
✅ **链式调用支持** - 支持模态框之间的导航和返回
✅ **状态持久化** - 支持页面刷新后恢复模态框状态
✅ **性能优化** - 预加载、懒加载、代码分割
✅ **使用统计** - 内置分析功能，监控模态框使用情况
✅ **错误处理** - 完善的错误处理和回退机制

遵循本规范可以确保：
- 代码一致性和可维护性
- 跨平台兼容性
- 良好的用户体验
- 高效的开发流程
- 统一的模态框调用管理
- 可扩展的架构设计

---

*本规范文档版本：v1.0*
*最后更新：2024年*
*适用项目：只为记账应用*
