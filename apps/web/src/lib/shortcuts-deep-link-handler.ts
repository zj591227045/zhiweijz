/**
 * iOS快捷指令深度链接处理器
 * 处理来自iOS快捷指令的截图记账请求
 */

import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { useAccountBookStore } from '@/store/account-book-store';
import { useDashboardStore } from '@/store/dashboard-store';

/**
 * 处理X-Callback URL成功回调
 */
function handleXCallbackSuccess(callbackUrl: string, result: any) {
  try {
    if (!callbackUrl) return;

    console.log('🔄 [ShortcutsHandler] 调用X-Success回调:', callbackUrl);
    console.log('🔄 [ShortcutsHandler] 返回数据:', result);

    // 构造回调URL，直接添加字典参数而不是JSON字符串
    const url = new URL(callbackUrl);
    if (result && typeof result === 'object') {
      // 直接将对象的每个属性作为URL参数添加
      // 这样快捷指令可以直接获取到字典值
      Object.keys(result).forEach(key => {
        const value = result[key];
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    const finalUrl = url.toString();
    console.log('🔄 [ShortcutsHandler] 最终成功回调URL:', finalUrl);

    // 延迟跳转，确保toast显示
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = finalUrl;
      }
    }, 1000);
  } catch (error) {
    console.error('🔄 [ShortcutsHandler] X-Success回调处理失败:', error);
  }
}

/**
 * 处理X-Callback URL错误回调
 */
function handleXCallbackError(callbackUrl: string, errorMessage: string) {
  try {
    if (!callbackUrl) return;

    console.log('🔄 [ShortcutsHandler] 调用X-Error回调:', callbackUrl);
    console.log('🔄 [ShortcutsHandler] 错误信息:', errorMessage);

    // 构造回调URL，添加errorMessage参数
    const url = new URL(callbackUrl);
    url.searchParams.set('errorMessage', errorMessage);

    const finalUrl = url.toString();
    console.log('🔄 [ShortcutsHandler] 最终错误回调URL:', finalUrl);

    // 延迟跳转，确保toast显示
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.location.href = finalUrl;
      }
    }, 1000);
  } catch (error) {
    console.error('🔄 [ShortcutsHandler] X-Error回调处理失败:', error);
  }
}

// 深度链接参数接口
interface ShortcutsDeepLinkParams {
  type: 'image' | 'get-token' | 'android-token'; // 支持图片记账、获取token和Android token
  data?: string;
  imageUrl?: string; // 图片URL（新方案）
  accountId?: string;
  source?: string;
  xSuccess?: string; // X-Callback URL成功回调
  xCancel?: string;  // X-Callback URL取消回调
  xError?: string;   // X-Callback URL错误回调
}

// 处理结果接口
interface ShortcutsHandleResult {
  success: boolean;
  message: string;
  transactionId?: string;
  error?: string;
  data?: any; // 用于返回token等数据
}

/**
 * 解析快捷指令URL参数
 */
