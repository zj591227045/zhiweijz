import { Request } from 'express';

export type CallSource = 'App' | 'WeChat' | 'API';

/**
 * 来源检测工具类
 * 根据请求特征自动识别调用来源
 */
export class SourceDetectionUtil {
  /**
   * 检测调用来源
   * @param req Express请求对象
   * @returns 调用来源类型
   */
  static detectSource(req: Request | any): CallSource {
    // 检查是否是真正的Express请求对象
    const isExpressRequest = typeof req.get === 'function';

    // 添加调试日志
    console.log('🔍 [来源检测] 开始检测请求来源:', {
      isExpressRequest,
      path: req.path,
      method: req.method,
      userAgent: isExpressRequest ? req.get('User-Agent') : undefined,
      hasFromUserName: !!req.body?.FromUserName,
      hasToUserName: !!req.body?.ToUserName,
      hasMsgType: !!req.body?.MsgType,
      bodyKeys: Object.keys(req.body || {}),
      isWeChatMockRequest: !isExpressRequest && req.user?.id, // 微信模拟请求的特征
    });

    // 特殊处理：如果不是Express请求对象，但有用户ID，很可能是微信模拟请求
    if (!isExpressRequest && req.user?.id) {
      console.log('🔍 [来源检测] 识别为微信模拟请求');
      return 'WeChat';
    }

    // 1. 检查是否来自微信服务号
    if (this.isWeChatSource(req)) {
      console.log('🔍 [来源检测] 识别为微信来源');
      return 'WeChat';
    }

    // 2. 检查是否为直接API调用
    if (this.isDirectAPICall(req)) {
      console.log('🔍 [来源检测] 识别为API调用');
      return 'API';
    }

    // 3. 默认为App调用（包括Web应用和移动应用）
    console.log('🔍 [来源检测] 识别为App调用');
    return 'App';
  }

  /**
   * 检查是否来自微信服务号
   * @param req Express请求对象
   * @returns 是否为微信来源
   */
  private static isWeChatSource(req: Request | any): boolean {
    // 检查请求路径是否包含微信相关路径
    const wechatPaths = ['/api/wechat', '/wechat'];
    const isWeChatPath = wechatPaths.some(path => req.path.startsWith(path));

    // 检查请求头中是否包含微信相关标识
    const userAgent = (typeof req.get === 'function' ? req.get('User-Agent') : '') || '';
    const isWeChatUserAgent = userAgent.includes('MicroMessenger');

    // 检查是否有微信相关的请求头或参数
    const hasWeChatHeaders = !!(
      (typeof req.get === 'function' && req.get('X-WeChat-OpenId')) ||
      (typeof req.get === 'function' && req.get('X-WeChat-Source')) ||
      req.body?.openid ||
      req.query?.openid ||
      // 检查微信XML解析后的数据结构
      req.body?.FromUserName ||
      req.body?.ToUserName ||
      req.body?.MsgType
    );

    console.log('🔍 [微信检测] 详细信息:', {
      isWeChatPath,
      isWeChatUserAgent,
      hasWeChatHeaders,
      path: req.path,
      userAgent,
      bodyFromUserName: req.body?.FromUserName,
      bodyToUserName: req.body?.ToUserName,
      bodyMsgType: req.body?.MsgType,
    });

    return isWeChatPath || isWeChatUserAgent || hasWeChatHeaders;
  }

  /**
   * 检查是否为直接API调用
   * @param req Express请求对象
   * @returns 是否为直接API调用
   */
  private static isDirectAPICall(req: Request | any): boolean {
    // 如果不是Express请求对象，不能是API调用
    if (typeof req.get !== 'function') {
      return false;
    }

    // 检查User-Agent是否表明这是一个API客户端
    const userAgent = req.get('User-Agent') || '';
    const apiUserAgents = [
      'curl',
      'wget',
      'postman',
      'insomnia',
      'httpie',
      'python-requests',
      'node-fetch',
      'axios',
      'okhttp',
      'java',
      'go-http-client',
      'ruby',
      'php',
      'api-client'
    ];

    const isAPIUserAgent = apiUserAgents.some(agent => 
      userAgent.toLowerCase().includes(agent.toLowerCase())
    );

    // 检查是否有API密钥或特殊的认证头
    const hasAPIKey = !!(
      req.get('X-API-Key') ||
      req.get('X-API-Token') ||
      req.get('X-Client-Type') === 'api'
    );

    // 检查Content-Type是否表明这是API调用
    const contentType = req.get('Content-Type') || '';
    const isAPIContentType = contentType.includes('application/json') && 
      !req.get('Referer'); // 没有Referer通常表明不是浏览器发起的请求

    // 检查是否缺少浏览器特有的请求头
    const lacksBrowserHeaders = !(
      req.get('Accept-Language') &&
      req.get('Accept-Encoding') &&
      req.get('Cache-Control')
    );

    return isAPIUserAgent || hasAPIKey || (isAPIContentType && lacksBrowserHeaders);
  }

  /**
   * 获取详细的来源信息
   * @param req Express请求对象
   * @returns 详细的来源信息
   */
  static getDetailedSourceInfo(req: Request | any): {
    source: CallSource;
    userAgent: string;
    referer?: string;
    clientType?: string;
    platform?: string;
  } {
    const source = this.detectSource(req);
    const userAgent = (typeof req.get === 'function' ? req.get('User-Agent') : '') || '';
    const referer = typeof req.get === 'function' ? req.get('Referer') : undefined;
    const clientType = typeof req.get === 'function' ? req.get('X-Client-Type') : undefined;

    let platform = 'unknown';
    
    if (source === 'WeChat') {
      platform = 'wechat';
    } else if (source === 'API') {
      platform = 'api';
    } else {
      // 检测App平台
      if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
        platform = 'mobile';
      } else if (userAgent.includes('Electron')) {
        platform = 'desktop';
      } else {
        platform = 'web';
      }
    }

    return {
      source,
      userAgent,
      referer,
      clientType,
      platform,
    };
  }

  /**
   * 记录来源检测日志（用于调试）
   * @param req Express请求对象
   * @param detectedSource 检测到的来源
   */
  static logSourceDetection(req: Request, detectedSource: CallSource): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Source Detection]', {
        path: req.path,
        method: req.method,
        detectedSource,
        userAgent: req.get('User-Agent'),
        referer: req.get('Referer'),
        contentType: req.get('Content-Type'),
        hasWeChatHeaders: !!(req.get('X-WeChat-OpenId') || req.body?.openid),
        hasAPIHeaders: !!(req.get('X-API-Key') || req.get('X-API-Token')),
      });
    }
  }
}
