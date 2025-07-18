/**
 * 录音状态管理类型定义
 */

// 录音状态枚举
export enum RecordingState {
  // 空闲状态 - 未开始录音
  IDLE = 'idle',
  // 准备中 - 正在请求权限和初始化设备
  PREPARING = 'preparing',
  // 录音中 - 正在录音
  RECORDING = 'recording',
  // 处理中 - 录音结束，正在处理音频
  PROCESSING = 'processing',
  // 完成 - 录音处理完成
  COMPLETED = 'completed',
  // 错误 - 录音过程中出现错误
  ERROR = 'error',
  // 取消 - 用户取消录音
  CANCELLED = 'cancelled'
}

// 录音状态转换映射
export const RECORDING_STATE_TRANSITIONS: Record<RecordingState, RecordingState[]> = {
  [RecordingState.IDLE]: [RecordingState.PREPARING],
  [RecordingState.PREPARING]: [RecordingState.RECORDING, RecordingState.ERROR, RecordingState.CANCELLED],
  [RecordingState.RECORDING]: [RecordingState.PROCESSING, RecordingState.CANCELLED, RecordingState.ERROR],
  [RecordingState.PROCESSING]: [RecordingState.COMPLETED, RecordingState.ERROR],
  [RecordingState.COMPLETED]: [RecordingState.IDLE],
  [RecordingState.ERROR]: [RecordingState.IDLE],
  [RecordingState.CANCELLED]: [RecordingState.IDLE]
};

// 录音状态显示文本
export const RECORDING_STATE_LABELS: Record<RecordingState, string> = {
  [RecordingState.IDLE]: '点击开始录音',
  [RecordingState.PREPARING]: '准备中...',
  [RecordingState.RECORDING]: '正在录音',
  [RecordingState.PROCESSING]: '处理中...',
  [RecordingState.COMPLETED]: '录音完成',
  [RecordingState.ERROR]: '录音失败',
  [RecordingState.CANCELLED]: '已取消'
};

// 录音状态图标
export const RECORDING_STATE_ICONS: Record<RecordingState, string> = {
  [RecordingState.IDLE]: 'fas fa-microphone',
  [RecordingState.PREPARING]: 'fas fa-spinner fa-spin',
  [RecordingState.RECORDING]: 'fas fa-stop',
  [RecordingState.PROCESSING]: 'fas fa-spinner fa-spin',
  [RecordingState.COMPLETED]: 'fas fa-check',
  [RecordingState.ERROR]: 'fas fa-exclamation-triangle',
  [RecordingState.CANCELLED]: 'fas fa-times'
};

// 录音状态颜色
export const RECORDING_STATE_COLORS: Record<RecordingState, string> = {
  [RecordingState.IDLE]: 'var(--warning-color, #f59e0b)',
  [RecordingState.PREPARING]: 'var(--info-color, #3b82f6)',
  [RecordingState.RECORDING]: 'var(--error-color, #ef4444)',
  [RecordingState.PROCESSING]: 'var(--info-color, #3b82f6)',
  [RecordingState.COMPLETED]: 'var(--success-color, #10b981)',
  [RecordingState.ERROR]: 'var(--error-color, #ef4444)',
  [RecordingState.CANCELLED]: 'var(--gray-color, #6b7280)'
};

// 录音错误类型
export enum RecordingErrorType {
  PERMISSION_DENIED = 'permission_denied',
  DEVICE_NOT_FOUND = 'device_not_found',
  DEVICE_BUSY = 'device_busy',
  INITIALIZATION_FAILED = 'initialization_failed',
  RECORDING_FAILED = 'recording_failed',
  PROCESSING_FAILED = 'processing_failed',
  NETWORK_ERROR = 'network_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// 录音错误信息
export const RECORDING_ERROR_MESSAGES: Record<RecordingErrorType, string> = {
  [RecordingErrorType.PERMISSION_DENIED]: '麦克风权限被拒绝，请在设置中允许访问麦克风',
  [RecordingErrorType.DEVICE_NOT_FOUND]: '未找到可用的麦克风设备',
  [RecordingErrorType.DEVICE_BUSY]: '麦克风设备正在被其他应用使用',
  [RecordingErrorType.INITIALIZATION_FAILED]: '录音设备初始化失败',
  [RecordingErrorType.RECORDING_FAILED]: '录音过程中发生错误',
  [RecordingErrorType.PROCESSING_FAILED]: '音频处理失败',
  [RecordingErrorType.NETWORK_ERROR]: '网络连接错误，请检查网络设置',
  [RecordingErrorType.UNKNOWN_ERROR]: '发生未知错误，请重试'
};

// 录音状态数据接口
export interface RecordingStateData {
  state: RecordingState;
  error?: {
    type: RecordingErrorType;
    message: string;
    details?: any;
  };
  progress?: number; // 0-100，用于显示进度
  duration?: number; // 录音时长（毫秒）
  audioLevel?: number; // 音频电平 0-100
}

// 录音状态管理器接口
export interface RecordingStateManager {
  // 当前状态
  currentState: RecordingState;
  // 状态数据
  stateData: RecordingStateData;
  // 状态转换
  transition(newState: RecordingState, data?: Partial<RecordingStateData>): boolean;
  // 设置错误
  setError(errorType: RecordingErrorType, details?: any): void;
  // 重置状态
  reset(): void;
  // 状态变化监听
  onStateChange(callback: (state: RecordingStateData) => void): () => void;
}

/**
 * 录音状态管理器实现
 */
export class RecordingStateManagerImpl implements RecordingStateManager {
  private _currentState: RecordingState = RecordingState.IDLE;
  private _stateData: RecordingStateData;
  private _listeners: Set<(state: RecordingStateData) => void> = new Set();