function parseShortcutsUrl(url: string): ShortcutsDeepLinkParams | null {
  try {
    console.log('🔗 [ShortcutsHandler] 解析URL:', url);

    // 检查是否是我们的URL scheme
    if (!url.startsWith('zhiweijz://')) {
      console.log('🔗 [ShortcutsHandler] 非快捷指令URL，忽略');
      return null;
    }

    // 解析URL
    console.log('🔗 [ShortcutsHandler] 开始解析URL...');

    let urlObj;
    try {
      urlObj = new URL(url);
      console.log('🔗 [ShortcutsHandler] URL解析成功');
    } catch (error) {
      console.error('🔗 [ShortcutsHandler] URL解析失败:', error);
      return null;
    }

    // 添加详细的URL解析调试信息
    console.log('🔗 [ShortcutsHandler] URL解析详情:', {
      href: urlObj.href,
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      pathname: urlObj.pathname,
      search: urlObj.search,
      hash: urlObj.hash
    });

    // 检查路径是否为智能记账
    // 对于自定义URL scheme，路径可能是 'smart-accounting', '/smart-accounting', 或 '//smart-accounting'
    // 也可能hostname就是路径部分
    const pathname = urlObj.pathname;
    const hostname = urlObj.hostname;

    const isSmartAccountingPath = pathname === 'smart-accounting' ||
                                  pathname === '/smart-accounting' ||
                                  pathname === '//smart-accounting' ||
                                  hostname === 'smart-accounting';

    if (!isSmartAccountingPath) {
      console.log('🔗 [ShortcutsHandler] 非智能记账路径，忽略。实际路径:', pathname, '主机名:', hostname);
      return null;
    }

    console.log('🔗 [ShortcutsHandler] 智能记账路径匹配成功。路径:', pathname, '主机名:', hostname);

    // 获取参数
    const params = urlObj.searchParams;

    // 调试：打印所有URL参数
    console.log('🔗 [ShortcutsHandler] 所有URL参数:');
    for (const [key, value] of params.entries()) {
      console.log(`  ${key}: ${value}`);
    }

    const type = params.get('type') as 'image' | 'get-token';
    const data = params.get('data');
    const imageUrl = params.get('imageUrl');
    const accountId = params.get('accountId');
    const source = params.get('source');

    // 获取X-Callback URL参数
    const xSuccess = params.get('x-success');
    const xCancel = params.get('x-cancel');
    const xError = params.get('x-error');

    console.log('🔗 [ShortcutsHandler] 解析的参数:', {
      type,
      imageUrl,
      data: data ? `${data.substring(0, 50)}...` : null,
      accountId,
      source
    });

    // 验证必需参数 - type是必需的，data是可选的（支持文件传输方式）
    if (!type) {
      console.error('🔗 [ShortcutsHandler] 缺少必需参数:', { type, hasData: !!data });
      return null;
    }

    if (type !== 'image' && type !== 'get-token' && type !== 'android-token') {
      console.error('🔗 [ShortcutsHandler] 无效的类型参数，支持的类型: image, get-token, android-token:', type);
      return null;
    }

    // 验证必需参数
    if (!type) {
      console.error('🔗 [ShortcutsHandler] 缺少type参数');
      return null;
    }

    console.log('🔗 [ShortcutsHandler] URL解析成功:', {
      type,
      dataLength: data?.length || 0,
      hasData: !!data,
      hasImageUrl: !!imageUrl,
      accountId,
      source,
      hasXCallbackUrls: !!(xSuccess || xCancel || xError),
      urlLength: url.length
    });

    return {
      type,
      data: data || undefined,
      imageUrl: imageUrl || undefined,
      accountId: accountId || undefined,
      source: source || 'shortcuts',
      xSuccess,
      xCancel,
      xError
    };

  } catch (error) {
    console.error('🔗 [ShortcutsHandler] URL解析失败:', error);
    return null;
  }
}



/**
 * 处理图片记账
 */
