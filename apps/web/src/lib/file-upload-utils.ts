/**
 * 文件上传工具函数
 */

/**
 * 支持的图片格式
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * 文件大小限制（字节）
 */
export const FILE_SIZE_LIMITS = {
  AVATAR: 5 * 1024 * 1024, // 5MB
  MAX_DIMENSION: 2048, // 最大尺寸2048px
};

/**
 * 检查文件类型是否支持
 */
export function isValidImageType(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(file.type);
}

/**
 * 检查文件大小是否符合要求
 */
export function isValidFileSize(file: File, maxSize: number = FILE_SIZE_LIMITS.AVATAR): boolean {
  return file.size <= maxSize;
}

/**
 * 验证头像文件
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  if (!isValidImageType(file)) {
    return {
      valid: false,
      error: '不支持的文件格式，请选择 JPG、PNG、WebP 或 GIF 格式的图片',
    };
  }

  if (!isValidFileSize(file)) {
    return {
      valid: false,
      error: `文件大小不能超过 ${FILE_SIZE_LIMITS.AVATAR / 1024 / 1024}MB`,
    };
  }

  return { valid: true };
}

/**
 * 压缩图片
 */
export function compressImage(
  file: File,
  maxWidth: number = FILE_SIZE_LIMITS.MAX_DIMENSION,
  maxHeight: number = FILE_SIZE_LIMITS.MAX_DIMENSION,
  quality: number = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    // 检查是否在浏览器环境中
    if (typeof document === 'undefined') {
      reject(new Error('压缩功能仅在浏览器环境中可用'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // 计算新尺寸
      let { width, height } = img;

      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // 绘制压缩后的图片
      ctx?.drawImage(img, 0, 0, width, height);

      // 转换为Blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            reject(new Error('图片压缩失败'));
          }
        },
        file.type,
        quality,
      );
    };

    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * 创建图片预览URL
 */
export function createImagePreview(file: File): string {
  if (typeof URL === 'undefined') {
    throw new Error('URL API不可用');
  }
  return URL.createObjectURL(file);
}

/**
 * 清理预览URL
 */
export function revokeImagePreview(url: string): void {
  if (typeof URL !== 'undefined') {
    URL.revokeObjectURL(url);
  }
}

/**
 * 检测设备能力
 */
export interface DeviceCapabilities {
  hasCamera: boolean;
  hasFileInput: boolean;
  supportsDragDrop: boolean;
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isCapacitor: boolean;
}

/**
 * 获取设备能力
 */
export function getDeviceCapabilities(): DeviceCapabilities {
  // 检查是否在浏览器环境中
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    // SSR环境，返回默认值
    return {
      hasCamera: false,
      hasFileInput: true,
      supportsDragDrop: true,
      isMobile: false,
      isIOS: false,
      isAndroid: false,
      isCapacitor: false,
    };
  }

  const userAgent = navigator.userAgent.toLowerCase();

  // 检查是否为真正的Capacitor环境
  const isCapacitor = !!(window as any).Capacitor;

  // 更严格的移动设备检测，排除桌面浏览器的模拟模式
  const isDesktopBrowser =
    /windows|macintosh|linux/.test(userAgent) && !/mobile|tablet/.test(userAgent);
  const isMobile =
    /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent) && !isDesktopBrowser;

  // 只有在真正的移动设备或Capacitor环境中才认为是iOS/Android
  const isIOS = /iphone|ipad|ipod/i.test(userAgent) && !isDesktopBrowser;
  const isAndroid = /android/i.test(userAgent) && !isDesktopBrowser;

  return {
    hasCamera: (isMobile && !isDesktopBrowser) || isCapacitor,
    hasFileInput: true,
    supportsDragDrop: !isMobile || isDesktopBrowser,
    isMobile: isMobile && !isDesktopBrowser,
    isIOS,
    isAndroid,
    isCapacitor,
  };
}

/**
 * 文件选择选项
 */
export interface FilePickerOptions {
  accept?: string;
  multiple?: boolean;
  capture?: 'user' | 'environment';
}

/**
 * 创建文件选择器
 */
export function createFilePicker(options: FilePickerOptions = {}): Promise<FileList | null> {
  return new Promise((resolve, reject) => {
    // 检查是否在浏览器环境中
    if (typeof document === 'undefined') {
      reject(new Error('文件选择器仅在浏览器环境中可用'));
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = options.accept || SUPPORTED_IMAGE_TYPES.join(',');
    input.multiple = options.multiple || false;

    if (options.capture) {
      input.capture = options.capture;
    }

    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      resolve(target.files);
    };

    input.oncancel = () => resolve(null);

    input.click();
  });
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 获取文件扩展名
 */
export function getFileExtension(filename: string): string {
  return filename.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2);
}

/**
 * 生成唯一文件名
 */
export function generateUniqueFileName(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = getFileExtension(originalName);
  return `avatar_${timestamp}_${random}.${extension}`;
}