  constructor() {
    this._stateData = {
      state: RecordingState.IDLE,
      progress: 0,
      duration: 0,
      audioLevel: 0
    };
  }

  get currentState(): RecordingState {
    return this._currentState;
  }

  get stateData(): RecordingStateData {
    return { ...this._stateData };
  }

  transition(newState: RecordingState, data?: Partial<RecordingStateData>): boolean {
    // 检查状态转换是否有效
    const allowedTransitions = RECORDING_STATE_TRANSITIONS[this._currentState];
    if (!allowedTransitions.includes(newState)) {
      console.warn(`🎤 [RecordingState] 无效的状态转换: ${this._currentState} -> ${newState}`);
      return false;
    }

    console.log(`🎤 [RecordingState] 状态转换: ${this._currentState} -> ${newState}`);

    // 更新状态
    this._currentState = newState;
    this._stateData = {
      ...this._stateData,
      state: newState,
      ...data
    };

    // 清除错误（除非新状态是错误状态）
    if (newState !== RecordingState.ERROR) {
      delete this._stateData.error;
    }

    // 通知监听器
    this._notifyListeners();

    return true;
  }

  setError(errorType: RecordingErrorType, details?: any): void {
    console.error(`🎤 [RecordingState] 设置错误: ${errorType}`, details);

    this._currentState = RecordingState.ERROR;
    this._stateData = {
      ...this._stateData,
      state: RecordingState.ERROR,
      error: {
        type: errorType,
        message: RECORDING_ERROR_MESSAGES[errorType],
        details
      }
    };

    this._notifyListeners();
  }

  reset(): void {
    console.log('🎤 [RecordingState] 重置状态');

    this._currentState = RecordingState.IDLE;
    this._stateData = {
      state: RecordingState.IDLE,
      progress: 0,
      duration: 0,
      audioLevel: 0
    };

    this._notifyListeners();
  }

  onStateChange(callback: (state: RecordingStateData) => void): () => void {
    this._listeners.add(callback);
    
    // 立即调用一次回调，传递当前状态
    callback(this.stateData);
    
    // 返回取消监听的函数
    return () => {
      this._listeners.delete(callback);
    };
  }

  private _notifyListeners(): void {
    this._listeners.forEach(listener => {
      try {
        listener(this.stateData);
      } catch (error) {
        console.error('🎤 [RecordingState] 状态监听器执行失败:', error);
      }
    });
  }
}

/**
 * 创建录音状态管理器实例
 */
export function createRecordingStateManager(): RecordingStateManager {
  return new RecordingStateManagerImpl();
}

/**
 * 检查状态是否可以开始录音
 */
export function canStartRecording(state: RecordingState): boolean {
  return state === RecordingState.IDLE;
}

/**
 * 检查状态是否正在录音
 */
export function isRecording(state: RecordingState): boolean {
  return state === RecordingState.RECORDING;
}

/**
 * 检查状态是否正在处理
 */
export function isProcessing(state: RecordingState): boolean {
  return state === RecordingState.PROCESSING || state === RecordingState.PREPARING;
}

/**
 * 检查状态是否为最终状态
 */
export function isFinalState(state: RecordingState): boolean {
  return [
    RecordingState.COMPLETED,
    RecordingState.ERROR,
    RecordingState.CANCELLED
  ].includes(state);
}
