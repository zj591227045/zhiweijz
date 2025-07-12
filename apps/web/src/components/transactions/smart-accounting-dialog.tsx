'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useDashboardStore } from '@/store/dashboard-store';
import '@/styles/smart-accounting-dialog.css';

interface SmartAccountingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountBookId?: string;
}

interface SmartAccountingResult {
  amount: number;
  type: 'EXPENSE' | 'INCOME';
  categoryId?: string;
  categoryName?: string;
  categoryIcon?: string;
  description?: string;
  date?: string;
}

// 全局进度通知管理器
class SmartAccountingProgressManager {
  private static instance: SmartAccountingProgressManager;
  private progressContainer: HTMLDivElement | null = null;
  private progressToasts: Map<string, HTMLDivElement> = new Map();
  private pendingRequests: Map<string, {
    accountBookId: string;
    description: string;
    timestamp: number;
    retryCount: number;
  }> = new Map();

  static getInstance(): SmartAccountingProgressManager {
    if (!SmartAccountingProgressManager.instance) {
      SmartAccountingProgressManager.instance = new SmartAccountingProgressManager();
    }
    return SmartAccountingProgressManager.instance;
  }

  constructor() {
    // 页面加载时检查是否有未完成的请求
    this.checkPendingRequests();
    
    // 监听页面可见性变化，处理用户切换回来的情况
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.checkPendingRequests();
        }
      });
    }
  }

  // 检查未完成的请求
  private checkPendingRequests() {
    if (typeof localStorage === 'undefined') return;

    try {
      const pendingRequestsData = localStorage.getItem('smart-accounting-pending');
      if (pendingRequestsData) {
        const requests = JSON.parse(pendingRequestsData);
        const currentTime = Date.now();
        
        // 检查5分钟内的未完成请求
        Object.keys(requests).forEach(progressId => {
          const request = requests[progressId];
          if (currentTime - request.timestamp < 5 * 60 * 1000) { // 5分钟内
            // 显示恢复状态的通知
            this.showProgress(progressId, '检测到未完成的记账请求，正在验证状态...', 'info');
            
            // 尝试验证请求状态
            this.verifyRequestStatus(progressId, request);
          } else {
            // 超过5分钟的请求视为失败
            delete requests[progressId];
          }
        });
        
        // 更新localStorage
        localStorage.setItem('smart-accounting-pending', JSON.stringify(requests));
      }
    } catch (error) {
      console.error('检查未完成请求时出错:', error);
    }
  }

  // 验证请求状态
  private async verifyRequestStatus(progressId: string, request: any) {
    try {
      // 这里可以调用一个状态检查API
      // 暂时使用超时后显示可能成功的消息
      setTimeout(() => {
        this.showProgress(progressId, '记账可能已完成，请刷新页面查看最新数据', 'success');
        this.removePendingRequest(progressId);
      }, 2000);
    } catch (error) {
      this.showProgress(progressId, '无法验证记账状态，请手动检查记录', 'error');
      this.removePendingRequest(progressId);
    }
  }

  // 保存待处理请求
  private savePendingRequest(progressId: string, accountBookId: string, description: string) {
    if (typeof localStorage === 'undefined') return;

    try {
      const pendingRequestsData = localStorage.getItem('smart-accounting-pending') || '{}';
      const requests = JSON.parse(pendingRequestsData);
      
      requests[progressId] = {
        accountBookId,
        description,
        timestamp: Date.now(),
        retryCount: 0
      };
      
      localStorage.setItem('smart-accounting-pending', JSON.stringify(requests));
    } catch (error) {
      console.error('保存待处理请求时出错:', error);
    }
  }

  // 移除待处理请求
  private removePendingRequest(progressId: string) {
    if (typeof localStorage === 'undefined') return;

    try {
      const pendingRequestsData = localStorage.getItem('smart-accounting-pending') || '{}';
      const requests = JSON.parse(pendingRequestsData);
      
      delete requests[progressId];
      
      localStorage.setItem('smart-accounting-pending', JSON.stringify(requests));
      this.pendingRequests.delete(progressId);
    } catch (error) {
      console.error('移除待处理请求时出错:', error);
    }
  }

  private createProgressContainer() {
    if (this.progressContainer || typeof document === 'undefined') return;

    this.progressContainer = document.createElement('div');
    this.progressContainer.id = 'smart-accounting-progress-container';
    this.progressContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      pointer-events: none;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    document.body.appendChild(this.progressContainer);
  }

  showProgress(id: string, message: string, type: 'info' | 'success' | 'error' = 'info'): void {
    if (typeof document === 'undefined') return;
    this.createProgressContainer();
    
    // 如果已经存在相同id的通知，更新它
    let progressToast = this.progressToasts.get(id);
    
    if (!progressToast) {
      progressToast = document.createElement('div');
      progressToast.style.cssText = `
        background: var(--card-background, #ffffff);
        border: 1px solid var(--border-color, #e5e7eb);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        pointer-events: auto;
        animation: slideInFromTop 0.3s ease-out;
        max-width: 400px;
        margin: 0 auto;
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        color: var(--text-primary, #1f2937);
      `;
      this.progressToasts.set(id, progressToast);
      this.progressContainer!.appendChild(progressToast);
    }

    const getIcon = () => {
      switch (type) {
        case 'success': return '✅';
        case 'error': return '❌';
        default: return '<div style="display: inline-block; animation: spin 1s linear infinite;">⏳</div>';
      }
    };

    const getColor = () => {
      switch (type) {
        case 'success': return 'var(--success-color, #22c55e)';
        case 'error': return 'var(--error-color, #ef4444)';
        default: return 'var(--primary-color, #3b82f6)';
      }
    };

    // 构建HTML内容
    const closeButtonId = `close-btn-${id}`;

    progressToast.innerHTML = `
      <div style="font-size: 18px;">${getIcon()}</div>
      <div style="flex: 1;">
        <div style="font-weight: 500; margin-bottom: 4px;">智能记账进度</div>
        <div style="color: var(--text-secondary, #6b7280);">${message}</div>
        ${type === 'info' ? `
          <div style="margin-top: 8px; height: 4px; background: var(--background-color, #f5f5f5); border-radius: 2px; overflow: hidden;">
            <div style="height: 100%; background: ${getColor()}; border-radius: 2px; width: 100%; animation: progressPulse 1.5s ease-in-out infinite;"></div>
          </div>
        ` : ''}
      </div>
      <div style="display: flex; align-items: center;">
        ${type !== 'info' ? `
          <button id="${closeButtonId}" style="
            background: none;
            border: none;
            color: var(--text-secondary, #6b7280);
            cursor: pointer;
            padding: 4px;
            border-radius: 4px;
            font-size: 18px;
            line-height: 1;
            transition: color 0.2s ease;
            margin-left: 8px;
          " onmouseover="this.style.color='var(--text-primary, #1f2937)'" onmouseout="this.style.color='var(--text-secondary, #6b7280)'">×</button>
        ` : ''}
      </div>
    `;

    // 添加关闭按钮事件监听器
    if (type !== 'info') {
      const closeButton = document.getElementById(closeButtonId);
      if (closeButton) {
        closeButton.addEventListener('click', () => {
          this.hideProgress(id);
        });
      }
    }

    // 添加样式
    if (!document.getElementById('smart-accounting-progress-styles')) {
      const style = document.createElement('style');
      style.id = 'smart-accounting-progress-styles';
      style.textContent = `
        @keyframes slideInFromTop {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        @keyframes slideOutToTop {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
        @keyframes progressPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    // 如果是成功或错误消息，延长显示时间
    if (type !== 'info') {
      setTimeout(() => {
        this.hideProgress(id);
      }, 4000); // 显示4秒
    }
  }

  hideProgress(id: string): void {
    if (typeof document === 'undefined') return;
    const progressToast = this.progressToasts.get(id);
    if (progressToast) {
      progressToast.style.animation = 'slideOutToTop 0.3s ease-out';
      setTimeout(() => {
        if (progressToast.parentNode) {
          progressToast.parentNode.removeChild(progressToast);
        }
        this.progressToasts.delete(id);
        
        // 移除待处理请求
        this.removePendingRequest(id);
        
        // 如果没有更多的通知，移除容器
        if (this.progressToasts.size === 0 && this.progressContainer) {
          this.progressContainer.remove();
          this.progressContainer = null;
        }
      }, 300);
    }
  }

  updateProgress(id: string, message: string): void {
    this.showProgress(id, message, 'info');
  }

  // 启动记账请求，保存到待处理列表
  startRequest(id: string, accountBookId: string, description: string): void {
    this.savePendingRequest(id, accountBookId, description);
    this.showProgress(id, '正在分析您的描述...', 'info');
  }

  // 完成记账请求
  completeRequest(id: string, success: boolean, message: string): void {
    this.removePendingRequest(id);
    this.showProgress(id, message, success ? 'success' : 'error');
  }


}

// 全局实例
const smartAccountingProgressManager = SmartAccountingProgressManager.getInstance();
// 只在客户端环境下将实例绑定到window对象
if (typeof window !== 'undefined') {
  (window as any).smartAccountingProgressManager = smartAccountingProgressManager;
}

export function SmartAccountingDialog({
  isOpen,
  onClose,
  accountBookId,
}: SmartAccountingDialogProps) {
  const router = useRouter();
  const { refreshDashboardData } = useDashboardStore();
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string | null>(null);
  const [isImageProcessing, setIsImageProcessing] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ startY: number; currentY: number; active: boolean }>({ startY: 0, currentY: 0, active: false });
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const [gestureType, setGestureType] = useState<'none' | 'capture' | 'upload'>('none');
  const [isButtonTouched, setIsButtonTouched] = useState(false);

  // 重置表单和禁用背景滚动
  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setIsProcessing(false);
      setProcessingStep(null);
      setIsImageProcessing(false);
      setDragPosition({ startY: 0, currentY: 0, active: false });
      setTouchStartPos(null);
      setGestureType('none');
      setIsButtonTouched(false);
      
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      // 禁用背景页面滚动 - 更强的方式
      const originalStyle = window.getComputedStyle(document.body);
      const originalOverflow = originalStyle.overflow;
      const originalPosition = originalStyle.position;
      const originalTop = originalStyle.top;
      const originalLeft = originalStyle.left;
      const originalWidth = originalStyle.width;
      const originalHeight = originalStyle.height;
      
      // 应用更强的滚动禁用样式
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = `-${scrollX}px`;
      document.body.style.width = '100vw';
      document.body.style.height = '100vh';
      
      // 添加 CSS 类以确保样式优先级
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
      
      // 同时禁用 html 元素的滚动
      const htmlElement = document.documentElement;
      const htmlOriginalOverflow = htmlElement.style.overflow;
      htmlElement.style.overflow = 'hidden';
      
      // 阻止所有滚动事件
      const preventScroll = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      const preventTouchMove = (e: TouchEvent) => {
        // 只阻止非模态框内的触摸移动
        const modalElement = document.querySelector('.smart-accounting-dialog');
        if (modalElement && !modalElement.contains(e.target as Node)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      const preventWheel = (e: WheelEvent) => {
        // 只阻止非模态框内的滚轮事件
        const modalElement = document.querySelector('.smart-accounting-dialog');
        if (modalElement && !modalElement.contains(e.target as Node)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      // 添加事件监听器
      document.addEventListener('scroll', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventTouchMove, { passive: false });
      document.addEventListener('wheel', preventWheel, { passive: false });
      window.addEventListener('scroll', preventScroll, { passive: false });
      
      return () => {
        // 移除事件监听器
        document.removeEventListener('scroll', preventScroll);
        document.removeEventListener('touchmove', preventTouchMove);
        document.removeEventListener('wheel', preventWheel);
        window.removeEventListener('scroll', preventScroll);
        
        // 移除 CSS 类
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
        
        // 恢复背景页面滚动
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.left = originalLeft;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        
        // 恢复 html 元素
        htmlElement.style.overflow = htmlOriginalOverflow;
        
        // 恢复滚动位置
        window.scrollTo(scrollX, scrollY);
      };
    }
  }, [isOpen]);

  // 处理智能识别
  const handleSmartAccounting = async () => {
    if (!description.trim()) {
      toast.error('请输入描述');
      return;
    }

    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingStep('正在分析您的描述...');

      // 延迟显示不同的处理步骤，提升用户体验
      setTimeout(() => setProcessingStep('正在识别交易类型和金额...'), 800);
      setTimeout(() => setProcessingStep('正在匹配最佳分类...'), 1600);
      setTimeout(() => setProcessingStep('正在生成交易详情...'), 2400);

      // 调用智能记账API，使用apiClient确保认证令牌被正确添加
      const response = await apiClient.post(
        `/ai/account/${accountBookId}/smart-accounting`,
        { description },
        { timeout: 60000 }, // 设置60秒超时，智能记账可能需要更长时间
      );

      console.log('智能记账结果:', response);

      if (response) {
        // 将结果存储到sessionStorage，供添加交易页面使用
        sessionStorage.setItem('smartAccountingResult', JSON.stringify(response));

        toast.success('智能识别成功');
        onClose();

        // 跳转到添加交易页面
        router.push('/transactions/new');
      } else {
        toast.error('智能识别失败，请手动填写');
      }
    } catch (error: any) {
      console.error('智能记账失败:', error);

      // 提供更详细的错误信息
      if (error.code === 'ECONNABORTED') {
        toast.error('请求超时，服务器处理时间过长，请稍后再试');
      } else if (error.response) {
        // 服务器返回了错误状态码
        const errorData = error.response.data;
        
        // 特殊处理Token限额错误（HTTP 429）
        if (error.response.status === 429 && errorData?.type === 'TOKEN_LIMIT_EXCEEDED') {
          // 关闭模态框
          onClose();
          
          // 生成唯一的进度ID
          const progressId = `smart-accounting-${Date.now()}`;
          
          // 使用与直接记账相同的浮窗通知
          const errorMessage = errorData.error || 'Token使用量已达限额，请稍后再试';
          smartAccountingProgressManager.completeRequest(progressId, false, errorMessage);
          return;
        }
        // 特殊处理"消息与记账无关"的情况
        else if (errorData?.info && errorData.info.includes('记账无关')) {
          toast.info('您的描述似乎与记账无关，请尝试描述具体的消费或收入情况');
        } else {
          toast.error(`识别失败: ${errorData?.error || errorData?.message || '服务器错误'}`);
        }
      } else if (error.request) {
        // 请求发送了但没有收到响应
        toast.error('未收到服务器响应，请检查网络连接');
      } else {
        // 其他错误
        toast.error('智能识别失败，请手动填写');
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep(null);
    }
  };

  // 处理直接添加记账 - 优化版本，使用顶部通知
  const handleDirectAdd = async () => {
    if (!description.trim()) {
      toast.error('请输入描述');
      return;
    }

    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    // 生成唯一的进度ID
    const progressId = `direct-add-${Date.now()}`;
    
    // 定时器数组，用于在错误时清除
    const progressTimers: NodeJS.Timeout[] = [];
    
    try {
      // 关闭模态框，让用户可以进行其他操作
      onClose();
      
      // 启动请求并保存到待处理列表
      smartAccountingProgressManager.startRequest(progressId, accountBookId, description);

      // 后台异步处理，不阻塞用户操作
      progressTimers.push(setTimeout(() => {
        smartAccountingProgressManager.updateProgress(progressId, '正在识别交易类型和金额...');
      }, 1000));
      
      progressTimers.push(setTimeout(() => {
        smartAccountingProgressManager.updateProgress(progressId, '正在匹配最佳分类...');
      }, 2000));
      
      progressTimers.push(setTimeout(() => {
        smartAccountingProgressManager.updateProgress(progressId, '正在创建交易记录...');
      }, 3000));

      // 调用直接添加记账API，使用apiClient确保认证令牌被正确添加
      const response = await apiClient.post(
        `/ai/account/${accountBookId}/smart-accounting/direct`,
        { description },
        { timeout: 60000 }, // 设置60秒超时
      );

      console.log('直接添加记账结果:', response);

      if (response && response.id) {
        console.log('记账成功，交易ID:', response.id);
        
        // 清除进度定时器（虽然可能已经执行完毕）
        progressTimers.forEach(timer => clearTimeout(timer));
        
        // 在后台刷新数据
        if (accountBookId) {
          try {
            console.log('开始刷新仪表盘数据...');
            await refreshDashboardData(accountBookId);
            console.log('仪表盘数据刷新完成');
          } catch (refreshError) {
            console.error('刷新仪表盘数据失败:', refreshError);
            // 即使刷新失败，也不影响用户体验
          }
        }

        // 完成请求，显示成功消息
        smartAccountingProgressManager.completeRequest(progressId, true, '记账完成，数据已更新');

      } else {
        // 清除进度定时器
        progressTimers.forEach(timer => clearTimeout(timer));
        smartAccountingProgressManager.completeRequest(progressId, false, '记账失败，请手动填写');
      }
    } catch (error: any) {
      console.error('直接添加记账失败:', error);

      // 清除所有进度定时器
      progressTimers.forEach(timer => clearTimeout(timer));

      // 显示错误通知，包含重试选项
      let errorMessage = '记账失败，请重试';
      let showRetry = true;
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，服务器可能仍在处理，请稍后检查记录';
        showRetry = false; // 超时情况下不提供重试，因为可能已经在处理
      } else if (error.response) {
        const errorData = error.response.data;
        
        // 特殊处理Token限额错误（HTTP 429）
        if (error.response.status === 429 && errorData?.type === 'TOKEN_LIMIT_EXCEEDED') {
          errorMessage = `${errorData.error || 'Token使用量已达限额，请稍后再试'}`;
          showRetry = false; // Token限额错误不提供重试
          smartAccountingProgressManager.completeRequest(progressId, false, errorMessage);
          return;
        }
        // 特殊处理"消息与记账无关"的情况  
        else if (errorData?.info && errorData.info.includes('记账无关')) {
          errorMessage = '您的描述似乎与记账无关，请尝试描述具体的消费或收入情况';
          // 对于无关内容，显示信息提示
          smartAccountingProgressManager.completeRequest(progressId, false, errorMessage);
          return;
        } else {
          errorMessage = `记账失败: ${errorData?.error || errorData?.message || '服务器错误'}`;
        }
      } else if (error.request) {
        errorMessage = '网络连接异常，请检查网络后重试';
      }
      
      smartAccountingProgressManager.completeRequest(progressId, false, errorMessage);
    }
  };

  // 处理图片记账
  const handleImageAccounting = async (file: File) => {
    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    // 生成唯一的进度ID
    const progressId = `image-accounting-${Date.now()}`;
    
    try {
      // 关闭模态框，让用户可以进行其他操作
      onClose();
      
      // 启动请求并保存到待处理列表
      smartAccountingProgressManager.startRequest(progressId, accountBookId, '正在分析图片...');

      // 创建FormData来上传文件
      const formData = new FormData();
      formData.append('image', file);

      // 调用图片识别API
      const response = await apiClient.post(
        `/ai/account/${accountBookId}/smart-accounting/image`,
        formData,
        { 
          timeout: 60000,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      console.log('图片记账结果:', response);

      if (response && response.id) {
        console.log('图片记账成功，交易ID:', response.id);
        
        // 在后台刷新数据
        if (accountBookId) {
          try {
            console.log('开始刷新仪表盘数据...');
            await refreshDashboardData(accountBookId);
            console.log('仪表盘数据刷新完成');
          } catch (refreshError) {
            console.error('刷新仪表盘数据失败:', refreshError);
          }
        }

        // 完成请求，显示成功消息
        smartAccountingProgressManager.completeRequest(progressId, true, '图片识别完成，记账成功');

      } else {
        smartAccountingProgressManager.completeRequest(progressId, false, '图片识别失败，请手动填写');
      }
    } catch (error: any) {
      console.error('图片记账失败:', error);

      // 显示错误通知
      let errorMessage = '图片识别失败，请重试';
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，服务器可能仍在处理，请稍后检查记录';
      } else if (error.response) {
        const errorData = error.response.data;
        
        // 特殊处理Token限额错误（HTTP 429）
        if (error.response.status === 429 && errorData?.type === 'TOKEN_LIMIT_EXCEEDED') {
          errorMessage = `${errorData.error || 'Token使用量已达限额，请稍后再试'}`;
          smartAccountingProgressManager.completeRequest(progressId, false, errorMessage);
          return;
        } else {
          errorMessage = `图片识别失败: ${errorData?.error || errorData?.message || '服务器错误'}`;
        }
      } else if (error.request) {
        errorMessage = '网络连接异常，请检查网络后重试';
      }
      
      smartAccountingProgressManager.completeRequest(progressId, false, errorMessage);
    }
  };

  // 处理相机拍照
  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // 使用后置摄像头
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageAccounting(file);
      }
    };
    input.click();
  };

  // 处理图片上传
  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        handleImageAccounting(file);
      }
    };
    input.click();
  };

  // 手势处理 - 参考语音按钮实现
  const handleCameraTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📷 [TouchStart] 相机按钮触摸开始');
    
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsButtonTouched(true);
    setGestureType('none');
    setDragPosition({ startY: touch.clientY, currentY: touch.clientY, active: true });
  };

  const handleCameraTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos || !isButtonTouched) return;
    e.preventDefault();
    
    const touch = e.touches[0];
    const deltaY = touchStartPos.y - touch.clientY;
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);
    
    setDragPosition(prev => ({ ...prev, currentY: touch.clientY }));
    
    // 检测手势类型
    if (Math.abs(deltaY) > 30 && deltaX < 50) { // 垂直滑动，水平偏移不超过50px
      if (deltaY > 50) {
        // 向上滑动 - 拍照
        setGestureType('capture');
      } else if (deltaY < -50) {
        // 向下滑动 - 上传
        setGestureType('upload');
      }
    } else {
      setGestureType('none');
    }
  };

  const handleCameraTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📷 [TouchEnd] 相机按钮触摸结束，手势类型:', gestureType);
    
    setIsButtonTouched(false);
    setDragPosition({ startY: 0, currentY: 0, active: false });
    
    // 根据手势类型执行对应操作
    if (gestureType === 'capture') {
      handleCameraCapture();
    } else if (gestureType === 'upload') {
      handleImageUpload();
    }
    // 如果是 'none'，则不执行任何操作（原地松开）
    
    // 重置状态
    setTouchStartPos(null);
    setGestureType('none');
  };

  // 鼠标事件处理（用于桌面端测试）
  const handleCameraMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📷 [MouseDown] 相机按钮鼠标按下');
    
    setTouchStartPos({ x: e.clientX, y: e.clientY });
    setIsButtonTouched(true);
    setGestureType('none');
    setDragPosition({ startY: e.clientY, currentY: e.clientY, active: true });
  };

  const handleCameraMouseMove = (e: React.MouseEvent) => {
    if (!touchStartPos || !isButtonTouched) return;
    e.preventDefault();
    
    const deltaY = touchStartPos.y - e.clientY;
    const deltaX = Math.abs(e.clientX - touchStartPos.x);
    
    setDragPosition(prev => ({ ...prev, currentY: e.clientY }));
    
    // 检测手势类型
    if (Math.abs(deltaY) > 30 && deltaX < 50) {
      if (deltaY > 50) {
        setGestureType('capture');
      } else if (deltaY < -50) {
        setGestureType('upload');
      }
    } else {
      setGestureType('none');
    }
  };

  const handleCameraMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📷 [MouseUp] 相机按钮鼠标抬起，手势类型:', gestureType);
    
    setIsButtonTouched(false);
    setDragPosition({ startY: 0, currentY: 0, active: false });
    
    // 根据手势类型执行对应操作
    if (gestureType === 'capture') {
      handleCameraCapture();
    } else if (gestureType === 'upload') {
      handleImageUpload();
    }
    
    // 重置状态
    setTouchStartPos(null);
    setGestureType('none');
  };

  const handleCameraMouseLeave = () => {
    console.log('📷 [MouseLeave] 鼠标离开相机按钮');
    // 鼠标离开时重置所有状态
    setIsButtonTouched(false);
    setDragPosition({ startY: 0, currentY: 0, active: false });
    setTouchStartPos(null);
    setGestureType('none');
  };

  // 处理手动记账
  const handleManualAccounting = () => {
    onClose();
    router.push('/transactions/new');
  };

  if (!isOpen) return null;

  // 处理点击空白处关闭弹窗
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="smart-accounting-dialog-overlay" 
      onClick={handleOverlayClick}
    >
      <div className="smart-accounting-dialog">
        <div className="smart-accounting-dialog-header">
          <h3 className="smart-accounting-dialog-title">智能记账</h3>
          <button className="smart-accounting-dialog-close" onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {isProcessing ? (
          <div className="smart-accounting-processing">
            <div className="smart-accounting-loading">
              <div className="spinner"></div>
            </div>
            <p className="smart-accounting-processing-text">{processingStep || '正在处理...'}</p>
          </div>
        ) : (
          <>
            <div className="smart-accounting-dialog-content">
              <p className="smart-accounting-dialog-subtitle">输入一句话，自动识别记账信息</p>
              <div className="smart-accounting-input-wrapper">
                <textarea
                  className="smart-accounting-textarea"
                  placeholder="例如：昨天在沃尔玛买了日用品，花了128.5元"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  autoFocus
                />
              </div>

              <div className="smart-accounting-buttons">
                <button
                  className="smart-accounting-button identify-button"
                  onClick={handleSmartAccounting}
                  disabled={isProcessing}
                >
                  智能识别
                </button>

                <button
                  className="smart-accounting-button direct-button"
                  onClick={handleDirectAdd}
                  disabled={!description.trim()}
                >
                  直接添加
                </button>

                <button
                  className={`smart-accounting-button camera-button ${isButtonTouched ? 'touched' : ''} ${gestureType !== 'none' ? 'gesture-active' : ''}`}
                  onTouchStart={handleCameraTouchStart}
                  onTouchMove={handleCameraTouchMove}
                  onTouchEnd={handleCameraTouchEnd}
                  onMouseDown={handleCameraMouseDown}
                  onMouseMove={handleCameraMouseMove}
                  onMouseUp={handleCameraMouseUp}
                  onMouseLeave={handleCameraMouseLeave}
                  disabled={isProcessing}
                  style={{
                    transform: isButtonTouched ? 'scale(1.05)' : 'scale(1)',
                    transition: isButtonTouched ? 'none' : 'all 0.2s ease',
                    backgroundColor: isButtonTouched ? 'var(--secondary-color-light, #8b5cf6)' : '',
                    boxShadow: isButtonTouched ? '0 0 0 4px rgba(139, 92, 246, 0.3)' : '',
                  }}
                >
                  <i className="fas fa-camera"></i>
                  <span className="camera-hint">
                    {isButtonTouched 
                      ? (gestureType === 'capture' ? '松开拍照' : gestureType === 'upload' ? '松开上传' : '上滑拍照 下滑上传')
                      : '按住滑动'
                    }
                  </span>
                </button>
              </div>

              <div className="smart-accounting-manual-wrapper">
                <button className="smart-accounting-manual-button" onClick={handleManualAccounting}>
                  手动记账
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// 导出进度管理器供其他组件使用
export { SmartAccountingProgressManager };
