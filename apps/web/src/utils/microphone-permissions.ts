/**
 * 麦克风权限管理工具
 * 专门处理Capacitor Android环境下的麦克风权限问题
 */

interface MicrophonePermissionResult {
  granted: boolean;
  error?: string;
  canRetry: boolean;
}

/**
 * 检查当前环境信息
 */
function getEnvironmentInfo() {
  if (typeof window === 'undefined') {
    return { isCapacitor: false, isAndroid: false, isWeb: true };
  }
  
  const isCapacitor = !!(window as any).Capacitor;
  const platform = isCapacitor ? (window as any).Capacitor.getPlatform?.() : null;
  const isAndroid = platform === 'android';
  
  return {
    isCapacitor,
    isAndroid,
    isWeb: !isCapacitor,
    platform
  };
}

/**
 * 检查麦克风设备是否可用
 */
export async function checkMicrophoneAvailability(): Promise<boolean> {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.warn('🎤 [MicCheck] mediaDevices API不可用');
      return false;
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = devices.filter(device => device.kind === 'audioinput');
    
    console.log('🎤 [MicCheck] 检测到音频输入设备:', audioInputs.length);
    return audioInputs.length > 0;
  } catch (error) {
    console.error('🎤 [MicCheck] 设备检测失败:', error);
    return false;
  }
}

/**
 * 尝试请求麦克风权限
 */
export async function requestMicrophonePermission(): Promise<MicrophonePermissionResult> {
  const env = getEnvironmentInfo();
  console.log('🎤 [MicPermission] 环境信息:', env);

  try {
    // 首先检查麦克风设备是否可用
    const hasMicrophone = await checkMicrophoneAvailability();
    if (!hasMicrophone) {
      return {
        granted: false,
        error: '未检测到可用的麦克风设备',
        canRetry: false
      };
    }

    console.log('🎤 [MicPermission] 开始请求麦克风权限...');
    
    // 使用简单的音频约束
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('🎤 [MicPermission] 权限请求成功，音频轨道数:', stream.getAudioTracks().length);
    
    // 立即停止流
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('🎤 [MicPermission] 停止音频轨道:', track.label);
    });

    return {
      granted: true,
      canRetry: false
    };

  } catch (error: any) {
    console.error('🎤 [MicPermission] 权限请求失败:', error);
    
    const errorName = error.name || 'UnknownError';
    const errorMessage = error.message || '未知错误';
    
    console.log('🎤 [MicPermission] 错误详情:', {
      name: errorName,
      message: errorMessage,
      environment: env,
      errorString: error.toString(),
      stack: error.stack
    });

    let userMessage = '';
    let canRetry = true;

    switch (errorName) {
      case 'NotAllowedError':
        if (env.isAndroid) {
          userMessage = '麦克风权限被拒绝。可能缺少MODIFY_AUDIO_SETTINGS权限。请前往 设置 → 应用 → 只为记账 → 权限，确保所有音频相关权限都已开启';
          canRetry = true;
        } else {
          userMessage = '麦克风权限被拒绝，请在系统设置中允许应用访问麦克风';
          canRetry = true;
        }
        break;
        
      case 'NotFoundError':
        userMessage = '未找到可用的麦克风设备，请检查设备连接';
        canRetry = false;
        break;
        
      case 'NotSupportedError':
        userMessage = '当前设备或浏览器不支持麦克风功能';
        canRetry = false;
        break;
        
      case 'NotReadableError':
        userMessage = '麦克风设备被其他应用占用，请关闭其他使用麦克风的应用';
        canRetry = true;
        break;
        
      case 'OverconstrainedError':
        // 如果约束过于严格，尝试使用更简单的约束
        console.log('🎤 [MicPermission] 约束过于严格，尝试简化约束...');
        try {
          const simpleStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          simpleStream.getTracks().forEach(track => track.stop());
          return { granted: true, canRetry: false };
                 } catch (retryError) {
           userMessage = '麦克风设备不兼容当前配置，请尝试使用其他设备';
           canRetry = false;
         }
        break;
        
      case 'AbortError':
        userMessage = '权限请求被中断，请重试';
        canRetry = true;
        break;
        
      default:
        userMessage = `麦克风权限请求失败: ${errorMessage}`;
        canRetry = true;
        break;
    }

    return {
      granted: false,
      error: userMessage,
      canRetry
    };
  }
}

/**
 * 检查权限状态（如果浏览器支持）
 */
export async function checkMicrophonePermissionStatus(): Promise<'granted' | 'denied' | 'prompt' | 'unknown'> {
  try {
    if (!navigator.permissions) {
      console.log('🎤 [MicPermission] permissions API不可用');
      return 'unknown';
    }

    const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    console.log('🎤 [MicPermission] 权限状态:', result.state);
    return result.state as 'granted' | 'denied' | 'prompt';
    
  } catch (error) {
    console.warn('🎤 [MicPermission] 权限状态检查失败:', error);
    return 'unknown';
  }
}

/**
 * 显示权限指导信息
 */
export function showPermissionGuide(isAndroid: boolean = false): void {
  const message = isAndroid 
    ? `请按以下步骤开启麦克风权限：
1. 打开设备的"设置"
2. 找到"应用"或"应用管理"
3. 找到"只为记账"应用
4. 点击"权限"
5. 开启"麦克风"权限
6. 返回应用重试`
    : `请在系统设置中允许应用访问麦克风权限`;
    
  alert(message);
}

/**
 * 完整的麦克风权限请求流程
 */
export async function ensureMicrophonePermission(): Promise<MicrophonePermissionResult> {
  const env = getEnvironmentInfo();
  
  // 先检查权限状态
  const permissionStatus = await checkMicrophonePermissionStatus();
  console.log('🎤 [MicPermission] 当前权限状态:', permissionStatus);
  
  if (permissionStatus === 'granted') {
    // 即使权限显示已授予，也要测试实际访问
    return await requestMicrophonePermission();
  }
  
  if (permissionStatus === 'denied') {
    return {
      granted: false,
      error: env.isAndroid 
        ? '麦克风权限已被拒绝，请在系统设置中手动开启'
        : '麦克风权限已被拒绝，请在浏览器设置中允许访问',
      canRetry: true
    };
  }
  
  // 权限状态为 prompt 或 unknown，尝试请求权限
  return await requestMicrophonePermission();
} 