async function handleImageAccounting(
  imageData: string | null,
  accountId?: string
): Promise<ShortcutsHandleResult> {
  try {
    console.log('🖼️ [ShortcutsHandler] 开始图片记账:', {
      dataLength: imageData?.length || 0,
      hasData: !!imageData,
      accountId
    });

    // 获取当前账本ID
    const currentAccountId = accountId || useAccountBookStore.getState().currentAccountBook?.id;

    if (!currentAccountId) {
      return {
        success: false,
        message: '未找到可用的账本，请先选择账本'
      };
    }

    let formData: FormData;

    // 检查是否有Base64数据（旧版本兼容）
    if (imageData && imageData.length > 100) {
      console.log('🖼️ [ShortcutsHandler] 使用URL中的Base64数据:', { dataLength: imageData.length });

      // 将Base64数据转换为Blob
      const base64Data = imageData.includes(',') ? imageData.split(',')[1] : imageData;
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: 'image/jpeg' });

      // 创建FormData
      formData = new FormData();
      formData.append('image', blob, 'shortcuts-screenshot.jpg');
      formData.append('accountBookId', currentAccountId);
    } else {
      console.log('🖼️ [ShortcutsHandler] 尝试从App Groups共享目录读取图片文件');

      // 从App Groups共享目录读取图片文件
      try {
        const { Filesystem, Directory } = await import('@capacitor/filesystem');

        // 尝试多个可能的文件名
        const possibleFileNames = [
          'shortcuts-image.jpg',
          'shortcuts-screenshot.jpg',
          'shortcut-image.jpg',
          'image.jpg'
        ];

        let fileResult: any = null;
        let actualFileName = '';

        // 尝试从App Groups目录读取文件
        for (const fileName of possibleFileNames) {
          try {
            console.log(`🖼️ [ShortcutsHandler] 尝试读取App Groups文件: ${fileName}`);

            // 使用App Groups路径
            fileResult = await Filesystem.readFile({
              path: `group.cn.zhiweijz.shared/${fileName}`,
              directory: Directory.Library
            });

            actualFileName = fileName;
            console.log('🖼️ [ShortcutsHandler] 在App Groups找到文件:', fileName);
            break;
          } catch (error) {
            console.log(`🖼️ [ShortcutsHandler] App Groups文件不存在: ${fileName}`);
            continue;
          }
        }

        if (!fileResult) {
          throw new Error('未在App Groups共享目录中找到图片文件，请确保快捷指令正确保存了文件到共享目录');
        }

        // 将base64数据转换为Blob
        const base64Data = fileResult.data as string;
        const binaryString = atob(base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'image/jpeg' });

        console.log('🖼️ [ShortcutsHandler] 成功读取文件:', {
          fileName: actualFileName,
          size: blob.size
        });

        // 创建FormData
        formData = new FormData();
        formData.append('image', blob, actualFileName);
        formData.append('accountBookId', currentAccountId);

      } catch (fileError) {
        console.error('🖼️ [ShortcutsHandler] App Groups文件读取失败:', fileError);
        throw new Error('无法从App Groups共享目录读取图片文件，请确保快捷指令正确保存了文件并配置了App Groups');
      }
    }

    // 调用现有的图片智能记账API
    const response = await apiClient.post(
      `/ai/smart-accounting/vision`,
      formData,
      {
        timeout: 120000, // 图片处理需要更长时间
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      }
    );

    console.log('🖼️ [ShortcutsHandler] 图片记账成功:', response);

    return {
      success: true,
      message: '图片识别并记账成功！',
      transactionId: response.id
    };

  } catch (error: any) {
    console.error('🖼️ [ShortcutsHandler] 图片记账失败:', error);

    let errorMessage = '图片记账失败，请稍后重试';

    if (error.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage,
      error: error.response?.data?.type || 'UNKNOWN_ERROR'
    };
  }
}

/**
 * 主要的快捷指令深度链接处理函数
 */
export async function handleShortcutsDeepLink(url: string): Promise<ShortcutsHandleResult> {
  console.log('🚀 [ShortcutsHandler] 开始处理快捷指令深度链接:', url);

  // 解析URL参数
  const params = parseShortcutsUrl(url);
  if (!params) {
    // 如果是分段传输，不显示错误
    if (url.includes('part=') && url.includes('total=')) {
      console.log('🔗 [ShortcutsHandler] 收到分段数据，等待更多分段');
      return {
        success: true,
        message: '正在接收分段数据...'
      };
    }
    return {
      success: false,
      message: 'URL格式错误'
    };
  }

  // 触发处理开始事件
  emitShortcutsEvent('processing');

  try {
    let result: ShortcutsHandleResult;

    if (params.type === 'get-token') {
      // 获取上传token并通过X-Callback URL返回
      result = await handleGetTokenWithCallback(params.source);

      // 如果获取成功，通过X-Callback URL返回到快捷指令
      if (result.success && result.data) {
        toast.success('Token获取成功，正在返回快捷指令', {
          duration: 2000
        });

        // 通过X-Callback URL返回结果给快捷指令
        if (params.xSuccess) {
          handleXCallbackSuccess(params.xSuccess, result.data);
        }

        return result;
      } else {
        // 如果获取失败，调用x-error回调
        if (params.xError) {
          handleXCallbackError(params.xError, result.message);
        }
        return result;
      }
    } else if (params.type === 'android-token') {
      // 获取Android专用token
      result = await handleGetAndroidToken(params.source);

      // 显示结果给用户
      if (result.success && result.data) {
        toast.success('Android Token获取成功！', {
          description: '请复制以下信息到MacroDroid中配置',
          duration: 5000
        });

        // 显示Android配置信息
        if (typeof window !== 'undefined') {
          const event = new CustomEvent('showAndroidTokenDialog', {
            detail: result.data
          });
          window.dispatchEvent(event);
        }

        return result;
      } else {
        toast.error(result.message, {
          description: 'Android Token获取失败',
          duration: 5000
        });
        return result;
      }
    } else if (params.type === 'image') {
      // 图片记账 - 打开智能记账模态框并复用UI
      if (params.imageUrl) {
        // 通过图片URL记账，复用智能记账模态框UI
        result = await handleImageAccountingWithUI(params.imageUrl, params.accountId);
      } else if (params.data) {
        // 通过Base64数据记账（向后兼容）
        result = await handleImageAccounting(params.data, params.accountId);
      } else {
        result = {
          success: false,
          message: '缺少图片数据或图片URL'
        };
      }
    } else {
      result = {
        success: false,
        message: '不支持的操作类型'
      };
    }

    // 显示结果
    toast.dismiss('shortcuts-processing');

    if (result.success) {
      toast.success(result.message, {
        description: '快捷指令记账完成',
        duration: 3000
      });
      emitShortcutsEvent('success', { message: result.message, transactionId: result.transactionId });
    } else {
      toast.error(result.message, {
        description: '快捷指令记账失败',
        duration: 5000
      });
      emitShortcutsEvent('error', { message: result.message });
    }

    return result;

  } catch (error) {
    console.error('🚀 [ShortcutsHandler] 处理失败:', error);

    toast.dismiss('shortcuts-processing');
    const errorMessage = '处理快捷指令请求时发生错误';
    toast.error(errorMessage);
    emitShortcutsEvent('error', { message: errorMessage });

    return {
      success: false,
      message: '处理失败'
    };
  }
}

