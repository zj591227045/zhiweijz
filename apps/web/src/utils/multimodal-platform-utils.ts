/**
 * 多模态AI平台兼容性工具
 * 处理不同平台（Web桌面/移动、iOS/Android）的API差异
 */

/**
 * 平台类型
 */
export enum PlatformType {
  WEB_DESKTOP = 'web_desktop',
  WEB_MOBILE = 'web_mobile',
  IOS = 'ios',
  ANDROID = 'android',
  UNKNOWN = 'unknown',
}

/**
 * 媒体设备能力
 */
export interface MediaCapabilities {
  hasCamera: boolean;
  hasMicrophone: boolean;
  supportedAudioFormats: string[];
  supportedImageFormats: string[];
  maxFileSize: number;
}

/**
 * 录音配置
 */
export interface RecordingConfig {
  mimeType: string;
  audioBitsPerSecond?: number;
  sampleRate?: number;
}

/**
 * 检测当前平台类型
 */
export function detectPlatform(): PlatformType {
  if (typeof window === 'undefined') {
    return PlatformType.UNKNOWN;
  }

  const userAgent = navigator.userAgent.toLowerCase();
  
  // 检测iOS
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return PlatformType.IOS;
  }
  
  // 检测Android
  if (/android/.test(userAgent)) {
    return PlatformType.ANDROID;
  }
  
  // 检测移动端Web
  if (/mobile|tablet|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent)) {
    return PlatformType.WEB_MOBILE;
  }
  
  // 默认为桌面Web
  return PlatformType.WEB_DESKTOP;
}

/**
 * 检测媒体设备能力
 */
export async function detectMediaCapabilities(): Promise<MediaCapabilities> {
  const platform = detectPlatform();
  
  let hasCamera = false;
  let hasMicrophone = false;
  
  try {
    // 检测摄像头
    const videoDevices = await navigator.mediaDevices.enumerateDevices();
    hasCamera = videoDevices.some(device => device.kind === 'videoinput');
    
    // 检测麦克风
    hasMicrophone = videoDevices.some(device => device.kind === 'audioinput');
  } catch (error) {
    console.warn('无法检测媒体设备:', error);
  }
  
  // 根据平台返回支持的格式
  const capabilities: MediaCapabilities = {
    hasCamera,
    hasMicrophone,
    supportedAudioFormats: getSupportedAudioFormats(platform),
    supportedImageFormats: getSupportedImageFormats(platform),
    maxFileSize: getMaxFileSize(platform),
  };
  
  return capabilities;
}

/**
 * 获取支持的音频格式
 */
export function getSupportedAudioFormats(platform: PlatformType): string[] {
  switch (platform) {
    case PlatformType.IOS:
      return ['m4a', 'aac', 'wav'];
    case PlatformType.ANDROID:
      return ['webm', 'ogg', 'mp3', 'aac'];
    case PlatformType.WEB_MOBILE:
    case PlatformType.WEB_DESKTOP:
    default:
      return ['webm', 'ogg', 'mp3', 'wav', 'm4a', 'aac'];
  }
}

/**
 * 获取支持的图片格式
 */
export function getSupportedImageFormats(platform: PlatformType): string[] {
  // 所有平台都支持这些基本格式
  return ['jpg', 'jpeg', 'png', 'webp', 'gif'];
}

/**
 * 获取最大文件大小
 */
export function getMaxFileSize(platform: PlatformType): number {
  switch (platform) {
    case PlatformType.IOS:
    case PlatformType.ANDROID:
      // 移动端限制较小
      return 5 * 1024 * 1024; // 5MB
    case PlatformType.WEB_MOBILE:
      return 8 * 1024 * 1024; // 8MB
    case PlatformType.WEB_DESKTOP:
    default:
      return 10 * 1024 * 1024; // 10MB
  }
}

/**
 * 获取最佳录音配置
 */
export function getOptimalRecordingConfig(platform: PlatformType): RecordingConfig {
  switch (platform) {
    case PlatformType.IOS:
      return {
        mimeType: 'audio/mp4',
        audioBitsPerSecond: 128000,
        sampleRate: 44100,
      };
    case PlatformType.ANDROID:
      return {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000,
        sampleRate: 48000,
      };
    case PlatformType.WEB_MOBILE:
    case PlatformType.WEB_DESKTOP:
    default:
      // 检测浏览器支持的格式
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        return {
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000,
          sampleRate: 48000,
        };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        return {
          mimeType: 'audio/mp4',
          audioBitsPerSecond: 128000,
          sampleRate: 44100,
        };
      } else {
        return {
          mimeType: 'audio/webm',
          audioBitsPerSecond: 128000,
        };
      }
  }
}

