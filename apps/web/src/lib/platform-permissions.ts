/**
 * 平台权限管理
 * 处理相机、相册等权限请求
 */

/**
 * 权限状态
 */
export type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

/**
 * 权限结果
 */
export interface PermissionResult {
  status: PermissionStatus;
  message?: string;
}

/**
 * 检查Capacitor权限
 */
async function checkCapacitorPermission(permission: string): Promise<PermissionResult> {
  try {
    if (typeof window === 'undefined' || !(window as any).Capacitor) {
      return { status: 'unavailable', message: 'Capacitor不可用' };
    }

    // 动态导入Capacitor Camera
    // 使用字符串拼接避免Webpack静态分析
    const moduleName = '@capacitor' + '/camera';
    const capacitorCamera = await import(moduleName).catch(() => null);

    if (!capacitorCamera) {
      return { status: 'unavailable', message: 'Capacitor Camera插件不可用' };
    }

    const { Camera } = capacitorCamera;
    const result = await Camera.checkPermissions();

    if (permission === 'camera') {
      return {
        status: result.camera as PermissionStatus,
        message: result.camera === 'denied' ? '相机权限被拒绝' : undefined
      };
    } else if (permission === 'photos') {
      return {
        status: result.photos as PermissionStatus,
        message: result.photos === 'denied' ? '相册权限被拒绝' : undefined
      };
    }

    return { status: 'unavailable' };
  } catch (error) {
    console.error('检查Capacitor权限失败:', error);
    return { status: 'unavailable', message: '权限检查失败' };
  }
}

/**
 * 请求Capacitor权限
 */
async function requestCapacitorPermission(permission: string): Promise<PermissionResult> {
  try {
    if (typeof window === 'undefined' || !(window as any).Capacitor) {
      return { status: 'unavailable', message: 'Capacitor不可用' };
    }

    // 动态导入Capacitor Camera
    // 使用字符串拼接避免Webpack静态分析
    const moduleName = '@capacitor' + '/camera';
    const capacitorCamera = await import(moduleName).catch(() => null);

    if (!capacitorCamera) {
      return { status: 'unavailable', message: 'Capacitor Camera插件不可用' };
    }

    const { Camera } = capacitorCamera;
    const result = await Camera.requestPermissions({
      permissions: [permission as any]
    });

    if (permission === 'camera') {
      return {
        status: result.camera as PermissionStatus,
        message: result.camera === 'denied' ? '用户拒绝了相机权限' : undefined
      };
    } else if (permission === 'photos') {
      return {
        status: result.photos as PermissionStatus,
        message: result.photos === 'denied' ? '用户拒绝了相册权限' : undefined
      };
    }

    return { status: 'unavailable' };
  } catch (error) {
    console.error('请求Capacitor权限失败:', error);
    return { status: 'denied', message: '权限请求失败' };
  }
}

/**
 * 检查Web权限
 */
async function checkWebPermission(permission: string): Promise<PermissionResult> {
  try {
    if (!navigator.permissions) {
      return { status: 'unavailable', message: '浏览器不支持权限API' };
    }

    const result = await navigator.permissions.query({ name: permission as any });
    return { status: result.state as PermissionStatus };
  } catch (error) {
    console.error('检查Web权限失败:', error);
    return { status: 'unavailable', message: '权限检查失败' };
  }
}

/**
 * 平台权限管理器
 */
export class PlatformPermissions {
  private static instance: PlatformPermissions;
  private isCapacitor = !!(typeof window !== 'undefined' && (window as any).Capacitor);

  static getInstance(): PlatformPermissions {
    if (!PlatformPermissions.instance) {
      PlatformPermissions.instance = new PlatformPermissions();
    }
    return PlatformPermissions.instance;
  }

  /**
   * 检查相机权限
   */
  async checkCameraPermission(): Promise<PermissionResult> {
    if (this.isCapacitor) {
      return await checkCapacitorPermission('camera');
    } else {
      return await checkWebPermission('camera');
    }
  }

  /**
   * 请求相机权限
   */
  async requestCameraPermission(): Promise<PermissionResult> {
    if (this.isCapacitor) {
      return await requestCapacitorPermission('camera');
    } else {
      // Web端通常在使用时自动请求权限
      return { status: 'prompt', message: '将在使用时请求权限' };
    }
  }

  /**
   * 检查相册权限
   */
  async checkPhotosPermission(): Promise<PermissionResult> {
    if (this.isCapacitor) {
      return await checkCapacitorPermission('photos');
    } else {
      // Web端相册访问通常不需要特殊权限
      return { status: 'granted' };
    }
  }

  /**
   * 请求相册权限
   */
  async requestPhotosPermission(): Promise<PermissionResult> {
    if (this.isCapacitor) {
      return await requestCapacitorPermission('photos');
    } else {
      return { status: 'granted' };
    }
  }

  /**
   * 检查并请求权限（如果需要）
   */
  async ensurePermission(type: 'camera' | 'photos'): Promise<PermissionResult> {
    let checkResult: PermissionResult;
    
    if (type === 'camera') {
      checkResult = await this.checkCameraPermission();
    } else {
      checkResult = await this.checkPhotosPermission();
    }

    // 如果权限已授予，直接返回
    if (checkResult.status === 'granted') {
      return checkResult;
    }

    // 如果需要请求权限
    if (checkResult.status === 'prompt') {
      if (type === 'camera') {
        return await this.requestCameraPermission();
      } else {
        return await this.requestPhotosPermission();
      }
    }

    // 其他情况直接返回检查结果
    return checkResult;
  }

  /**
   * 显示权限说明对话框
   */
  showPermissionDialog(type: 'camera' | 'photos', result: PermissionResult): void {
    if (result.status === 'denied') {
      const message = type === 'camera' 
        ? '需要相机权限才能拍照。请在设置中允许应用访问相机。'
        : '需要相册权限才能选择图片。请在设置中允许应用访问相册。';
      
      alert(message);
    }
  }
}

/**
 * 便捷的导出实例
 */
export const platformPermissions = PlatformPermissions.getInstance();