/**
 * 获取Android专用token
 */
async function handleGetAndroidToken(source?: string): Promise<ShortcutsHandleResult> {
  try {
    console.log('🤖 [AndroidHandler] 开始获取Android token');

    const response = await apiClient.get('/ai/shortcuts/token');

    console.log('🤖 [AndroidHandler] API响应:', {
      status: response?.status,
      data: response?.data || response,
      hasSuccess: !!(response?.data?.success || response?.success),
      hasToken: !!(response?.data?.token || response?.token)
    });

    // 检查响应数据
    const responseData = response?.data || response;

    if (responseData?.success && responseData?.token) {
      console.log('🤖 [AndroidHandler] 获取token成功');

      // 动态确定API基础URL
      let apiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL;
      if (!apiBaseUrl) {
        // 从当前页面URL推断API地址
        const currentUrl = window.location.origin;
        if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) {
          apiBaseUrl = 'http://localhost:3000';
        } else if (currentUrl.includes('jz-dev.jacksonz.cn')) {
          apiBaseUrl = 'https://jz-dev.jacksonz.cn:4443';
        } else {
          apiBaseUrl = 'https://app.zhiweijz.cn:1443';
        }
      }

      // 返回Android配置信息
      const androidConfig = {
        token: responseData.token,
        uploadUrl: `${apiBaseUrl}/api/ai/android/screenshot-accounting`,
        checkTokenUrl: `${apiBaseUrl}/api/ai/shortcuts/check-token`,
        expiresIn: responseData.expiresIn,
        expiresAt: responseData.expiresAt,
        // MacroDroid配置说明
        macrodroidConfig: {
          httpMethod: 'POST',
          contentType: 'multipart/form-data',
          authorizationHeader: `Bearer ${responseData.token}`,
          fileFieldName: 'image',
          bodyParameters: {
            accountBookId: '可选，不填则使用默认账本'
          }
        }
      };

      return {
        success: true,
        message: 'Android Token获取成功',
        data: androidConfig
      };
    } else {
      console.error('🤖 [AndroidHandler] Token获取失败 - 响应格式不正确:', responseData);
      return {
        success: false,
        message: 'Android Token获取失败 - 响应格式不正确'
      };
    }
  } catch (error: any) {
    console.error('🤖 [AndroidHandler] 获取token失败:', {
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      url: error?.config?.url,
      method: error?.config?.method,
      fullError: error
    });

    let errorMessage = 'Android Token获取失败';
    if (error?.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * 获取上传token并通过X-Callback URL返回
 */
async function handleGetTokenWithCallback(source?: string): Promise<ShortcutsHandleResult> {
  try {
    console.log('🔑 [ShortcutsHandler] 开始获取上传token');

    const response = await apiClient.get('/ai/shortcuts/token');

    console.log('🔑 [ShortcutsHandler] API响应:', {
      status: response?.status,
      data: response?.data || response,
      hasSuccess: !!(response?.data?.success || response?.success),
      hasToken: !!(response?.data?.token || response?.token)
    });

    // 检查响应数据 - 可能直接在response中，也可能在response.data中
    const responseData = response?.data || response;

    if (responseData?.success && responseData?.token) {
      console.log('🔑 [ShortcutsHandler] 获取token成功');

      // 返回token信息，X-Callback URL会自动将这些数据传递给快捷指令
      const tokenData = {
        token: responseData.token,
        uploadUrl: responseData.uploadUrl,
        checkTokenUrl: responseData.checkTokenUrl,
        expiresIn: responseData.expiresIn
      };

      return {
        success: true,
        message: 'Token获取成功',
        data: tokenData
      };
    } else {
      console.error('🔑 [ShortcutsHandler] Token获取失败 - 响应格式不正确:', responseData);
      return {
        success: false,
        message: 'Token获取失败 - 响应格式不正确'
      };
    }
  } catch (error: any) {
    console.error('🔑 [ShortcutsHandler] 获取token失败:', {
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      url: error?.config?.url,
      method: error?.config?.method,
      fullError: error
    });

    let errorMessage = 'Token获取失败';
    if (error?.response?.data?.error) {
      errorMessage = error.response.data.error;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * 检查App是否已完全初始化
 */
function isAppFullyInitialized(): boolean {
  // 检查关键组件是否已加载
  const hasBottomNav = document.querySelector('.enhanced-bottom-navigation') !== null;
  const hasProviders = document.querySelector('[data-providers-loaded]') !== null;

  // 检查事件监听器是否已注册（通过检查是否有相关的DOM元素）
  const hasEventListeners = typeof window !== 'undefined' &&
    window.addEventListener &&
    document.readyState === 'complete';

  console.log('🔍 [ShortcutsHandler] App初始化状态检查:', {
    hasBottomNav,
    hasProviders,
    hasEventListeners,
    readyState: document.readyState
  });

  return hasBottomNav && hasEventListeners;
}

/**
 * 等待App完全初始化
 */
async function waitForAppInitialization(maxWaitTime = 10000): Promise<boolean> {
  const startTime = Date.now();
  const checkInterval = 200; // 每200ms检查一次

  while (Date.now() - startTime < maxWaitTime) {
    if (isAppFullyInitialized()) {
      console.log('✅ [ShortcutsHandler] App已完全初始化');
      return true;
    }

    console.log('⏳ [ShortcutsHandler] 等待App初始化...');
    await new Promise(resolve => setTimeout(resolve, checkInterval));
  }

  console.warn('⚠️ [ShortcutsHandler] App初始化等待超时');
  return false;
}

/**
 * 带重试机制的智能记账模态框触发
 */
async function triggerSmartAccountingDialogWithRetry(shortcutData: any, maxRetries = 3): Promise<ShortcutsHandleResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`🔄 [ShortcutsHandler] 尝试触发智能记账模态框 (第${attempt}次)`);

    try {
      // 触发打开智能记账模态框的事件
      if (typeof window !== 'undefined') {
        const event = new CustomEvent('openSmartAccountingDialog', {
          detail: {
            type: 'shortcut-image',
            imageUrl: shortcutData.imageUrl,
            accountBookId: shortcutData.accountBookId
          }
        });
        window.dispatchEvent(event);
        console.log('📡 [ShortcutsHandler] 事件已触发');
      }

      // 等待一段时间，检查是否成功
      await new Promise(resolve => setTimeout(resolve, 1000));

      // 检查sessionStorage中的数据是否被消费（表示模态框已处理）
      const remainingData = sessionStorage.getItem('shortcutImageData');
      if (!remainingData) {
        console.log('✅ [ShortcutsHandler] 快捷指令数据已被处理，模态框成功打开');
        return {
          success: true,
          message: '正在打开智能记账界面...'
        };
      }

      console.log(`⏳ [ShortcutsHandler] 第${attempt}次尝试未成功，等待重试...`);

      if (attempt < maxRetries) {
        // 等待更长时间再重试
        await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
      }

    } catch (error) {
      console.error(`❌ [ShortcutsHandler] 第${attempt}次尝试失败:`, error);
    }
  }

  console.warn('⚠️ [ShortcutsHandler] 所有重试都失败，但数据已保存，用户打开App时会自动处理');
  return {
    success: true,
    message: '快捷指令数据已保存，请打开App查看'
  };
}

/**
 * 通过图片URL进行记账，复用智能记账模态框UI（带重试机制）
 */
async function handleImageAccountingWithUI(
  imageUrl: string,
  accountId?: string
): Promise<ShortcutsHandleResult> {
  try {
    console.log('🖼️ [ShortcutsHandler] 开始快捷指令图片记账，复用UI:', { imageUrl: imageUrl.substring(0, 100) + '...' });

    // 获取当前账本ID
    let currentAccountId = accountId;
    if (!currentAccountId) {
      const accountBookStore = useAccountBookStore.getState();
      currentAccountId = accountBookStore.currentAccountBook?.id;

      console.log('🖼️ [ShortcutsHandler] 从store获取账本ID:', {
        hasCurrentAccountBook: !!accountBookStore.currentAccountBook,
        accountId: currentAccountId
      });
    }

    if (!currentAccountId) {
      toast.error('请先在App中选择账本');
      return {
        success: false,
        message: '无法获取当前账本ID，请先选择账本'
      };
    }

    // 等待App完全初始化
    console.log('🖼️ [ShortcutsHandler] 等待App完全初始化...');
    const isInitialized = await waitForAppInitialization();

    if (!isInitialized) {
      console.warn('⚠️ [ShortcutsHandler] App初始化超时，尝试继续处理');
    }

    // 将快捷指令数据保存到sessionStorage（持久化存储）
    const shortcutData = {
      type: 'shortcut-image',
      imageUrl,
      accountBookId: currentAccountId,
      timestamp: Date.now()
    };

    sessionStorage.setItem('shortcutImageData', JSON.stringify(shortcutData));
    console.log('💾 [ShortcutsHandler] 快捷指令数据已保存到sessionStorage');

    // 尝试触发事件，带重试机制
    return await triggerSmartAccountingDialogWithRetry(shortcutData, 3);

  } catch (error: any) {
    console.error('🖼️ [ShortcutsHandler] 打开智能记账界面失败:', error);

    toast.error('打开智能记账界面失败，请重试', {
      duration: 5000
    });

    return {
      success: false,
      message: '打开智能记账界面失败'
    };
  }
}

/**
 * 通过图片URL进行记账（原始逻辑，保留作为备用）
 */
async function handleImageAccountingByUrl(
  imageUrl: string,
  accountId?: string
): Promise<ShortcutsHandleResult> {
  try {
    console.log('🖼️ [ShortcutsHandler] 开始通过图片URL记账:', { imageUrl: imageUrl.substring(0, 100) + '...' });

    // 获取当前账本ID
    let currentAccountId = accountId;
    if (!currentAccountId) {
      // 从账本store获取当前账本ID
      const accountBookStore = useAccountBookStore.getState();
      currentAccountId = accountBookStore.currentAccountBook?.id;

      console.log('🖼️ [ShortcutsHandler] 从store获取账本ID:', {
        hasCurrentAccountBook: !!accountBookStore.currentAccountBook,
        accountId: currentAccountId
      });
    }

    if (!currentAccountId) {
      toast.error('请先在App中选择账本');
      return {
        success: false,
        message: '无法获取当前账本ID，请先选择账本'
      };
    }

    // 显示开始处理的通知
    toast.info('快捷指令启动，正在识别图片...', {
      duration: 3000
    });

    // 第一步：调用快捷指令图片识别API，获取识别文本
    console.log('🖼️ [ShortcutsHandler] 第一步：调用图片识别API');

    // 图片识别API调用，带重试机制
    let visionResponse;
    let visionRetryCount = 0;
    const maxVisionRetries = 2;

    while (visionRetryCount <= maxVisionRetries) {
      try {
        visionResponse = await apiClient.post(
          `/ai/shortcuts/image-accounting`,
          {
            imageUrl,
            accountBookId: currentAccountId
          },
          { timeout: 120000 } // 图片处理需要更长时间
        );
        break; // 成功则跳出循环
      } catch (error: any) {
        visionRetryCount++;
        console.error(`🖼️ [ShortcutsHandler] 图片识别失败 (尝试 ${visionRetryCount}/${maxVisionRetries + 1}):`, error);

        // 检查是否是网络连接错误且还有重试次数
        if (visionRetryCount <= maxVisionRetries && (
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNABORTED' ||
          error.message?.includes('socket hang up') ||
          error.message?.includes('timeout')
        )) {
          console.log(`🖼️ [ShortcutsHandler] 网络错误，${3000 * visionRetryCount}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, 3000 * visionRetryCount)); // 递增延迟
          continue;
        }

        // 如果不是网络错误或已达到最大重试次数，抛出错误
        throw error;
      }
    }

    console.log('🖼️ [ShortcutsHandler] 图片识别成功:', visionResponse.data);

    // 检查是否有识别的文本
    if (!visionResponse.data?.text) {
      return {
        success: false,
        message: '图片识别失败，未能提取到有效信息'
      };
    }

    let recognizedText = visionResponse.data.text;
    console.log('🖼️ [ShortcutsHandler] 识别到的文本长度:', recognizedText.length);
    console.log('🖼️ [ShortcutsHandler] 识别到的文本预览:', recognizedText.substring(0, 200) + '...');

    // 限制文本长度，避免过长的文本导致LLM处理超时
    const MAX_TEXT_LENGTH = 2000; // 限制为2000字符
    if (recognizedText.length > MAX_TEXT_LENGTH) {
      console.log(`🖼️ [ShortcutsHandler] 文本过长(${recognizedText.length}字符)，截取前${MAX_TEXT_LENGTH}字符`);
      recognizedText = recognizedText.substring(0, MAX_TEXT_LENGTH) + '...';
    }

    // 第二步：使用识别的文本进行智能记账
    console.log('🖼️ [ShortcutsHandler] 第二步：调用智能记账API');

    // 显示toast通知
    toast.success('图片识别成功，正在创建记账记录...', {
      duration: 3000
    });

    // 智能记账API调用，带重试机制
    let smartAccountingResponse;
    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount <= maxRetries) {
      try {
        smartAccountingResponse = await apiClient.post(
          `/ai/account/${currentAccountId}/smart-accounting/direct`,
          {
            description: recognizedText,
            source: 'image_recognition',
            isFromImageRecognition: true // 关键：设置图片识别标识，确保多条记录时触发选择模态框
          },
          { timeout: 60000 }
        );
        break; // 成功则跳出循环
      } catch (error: any) {
        retryCount++;
        console.error(`🖼️ [ShortcutsHandler] 智能记账失败 (尝试 ${retryCount}/${maxRetries + 1}):`, error);

        // 检查是否是网络连接错误且还有重试次数
        if (retryCount <= maxRetries && (
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNABORTED' ||
          error.message?.includes('socket hang up') ||
          error.message?.includes('timeout')
        )) {
          console.log(`🖼️ [ShortcutsHandler] 网络错误，${2000 * retryCount}ms后重试...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * retryCount)); // 递增延迟
          continue;
        }

        // 如果不是网络错误或已达到最大重试次数，抛出错误
        throw error;
      }
    }

    console.log('🖼️ [ShortcutsHandler] 智能记账响应:', smartAccountingResponse.data);

    // 检查是否需要用户选择记录
    if (smartAccountingResponse.data?.requiresUserSelection && smartAccountingResponse.data?.records) {
      console.log('📝 [ShortcutsHandler] 检测到多条记录，需要用户选择:', smartAccountingResponse.data.records.length);

      // 显示提示信息，引导用户到App中选择记录
      toast.info(`检测到${smartAccountingResponse.data.records.length}条记账记录，请在App中选择需要导入的记录`, {
        duration: 6000
      });

      // 将记录数据保存到sessionStorage，供前端使用
      sessionStorage.setItem('pendingTransactionRecords', JSON.stringify({
        records: smartAccountingResponse.data.records,
        accountBookId: currentAccountId,
        source: 'shortcuts',
        timestamp: Date.now()
      }));

      // 触发事件通知前端有待处理的记录
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pendingTransactionRecords', {
          detail: {
            records: smartAccountingResponse.data.records,
            accountBookId: currentAccountId,
            source: 'shortcuts'
          }
        }));
      }

      return {
        success: true,
        message: `检测到${smartAccountingResponse.data.records.length}条记账记录，请在App中选择`,
        requiresUserSelection: true,
        data: {
          visionResult: visionResponse.data,
          records: smartAccountingResponse.data.records,
          accountBookId: currentAccountId
        }
      };
    }

    // 第三步：刷新仪表盘数据（复用前端模态框逻辑）
    try {
      console.log('🖼️ [ShortcutsHandler] 第三步：刷新仪表盘数据');
      const dashboardStore = useDashboardStore.getState();
      await dashboardStore.refreshDashboardData(currentAccountId);
      console.log('🖼️ [ShortcutsHandler] 仪表盘数据刷新完成');
    } catch (refreshError) {
      console.error('🖼️ [ShortcutsHandler] 刷新仪表盘数据失败:', refreshError);
      // 不影响主流程，继续执行
    }

    // 显示成功通知
    const successMessage = smartAccountingResponse.data?.id
      ? '快捷指令记账完成！'
      : `快捷指令记账完成，已创建${smartAccountingResponse.data?.count || 1}条记录`;

    toast.success(successMessage, {
      duration: 4000
    });

    return {
      success: true,
      message: successMessage,
      data: {
        visionResult: visionResponse.data,
        accountingResult: smartAccountingResponse.data,
        transactionId: smartAccountingResponse.data?.id
      }
    };
  } catch (error: any) {
    console.error('🖼️ [ShortcutsHandler] 图片记账失败:', {
      message: error?.message,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      url: error?.config?.url,
      method: error?.config?.method,
      fullError: error
    });

    let errorMessage = '快捷指令记账失败';
    let toastMessage = '快捷指令记账失败，请重试';

    if (error?.response?.data?.error) {
      errorMessage = error.response.data.error;
      toastMessage = error.response.data.error;
    } else if (error?.response?.data?.message) {
      errorMessage = error.response.data.message;
      toastMessage = error.response.data.message;
    } else if (error?.message) {
      errorMessage = error.message;
      if (error.message.includes('timeout')) {
        toastMessage = '处理超时，请检查网络连接后重试';
      } else if (error.message.includes('Network')) {
        toastMessage = '网络连接失败，请检查网络后重试';
      } else {
        toastMessage = error.message;
      }
    }

    // 显示错误通知
    toast.error(toastMessage, {
      duration: 5000
    });

    return {
      success: false,
      message: errorMessage
    };
  }
}

/**
 * 触发快捷指令事件的工具函数
 */
function emitShortcutsEvent(type: 'processing' | 'success' | 'error', data?: any) {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('shortcuts-event', {
      detail: { type, data }
    });
    window.dispatchEvent(event);
  }
}

/**
 * 注册快捷指令深度链接处理器
 * 应该在应用启动时调用
 */
export function registerShortcutsDeepLinkHandler(): void {
  if (typeof window === 'undefined') {
    console.log('🔗 [ShortcutsHandler] 非浏览器环境，跳过注册');
    return;
  }

  const capacitor = (window as any).Capacitor;
  if (!capacitor?.Plugins?.App) {
    console.log('🔗 [ShortcutsHandler] Capacitor App插件不可用，跳过注册');
    return;
  }

  // 监听URL打开事件
  capacitor.Plugins.App.addListener('appUrlOpen', (data: { url: string }) => {
    console.log('🔗 [ShortcutsHandler] 收到URL打开事件:', data.url);
    
    // 异步处理，避免阻塞
    setTimeout(() => {
      handleShortcutsDeepLink(data.url);
    }, 100);
  });

  console.log('🔗 [ShortcutsHandler] 快捷指令深度链接处理器已注册');
}
