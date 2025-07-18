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
    console.log(`🔍 [PluginCheck] ${pluginName}: Capacitor不可用 - window未定义或Capacitor对象不存在`);
    return false;
  }

  try {
    const { Capacitor } = (window as any);

    // 输出调试信息
    console.log(`🔍 [PluginCheck] ${pluginName}: 开始检查插件可用性`);
    console.log(`🔍 [PluginCheck] Capacitor对象:`, Capacitor);
    console.log(`🔍 [PluginCheck] 平台:`, Capacitor.getPlatform?.());
    console.log(`🔍 [PluginCheck] 是否原生平台:`, Capacitor.isNativePlatform?.());

    // 检查插件是否可用
    const isAvailable = Capacitor.isPluginAvailable(pluginName);
    console.log(`🔍 [PluginCheck] ${pluginName}: isPluginAvailable结果:`, isAvailable);

    // 额外检查：尝试直接访问插件
    if (!isAvailable) {
      try {
        // 尝试动态导入插件
        const cameraModule = await import('@capacitor/camera');
        console.log(`🔍 [PluginCheck] ${pluginName}: 模块导入成功`, !!cameraModule.Camera);

        // 检查插件是否在Capacitor.Plugins中
        const plugins = Capacitor.Plugins || {};
        console.log(`🔍 [PluginCheck] 可用插件:`, Object.keys(plugins));

        // 如果模块可以导入，认为插件可用
        if (cameraModule.Camera) {
          console.log(`🔍 [PluginCheck] ${pluginName}: 通过模块导入检测到插件可用`);
          return true;
        }
      } catch (importError) {
        console.error(`🔍 [PluginCheck] ${pluginName}: 模块导入失败:`, importError);
      }
    }

    return isAvailable;
  } catch (error) {
    console.error(`🔍 [PluginCheck] ${pluginName}: 检查失败:`, error);
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
    console.log('📷 [CapacitorCamera] 开始调用相机插件...');

    // 检查Capacitor环境
    if (typeof window === 'undefined' || !(window as any).Capacitor) {
      console.error('📷 [CapacitorCamera] Capacitor环境不可用');
      throw new Error('Capacitor not available in web environment');
    }

    const { Capacitor } = (window as any);
    console.log('📷 [CapacitorCamera] Capacitor环境信息:', {
      platform: Capacitor.getPlatform?.(),
      isNative: Capacitor.isNativePlatform?.(),
      plugins: Object.keys(Capacitor.Plugins || {})
    });

    // 动态导入Capacitor Camera
    console.log('📷 [CapacitorCamera] 正在导入Camera模块...');
    const capacitorCamera = await import('@capacitor/camera').catch((importError) => {
      console.error('📷 [CapacitorCamera] 模块导入失败:', importError);
      return null;
    });

    if (!capacitorCamera) {
      console.error('📷 [CapacitorCamera] Camera模块导入失败');
      throw new Error('Capacitor Camera plugin not available');
    }

    const { Camera, CameraResultType, CameraSource } = capacitorCamera;
    console.log('📷 [CapacitorCamera] Camera模块导入成功:', !!Camera);

    // 检查Camera对象是否可用
    if (!Camera || typeof Camera.getPhoto !== 'function') {
      console.error('📷 [CapacitorCamera] Camera对象或getPhoto方法不可用');
      throw new Error('Camera plugin methods not available');
    }

    // 使用Base64格式，更兼容，然后转换为Blob
    const cameraOptions = {
      quality: Math.round((options.quality || 0.8) * 100),
      allowEditing: false, // 禁用系统编辑器，使用我们自己的裁剪工具
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      width: options.maxWidth,
      height: options.maxHeight,
    };

    console.log('📷 [CapacitorCamera] 准备调用Camera.getPhoto，参数:', cameraOptions);

    const image = await Camera.getPhoto(cameraOptions);

    console.log('📷 [CapacitorCamera] Camera.getPhoto调用成功:', {
      hasBase64: !!image.base64String,
      format: image.format,
      webPath: image.webPath
    });

    if (image.base64String) {
      // 将Base64转换为Blob
      const base64Data = image.base64String;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const file = new File([blob], `camera_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      console.log('📷 [CapacitorCamera] 文件创建成功:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      return {
        file,
        source: 'camera'
      };
    }

    console.log('📷 [CapacitorCamera] 未获取到图片数据');
    return null;
  } catch (error) {
    console.error('📷 [CapacitorCamera] 相机调用失败:', error);

    // 提供更详细的错误信息
    let errorMessage = '相机功能不可用';
    if (error instanceof Error) {
      if (error.message.includes('User cancelled')) {
        errorMessage = '用户取消了拍照';
      } else if (error.message.includes('permission')) {
        errorMessage = '相机权限被拒绝，请在设置中允许访问相机';
      } else if (error.message.includes('not available')) {
        errorMessage = '相机插件不可用，请检查设备是否支持相机功能';
      } else {
        errorMessage = `相机调用失败: ${error.message}`;
      }
    }

    throw new Error(errorMessage);
  }
}

/**
 * Capacitor相册选择器
 */
async function capacitorGallery(options: PlatformFilePickerOptions): Promise<FilePickerResult | null> {
  try {
    console.log('🖼️ [CapacitorGallery] 开始调用相册选择器...');

    // 检查Capacitor环境
    if (typeof window === 'undefined' || !(window as any).Capacitor) {
      console.error('🖼️ [CapacitorGallery] Capacitor环境不可用');
      throw new Error('Capacitor not available in web environment');
    }

    const { Capacitor } = (window as any);
    console.log('🖼️ [CapacitorGallery] Capacitor环境信息:', {
      platform: Capacitor.getPlatform?.(),
      isNative: Capacitor.isNativePlatform?.(),
      plugins: Object.keys(Capacitor.Plugins || {})
    });

    // 动态导入Capacitor Camera
    console.log('🖼️ [CapacitorGallery] 正在导入Camera模块...');
    const capacitorCamera = await import('@capacitor/camera').catch((importError) => {
      console.error('🖼️ [CapacitorGallery] 模块导入失败:', importError);
      return null;
    });

    if (!capacitorCamera) {
      console.error('🖼️ [CapacitorGallery] Camera模块导入失败');
      throw new Error('Capacitor Camera plugin not available');
    }

    const { Camera, CameraResultType, CameraSource } = capacitorCamera;
    console.log('🖼️ [CapacitorGallery] Camera模块导入成功:', !!Camera);

    // 检查Camera对象是否可用
    if (!Camera || typeof Camera.getPhoto !== 'function') {
      console.error('🖼️ [CapacitorGallery] Camera对象或getPhoto方法不可用');
      throw new Error('Camera plugin methods not available');
    }

    // 使用Base64格式，更兼容，然后转换为Blob
    const galleryOptions = {
      quality: Math.round((options.quality || 0.8) * 100),
      allowEditing: false, // 禁用系统编辑器，使用我们自己的裁剪工具
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos,
      width: options.maxWidth,
      height: options.maxHeight,
    };

    console.log('🖼️ [CapacitorGallery] 准备调用Camera.getPhoto，参数:', galleryOptions);

    const image = await Camera.getPhoto(galleryOptions);

    console.log('🖼️ [CapacitorGallery] Camera.getPhoto调用成功:', {
      hasBase64: !!image.base64String,
      format: image.format,
      webPath: image.webPath
    });

    if (image.base64String) {
      // 将Base64转换为Blob
      const base64Data = image.base64String;
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      const file = new File([blob], `gallery_${Date.now()}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      console.log('🖼️ [CapacitorGallery] 文件创建成功:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      return {
        file,
        source: 'gallery'
      };
    }

    console.log('🖼️ [CapacitorGallery] 未获取到图片数据');
    return null;
  } catch (error) {
    console.error('🖼️ [CapacitorGallery] 相册选择失败:', error);

    // 提供更详细的错误信息
    let errorMessage = '相册功能不可用';
    if (error instanceof Error) {
      if (error.message.includes('User cancelled')) {
        errorMessage = '用户取消了选择';
      } else if (error.message.includes('permission')) {
        errorMessage = '相册权限被拒绝，请在设置中允许访问相册';
      } else if (error.message.includes('not available')) {
        errorMessage = '相册插件不可用，请检查设备是否支持相册功能';
      } else {
        errorMessage = `相册选择失败: ${error.message}`;
      }
    }

    throw new Error(errorMessage);
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
    console.log('🔍 [PlatformCapabilities] 开始检查平台能力...');

    const result = {
      hasCamera: false,
      hasGallery: false,
      hasFilePicker: true,
      platform: 'web' as 'web' | 'ios' | 'android'
    };

    // 输出设备能力信息
    console.log('🔍 [PlatformCapabilities] 设备能力:', this.capabilities);

    if (this.capabilities.isCapacitor) {
      console.log('🔍 [PlatformCapabilities] 检测到Capacitor环境，检查Camera插件...');

      try {
        const hasCameraPlugin = await isCapacitorPluginAvailable('Camera');
        console.log('🔍 [PlatformCapabilities] Camera插件可用性:', hasCameraPlugin);

        if (hasCameraPlugin) {
          result.hasCamera = true;
          result.hasGallery = true;

          if (this.capabilities.isIOS) {
            result.platform = 'ios';
            console.log('🔍 [PlatformCapabilities] 平台: iOS');
          } else if (this.capabilities.isAndroid) {
            result.platform = 'android';
            console.log('🔍 [PlatformCapabilities] 平台: Android');
          } else {
            console.log('🔍 [PlatformCapabilities] 平台: Capacitor (未知移动平台)');
          }
        } else {
          console.warn('🔍 [PlatformCapabilities] Camera插件不可用，回退到Web模式');
        }
      } catch (error) {
        console.warn('🔍 [PlatformCapabilities] Capacitor能力检测失败，回退到Web模式:', error);
        // 回退到Web模式
      }
    } else {
      console.log('🔍 [PlatformCapabilities] 非Capacitor环境，使用Web模式');
    }

    // Web环境或Capacitor不可用时的处理
    if (!this.capabilities.isCapacitor || result.platform === 'web') {
      if (this.capabilities.isMobile) {
        // Web移动端支持相机
        result.hasCamera = true;
        result.hasGallery = true;
        console.log('🔍 [PlatformCapabilities] Web移动端: 支持相机和相册');
      } else {
        // 桌面端只支持文件选择
        result.hasGallery = true;
        console.log('🔍 [PlatformCapabilities] Web桌面端: 仅支持文件选择');
      }
    }

    console.log('🔍 [PlatformCapabilities] 最终能力检测结果:', result);
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
   * 从相册选择 (别名方法，保持API兼容性)
   * @deprecated 请使用 pickFromGallery 方法
   */
  async selectFromGallery(options: PlatformFilePickerOptions = {}): Promise<FilePickerResult | null> {
    return this.pickFromGallery(options);
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