/**
 * 检查是否支持媒体录制
 */
export function isMediaRecordingSupported(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

/**
 * 检查是否支持文件选择
 */
export function isFileSelectionSupported(): boolean {
  return !!(window.File && window.FileReader && window.FileList && window.Blob);
}

/**
 * 请求媒体权限
 */
export async function requestMediaPermissions(audio: boolean = true, video: boolean = false): Promise<{
  audio: boolean;
  video: boolean;
  error?: string;
}> {
  try {
    const constraints: MediaStreamConstraints = {};
    
    if (audio) {
      constraints.audio = true;
    }
    
    if (video) {
      constraints.video = true;
    }
    
    console.log('🎤 [MediaPermissions] 请求媒体流权限:', constraints);
    
    // 在Capacitor环境中，特别是Android，直接尝试getUserMedia
    // 系统会自动处理权限请求
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    // 立即停止流，我们只是为了获取权限
    stream.getTracks().forEach(track => track.stop());
    
    const result = {
      audio: audio && stream.getAudioTracks().length > 0,
      video: video && stream.getVideoTracks().length > 0,
    };
    
    console.log('🎤 [MediaPermissions] 权限请求成功:', result);
    return result;
  } catch (error) {
    console.error('🎤 [MediaPermissions] 请求媒体权限失败:', error);
    
    let errorMessage = '无法获取媒体权限';
    
    // 检查是否在Capacitor环境中
    const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor;
    const isAndroid = isCapacitor && (window as any).Capacitor.getPlatform?.() === 'android';
    
    if (error instanceof Error) {
      console.log('🎤 [MediaPermissions] 错误详情:', {
        name: error.name,
        message: error.message,
        isCapacitor,
        isAndroid
      });
      
      if (error.name === 'NotAllowedError') {
        if (isAndroid) {
          // 在Android上，如果权限已经在系统级别被授予，但仍然出现NotAllowedError
          // 可能是WebView的权限设置问题
          errorMessage = 'Android系统麦克风权限可能未正确授予，请检查系统设置中的应用权限';
        } else {
          errorMessage = '用户拒绝了媒体访问权限，请在系统设置中允许应用访问麦克风';
        }
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未找到可用的麦克风设备';
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '设备不支持媒体访问';
      } else if (error.name === 'NotReadableError') {
        errorMessage = '麦克风设备被其他应用占用或硬件错误';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = '麦克风设备不满足指定的约束条件';
      } else {
        errorMessage = `媒体权限错误: ${error.message}`;
      }
    }
    
    return {
      audio: false,
      video: false,
      error: errorMessage,
    };
  }
}

/**
 * 转换文件格式（如果需要）
 */
export async function convertFileFormat(
  file: File,
  targetFormat: string,
  platform: PlatformType
): Promise<File> {
  // 如果文件已经是目标格式，直接返回
  const currentExtension = file.name.split('.').pop()?.toLowerCase();
  if (currentExtension === targetFormat.toLowerCase()) {
    return file;
  }
  
  // 对于音频文件，我们通常不在前端进行转换
  // 而是让后端处理，这里只是返回原文件
  return file;
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() || '';
}

/**
 * 验证文件格式
 */
export function validateFileFormat(
  file: File,
  supportedFormats: string[],
  maxSize: number
): { valid: boolean; error?: string } {
  // 检查文件大小
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `文件大小超过限制 (${Math.round(maxSize / 1024 / 1024)}MB)`,
    };
  }
  
  // 检查文件格式
  const extension = getFileExtension(file.name);
  if (!supportedFormats.includes(extension)) {
    return {
      valid: false,
      error: `不支持的文件格式。支持的格式：${supportedFormats.join(', ')}`,
    };
  }
  
  return { valid: true };
}

/**
 * 创建兼容的Blob URL
 */
export function createCompatibleBlobUrl(blob: Blob): string {
  try {
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('创建Blob URL失败:', error);
    return '';
  }
}

/**
 * 释放Blob URL
 */
export function revokeBlobUrl(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('释放Blob URL失败:', error);
  }
}
