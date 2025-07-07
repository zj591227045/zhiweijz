/**
 * 跨平台文件选择器
 * 支持Web、iOS Capacitor、Android Capacitor
 */

import { getDeviceCapabilities } from './file-upload-utils';
import { platformPermissions } from './platform-permissions';

/**
 * 文件选择结果
 */
export interface FilePickerResult {
  file: File;
  source: 'camera' | 'gallery' | 'file';
}

/**
 * 文件选择选项
 */
export interface PlatformFilePickerOptions {
  allowCamera?: boolean;
  allowGallery?: boolean;
  quality?: number; // 0-1, 仅对相机有效
  maxWidth?: number;
  maxHeight?: number;
}

/**
 * 检查Capacitor插件是否可用
 */
async function isCapacitorPluginAvailable(pluginName: string): Promise<boolean> {
  if (typeof window === 'undefined' || !(window as any).Capacitor) {
    return false;
  }

  try {
    const { Capacitor } = (window as any);
    return Capacitor.isPluginAvailable(pluginName);
  } catch {
    return false;
  }
}

/**
 * Web端文件选择器
 */
async function webFilePicker(options: PlatformFilePickerOptions): Promise<FilePickerResult | null> {
  return new Promise((resolve, reject) => {
    // 检查是否在浏览器环境中
    if (typeof document === 'undefined') {
      reject(new Error('文件选择器仅在浏览器环境中可用'));
      return;
    }

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    // 移动端支持相机
    const capabilities = getDeviceCapabilities();
    if (capabilities.isMobile && options.allowCamera) {
      input.capture = 'environment';
    }

    input.onchange = (event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (file) {
        resolve({
          file,
          source: capabilities.isMobile && options.allowCamera ? 'camera' : 'gallery'
        });
      } else {
        resolve(null);
      }
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Capacitor相机插件
 */
async function capacitorCamera(options: PlatformFilePickerOptions): Promise<FilePickerResult | null> {
  try {
    // 在Web环境中，Capacitor不可用，直接抛出错误
    if (typeof window !== 'undefined' && !(window as any).Capacitor) {
      throw new Error('Capacitor not available in web environment');
    }

    // 动态导入Capacitor Camera，只在需要时加载
    // 使用字符串拼接避免Webpack静态分析
    const moduleName = '@capacitor' + '/camera';
    const capacitorCamera = await import(moduleName).catch(() => null);

    if (!capacitorCamera) {
      throw new Error('Capacitor Camera plugin not available');
    }

    const { Camera, CameraResultType, CameraSource } = capacitorCamera;

    const image = await Camera.getPhoto({
      quality: Math.round((options.quality || 0.8) * 100),
      allowEditing: true,
      resultType: CameraResultType.Blob,
      source: CameraSource.Camera,
      width: options.maxWidth,
      height: options.maxHeight,
    });

    if (image.blob) {
      const file = new File([image.blob], `camera_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      return {
        file,
        source: 'camera'
      };
    }

    return null;
  } catch (error) {
    console.error('Capacitor相机调用失败:', error);
    throw new Error('相机功能不可用，请尝试其他方式上传图片');
  }
}

/**
 * Capacitor相册选择器
 */
async function capacitorGallery(options: PlatformFilePickerOptions): Promise<FilePickerResult | null> {
  try {
    // 在Web环境中，Capacitor不可用，直接抛出错误
    if (typeof window !== 'undefined' && !(window as any).Capacitor) {
      throw new Error('Capacitor not available in web environment');
    }

    // 动态导入Capacitor Camera，只在需要时加载
    // 使用字符串拼接避免Webpack静态分析
    const moduleName = '@capacitor' + '/camera';
    const capacitorCamera = await import(moduleName).catch(() => null);

    if (!capacitorCamera) {
      throw new Error('Capacitor Camera plugin not available');
    }

    const { Camera, CameraResultType, CameraSource } = capacitorCamera;

    const image = await Camera.getPhoto({
      quality: Math.round((options.quality || 0.8) * 100),
      allowEditing: true,
      resultType: CameraResultType.Blob,
      source: CameraSource.Photos,
      width: options.maxWidth,
      height: options.maxHeight,
    });

    if (image.blob) {
      const file = new File([image.blob], `gallery_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      return {
        file,
        source: 'gallery'
      };
    }

    return null;
  } catch (error) {
    console.error('Capacitor相册选择失败:', error);
    throw new Error('相册功能不可用，请尝试其他方式上传图片');
  }
}

/**
 * 主要的平台文件选择器
 */
export class PlatformFilePicker {
  private static instance: PlatformFilePicker;
  private capabilities = getDeviceCapabilities();

  static getInstance(): PlatformFilePicker {
    if (!PlatformFilePicker.instance) {
      PlatformFilePicker.instance = new PlatformFilePicker();
    }
    return PlatformFilePicker.instance;
  }

  /**
   * 检查平台能力
   */
  async checkCapabilities() {
    const result = {
      hasCamera: false,
      hasGallery: false,
      hasFilePicker: true,
      platform: 'web' as 'web' | 'ios' | 'android'
    };

    if (this.capabilities.isCapacitor) {
      try {
        const hasCameraPlugin = await isCapacitorPluginAvailable('Camera');

        if (hasCameraPlugin) {
          result.hasCamera = true;
          result.hasGallery = true;

          if (this.capabilities.isIOS) {
            result.platform = 'ios';
          } else if (this.capabilities.isAndroid) {
            result.platform = 'android';
          }
        }
      } catch (error) {
        console.warn('Capacitor能力检测失败，回退到Web模式:', error);
        // 回退到Web模式
      }
    }

    // Web环境或Capacitor不可用时的处理
    if (!this.capabilities.isCapacitor || result.platform === 'web') {
      if (this.capabilities.isMobile) {
        // Web移动端支持相机
        result.hasCamera = true;
        result.hasGallery = true;
      } else {
        // 桌面端只支持文件选择
        result.hasGallery = true;
      }
    }

    return result;
  }

  /**
   * 从相机拍照
   */
  async takePhoto(options: PlatformFilePickerOptions = {}): Promise<FilePickerResult | null> {
    const capabilities = await this.checkCapabilities();

    if (!capabilities.hasCamera) {
      throw new Error('当前平台不支持相机功能');
    }

    // 检查相机权限
    const permissionResult = await platformPermissions.ensurePermission('camera');
    if (permissionResult.status !== 'granted') {
      platformPermissions.showPermissionDialog('camera', permissionResult);
      throw new Error(permissionResult.message || '相机权限被拒绝');
    }

    if (this.capabilities.isCapacitor) {
      return await capacitorCamera(options);
    } else {
      // Web端使用文件选择器的相机模式
      return await webFilePicker({ ...options, allowCamera: true });
    }
  }

  /**
   * 从相册选择
   */
  async pickFromGallery(options: PlatformFilePickerOptions = {}): Promise<FilePickerResult | null> {
    const capabilities = await this.checkCapabilities();

    if (!capabilities.hasGallery) {
      throw new Error('当前平台不支持相册功能');
    }

    // 检查相册权限
    const permissionResult = await platformPermissions.ensurePermission('photos');
    if (permissionResult.status !== 'granted') {
      platformPermissions.showPermissionDialog('photos', permissionResult);
      throw new Error(permissionResult.message || '相册权限被拒绝');
    }

    if (this.capabilities.isCapacitor) {
      return await capacitorGallery(options);
    } else {
      // Web端使用文件选择器
      return await webFilePicker({ ...options, allowGallery: true });
    }
  }

  /**
   * 通用文件选择（让用户选择来源）
   */
  async pickFile(options: PlatformFilePickerOptions = {}): Promise<FilePickerResult | null> {
    const capabilities = await this.checkCapabilities();
    
    // 如果只有一种选择方式，直接使用
    if (capabilities.hasCamera && !capabilities.hasGallery) {
      return await this.takePhoto(options);
    } else if (!capabilities.hasCamera && capabilities.hasGallery) {
      return await this.pickFromGallery(options);
    }

    // 多种选择方式，返回null让调用者显示选择界面
    return null;
  }
}

/**
 * 便捷的导出函数
 */
export const platformFilePicker = PlatformFilePicker.getInstance();
