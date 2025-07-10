/**
 * 多模态AI错误处理工具
 * 提供统一的错误处理和用户友好的错误消息
 */

import { toast } from 'sonner';

/**
 * 错误类型枚举
 */
export enum MultimodalErrorType {
  // 网络相关错误
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  
  // API相关错误
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // 文件相关错误
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',
  FILE_CORRUPTED = 'FILE_CORRUPTED',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  
  // 媒体相关错误
  MEDIA_PERMISSION_DENIED = 'MEDIA_PERMISSION_DENIED',
  MEDIA_DEVICE_NOT_FOUND = 'MEDIA_DEVICE_NOT_FOUND',
  MEDIA_NOT_SUPPORTED = 'MEDIA_NOT_SUPPORTED',
  RECORDING_ERROR = 'RECORDING_ERROR',
  
  // 处理相关错误
  PROCESSING_ERROR = 'PROCESSING_ERROR',
  RECOGNITION_FAILED = 'RECOGNITION_FAILED',
  INVALID_RESPONSE = 'INVALID_RESPONSE',
  
  // 配置相关错误
  CONFIG_ERROR = 'CONFIG_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // 通用错误
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误信息接口
 */
export interface MultimodalError {
  type: MultimodalErrorType;
  message: string;
  details?: any;
  retryable?: boolean;
  userMessage?: string;
}

/**
 * 错误消息映射
 */
const ERROR_MESSAGES: Record<MultimodalErrorType, string> = {
  // 网络相关错误
  [MultimodalErrorType.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [MultimodalErrorType.TIMEOUT_ERROR]: '请求超时，请稍后重试',
  [MultimodalErrorType.CONNECTION_ERROR]: '无法连接到服务器，请稍后重试',
  
  // API相关错误
  [MultimodalErrorType.API_ERROR]: 'API调用失败，请稍后重试',
  [MultimodalErrorType.AUTHENTICATION_ERROR]: '身份验证失败，请重新登录',
  [MultimodalErrorType.AUTHORIZATION_ERROR]: '权限不足，无法执行此操作',
  [MultimodalErrorType.QUOTA_EXCEEDED]: 'API调用次数已达上限，请稍后重试',
  [MultimodalErrorType.RATE_LIMIT_EXCEEDED]: '请求过于频繁，请稍后重试',
  
  // 文件相关错误
  [MultimodalErrorType.FILE_TOO_LARGE]: '文件大小超过限制',
  [MultimodalErrorType.UNSUPPORTED_FORMAT]: '不支持的文件格式',
  [MultimodalErrorType.FILE_CORRUPTED]: '文件已损坏，请选择其他文件',
  [MultimodalErrorType.FILE_UPLOAD_ERROR]: '文件上传失败，请重试',
  
  // 媒体相关错误
  [MultimodalErrorType.MEDIA_PERMISSION_DENIED]: '需要媒体访问权限，请在浏览器设置中允许',
  [MultimodalErrorType.MEDIA_DEVICE_NOT_FOUND]: '未找到可用的媒体设备',
  [MultimodalErrorType.MEDIA_NOT_SUPPORTED]: '当前浏览器不支持媒体功能',
  [MultimodalErrorType.RECORDING_ERROR]: '录音失败，请重试',
  
  // 处理相关错误
  [MultimodalErrorType.PROCESSING_ERROR]: '处理失败，请重试',
  [MultimodalErrorType.RECOGNITION_FAILED]: '识别失败，请尝试其他方式',
  [MultimodalErrorType.INVALID_RESPONSE]: '服务器响应异常，请重试',
  
  // 配置相关错误
  [MultimodalErrorType.CONFIG_ERROR]: '配置错误，请联系管理员',
  [MultimodalErrorType.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
  
  // 通用错误
  [MultimodalErrorType.UNKNOWN_ERROR]: '发生未知错误，请重试',
};

/**
 * 可重试的错误类型
 */
const RETRYABLE_ERRORS = new Set([
  MultimodalErrorType.NETWORK_ERROR,
  MultimodalErrorType.TIMEOUT_ERROR,
  MultimodalErrorType.CONNECTION_ERROR,
  MultimodalErrorType.API_ERROR,
  MultimodalErrorType.RATE_LIMIT_EXCEEDED,
  MultimodalErrorType.FILE_UPLOAD_ERROR,
  MultimodalErrorType.RECORDING_ERROR,
  MultimodalErrorType.PROCESSING_ERROR,
  MultimodalErrorType.SERVICE_UNAVAILABLE,
]);

/**
 * 解析错误并返回标准化的错误对象
 */
export function parseError(error: any): MultimodalError {
  // 如果已经是标准化的错误对象
  if (error && typeof error === 'object' && error.type && error.message) {
    return error as MultimodalError;
  }

  // 网络错误
  if (error?.code === 'ECONNABORTED' || error?.message?.includes('timeout')) {
    return {
      type: MultimodalErrorType.TIMEOUT_ERROR,
      message: ERROR_MESSAGES[MultimodalErrorType.TIMEOUT_ERROR],
      retryable: true,
      details: error,
    };
  }

  if (error?.code === 'NETWORK_ERROR' || error?.message?.includes('Network Error')) {
    return {
      type: MultimodalErrorType.NETWORK_ERROR,
      message: ERROR_MESSAGES[MultimodalErrorType.NETWORK_ERROR],
      retryable: true,
      details: error,
    };
  }

  // HTTP状态码错误
  if (error?.response?.status) {
    const status = error.response.status;
    
    switch (status) {
      case 401:
        return {
          type: MultimodalErrorType.AUTHENTICATION_ERROR,
          message: ERROR_MESSAGES[MultimodalErrorType.AUTHENTICATION_ERROR],
          retryable: false,
          details: error,
        };
      
      case 403:
        return {
          type: MultimodalErrorType.AUTHORIZATION_ERROR,
          message: ERROR_MESSAGES[MultimodalErrorType.AUTHORIZATION_ERROR],
          retryable: false,
          details: error,
        };
      
      case 413:
        return {
          type: MultimodalErrorType.FILE_TOO_LARGE,
          message: ERROR_MESSAGES[MultimodalErrorType.FILE_TOO_LARGE],
          retryable: false,
          details: error,
        };
      
      case 429:
        return {
          type: MultimodalErrorType.RATE_LIMIT_EXCEEDED,
          message: ERROR_MESSAGES[MultimodalErrorType.RATE_LIMIT_EXCEEDED],
          retryable: true,
          details: error,
        };
      
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: MultimodalErrorType.SERVICE_UNAVAILABLE,
          message: ERROR_MESSAGES[MultimodalErrorType.SERVICE_UNAVAILABLE],
          retryable: true,
          details: error,
        };
      
      default:
        return {
          type: MultimodalErrorType.API_ERROR,
          message: error.response?.data?.message || ERROR_MESSAGES[MultimodalErrorType.API_ERROR],
          retryable: true,
          details: error,
        };
    }
  }

  // 媒体相关错误
  if (error?.name === 'NotAllowedError') {
    return {
      type: MultimodalErrorType.MEDIA_PERMISSION_DENIED,
      message: ERROR_MESSAGES[MultimodalErrorType.MEDIA_PERMISSION_DENIED],
      retryable: false,
      details: error,
    };
  }

  if (error?.name === 'NotFoundError') {
    return {
      type: MultimodalErrorType.MEDIA_DEVICE_NOT_FOUND,
      message: ERROR_MESSAGES[MultimodalErrorType.MEDIA_DEVICE_NOT_FOUND],
      retryable: false,
      details: error,
    };
  }

  if (error?.name === 'NotSupportedError') {
    return {
      type: MultimodalErrorType.MEDIA_NOT_SUPPORTED,
      message: ERROR_MESSAGES[MultimodalErrorType.MEDIA_NOT_SUPPORTED],
      retryable: false,
      details: error,
    };
  }

  // 默认错误
  return {
    type: MultimodalErrorType.UNKNOWN_ERROR,
    message: error?.message || ERROR_MESSAGES[MultimodalErrorType.UNKNOWN_ERROR],
    retryable: false,
    details: error,
  };
}

/**
 * 显示错误消息
 */
export function showError(error: MultimodalError | any, showRetryHint: boolean = true): void {
  const parsedError = parseError(error);
  
  let message = parsedError.userMessage || parsedError.message;
  
  if (showRetryHint && parsedError.retryable) {
    message += '，您可以重试';
  }
  
  toast.error(message);
}

/**
 * 显示成功消息
 */
export function showSuccess(message: string): void {
  toast.success(message);
}

/**
 * 显示信息消息
 */
export function showInfo(message: string): void {
  toast.info(message);
}

/**
 * 显示警告消息
 */
export function showWarning(message: string): void {
  toast.warning(message);
}

/**
 * 创建错误对象
 */
export function createError(
  type: MultimodalErrorType,
  message?: string,
  details?: any,
  userMessage?: string
): MultimodalError {
  return {
    type,
    message: message || ERROR_MESSAGES[type],
    details,
    retryable: RETRYABLE_ERRORS.has(type),
    userMessage,
  };
}

/**
 * 检查错误是否可重试
 */
export function isRetryableError(error: MultimodalError | any): boolean {
  const parsedError = parseError(error);
  return parsedError.retryable || false;
}

/**
 * 获取错误的用户友好消息
 */
export function getUserFriendlyMessage(error: MultimodalError | any): string {
  const parsedError = parseError(error);
  return parsedError.userMessage || parsedError.message;
}
