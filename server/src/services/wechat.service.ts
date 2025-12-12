import { logger } from '../utils/logger';
import crypto from 'crypto';
import axios from 'axios';
import bcrypt from 'bcrypt';
import config from '../config/config';
import prisma from '../config/database';
import { AIController } from '../controllers/ai-controller';
import { WechatBindingService } from './wechat-binding.service';
import { WechatSmartAccountingService } from './wechat-smart-accounting.service';
import { WechatQueryIntentService } from './wechat-query-intent.service';
import { WechatMediaService } from './wechat-media.service';
import { MultimodalAIController } from '../controllers/multimodal-ai.controller';
import { AudioConversionService } from './audio-conversion.service';

export interface WechatMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: string;
  MsgType: string;
  Content?: string;
  MsgId?: string;
  Event?: string;
  EventKey?: string;
  // 语音消息字段
  MediaId?: string;
  Format?: string;
  Recognition?: string;
  // 图片消息字段
  PicUrl?: string;
}

export interface WechatResponse {
  ToUserName: string;
  FromUserName: string;
  CreateTime: number;
  MsgType: string;
  Content: string;
}

export class WechatService {
  private readonly appId: string;
  private readonly appSecret: string;
  private readonly token: string;
  private readonly encodingAESKey?: string;
  private aiController: AIController;
  private bindingService: WechatBindingService;
  private smartAccountingService: WechatSmartAccountingService;
  private queryIntentService: WechatQueryIntentService;
  private mediaService: WechatMediaService;
  private multimodalController: MultimodalAIController;
  private audioConversionService: AudioConversionService;
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!(config.wechat?.appId && config.wechat?.appSecret && config.wechat?.token);

    if (!this.isEnabled) {
      logger.warn('⚠️ 微信配置未设置，微信功能将被禁用');
      // 设置默认值以避免运行时错误
      this.appId = '';
      this.appSecret = '';
      this.token = '';
      this.encodingAESKey = '';
    } else {
      this.appId = config.wechat!.appId;
      this.appSecret = config.wechat!.appSecret;
      this.token = config.wechat!.token;
      this.encodingAESKey = config.wechat!.encodingAESKey;
      logger.info('✅ 微信服务已启用');
    }

    this.aiController = new AIController();
    this.bindingService = new WechatBindingService();
    this.smartAccountingService = new WechatSmartAccountingService();
    this.queryIntentService = new WechatQueryIntentService();
    this.mediaService = new WechatMediaService();
    this.multimodalController = new MultimodalAIController();
    this.audioConversionService = AudioConversionService.getInstance();
  }

  /**
   * 检查微信服务是否已启用
   */
  public isWechatEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * 获取微信访问令牌
   */
  private async getAccessToken(): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('微信服务未启用');
    }

    try {
      const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
        params: {
          grant_type: 'client_credential',
          appid: this.appId,
          secret: this.appSecret,
        },
      });

      if (response.data.errcode) {
        throw new Error(`获取access_token失败: ${response.data.errmsg}`);
      }

      return response.data.access_token;
    } catch (error) {
      logger.error('获取微信access_token失败:', error);
      throw error;
    }
  }

  /**
   * 创建微信自定义菜单
   */
  public async createMenu(): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.isEnabled) {
      return {
        success: false,
        error: '微信服务未启用',
      };
    }

    try {
      const accessToken = await this.getAccessToken();

      // 构建微信授权URL
      const redirectUri = encodeURIComponent('https://wxapp.zhiweijz.cn/api/wechat/binding-page');
      const authUrl = `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${this.appId}&redirect_uri=${redirectUri}&response_type=code&scope=snsapi_base&state=binding#wechat_redirect`;

      const menuConfig = {
        button: [
          {
            type: 'view',
            name: '访问官网',
            url: 'https://www.zhiweijz.cn',
          },
          {
            type: 'view',
            name: '账号绑定',
            url: authUrl,
          },
          {
            type: 'view',
            name: '下载App',
            url: 'https://www.zhiweijz.cn/downloads',
          },
        ],
      };

      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${accessToken}`,
        menuConfig,
      );

      if (response.data.errcode === 0) {
        logger.info('微信菜单创建成功');
        return {
          success: true,
          data: response.data,
        };
      } else {
        logger.error('微信菜单创建失败:', response.data);
        return {
          success: false,
          error: `创建失败: ${response.data.errmsg}`,
        };
      }
    } catch (error) {
      logger.error('创建微信菜单异常:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 验证微信服务器签名
   */
  verifySignature(signature: string, timestamp: string, nonce: string, echostr?: string): boolean {
    if (!this.isEnabled) {
      logger.warn('微信服务未启用，签名验证失败');
      return false;
    }

    const tmpArr = [this.token, timestamp, nonce].sort();
    const tmpStr = tmpArr.join('');
    const sha1 = crypto.createHash('sha1').update(tmpStr).digest('hex');

    const isValid = sha1 === signature;

    if (!isValid) {
      logger.info('微信签名验证失败');
    }

    return isValid;
  }

  /**
   * 处理微信消息
   */
  async handleMessage(message: WechatMessage): Promise<WechatResponse> {
    if (!this.isEnabled) {
      return this.createResponse(message, '微信服务未启用，请联系管理员配置微信相关参数。');
    }

    const startTime = Date.now();
    const openid = message.FromUserName;

    try {
      // 记录消息日志
      await this.logMessage(
        openid,
        message.MsgType,
        message.Content || message.Event || '',
        'pending',
      );

      let responseContent = '';

      // 检查消息类型并处理
      switch (message.MsgType) {
        case 'text':
          responseContent = await this.handleTextMessage(openid, message.Content || '');
          break;
        case 'event':
          responseContent = await this.handleEventMessage(openid, message);
          break;
        case 'image':
          responseContent = await this.handleImageMessage(openid, message);
          break;
        case 'voice':
          responseContent = await this.handleVoiceMessage(openid, message);
          break;
        case 'video':
          responseContent = '暂不支持视频消息，请发送文字进行记账。\n\n发送"帮助"查看使用说明。';
          break;
        case 'location':
          responseContent = '暂不支持位置消息，请发送文字进行记账。\n\n发送"帮助"查看使用说明。';
          break;
        default:
          responseContent =
            '抱歉，暂不支持此类型消息。\n\n请发送文字消息进行记账，或发送"帮助"查看使用说明。';
      }

      const processingTime = Date.now() - startTime;

      // 更新消息日志
      await this.updateMessageLog(
        openid,
        message.Content || message.Event || '',
        responseContent,
        'success',
        processingTime,
      );

      return this.createResponse(message, responseContent);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      // 记录错误日志
      await this.updateMessageLog(
        openid,
        message.Content || message.Event || '',
        '',
        'failed',
        processingTime,
        errorMessage,
      );

      logger.error('处理微信消息失败:', {
        error: errorMessage,
        openid,
        messageType: message.MsgType,
        content: message.Content || message.Event,
        processingTime,
      });

      // 根据错误类型返回不同的错误消息
      let errorResponse = '抱歉，处理您的消息时出现错误。';

      if (errorMessage.includes('数据库')) {
        errorResponse += '\n\n数据库暂时不可用，请稍后重试。';
      } else if (errorMessage.includes('网络')) {
        errorResponse += '\n\n网络连接异常，请稍后重试。';
      } else if (errorMessage.includes('Token') || errorMessage.includes('限制')) {
        errorResponse += '\n\nAI服务暂时受限，请稍后重试。';
      } else {
        errorResponse += '\n\n请稍后重试，或发送"帮助"查看使用说明。';
      }

      return this.createResponse(message, errorResponse);
    }
  }

  /**
   * 处理文本消息
   */
  private async handleTextMessage(openid: string, content: string): Promise<string> {
    // 清理和标准化输入
    const cleanContent = content.trim();

    if (!cleanContent) {
      return '请发送有效的消息内容。\n\n发送"帮助"查看使用说明。';
    }

    // 检查是否有临时绑定数据（账本选择流程）
    const tempData = this.getTempUserData(openid);
    if (tempData) {
      return await this.handleAccountBookSelection(openid, cleanContent, tempData);
    }

    // 检查用户是否已绑定
    const binding = await this.getUserBinding(openid);

    if (!binding) {
      // 检查是否是绑定命令格式: "绑定 邮箱 密码"
      if (cleanContent.startsWith('绑定 ')) {
        return await this.handleDirectBinding(openid, cleanContent);
      }
      return this.getBindingInstructions();
    }

    if (!binding.is_active) {
      return '您的账号绑定已被禁用，请联系管理员重新激活。\n\n如需帮助，请发送"帮助"。';
    }

    // 检查是否有默认账本
    if (!binding.default_account_book_id) {
      // 如果是设置账本的命令，允许执行
      if (cleanContent.includes('设置账本') || cleanContent.includes('选择账本')) {
        return await this.handleDefaultAccountBookSelection(binding.user_id);
      }
      return '请先设置默认账本。\n\n发送"设置账本"来选择默认账本。';
    }

    // 处理特殊命令 - 使用清理后的内容
    const lowerContent = cleanContent.toLowerCase();

    // 帮助命令 - 优先处理
    if (lowerContent.includes('帮助') || cleanContent === '?' || lowerContent.includes('help')) {
      return this.getHelpMessage();
    }

    // 绑定相关命令
    if (lowerContent.includes('绑定账号') || lowerContent.includes('账号绑定')) {
      return this.getBindingInstructions();
    }

    if (lowerContent.includes('绑定信息') || lowerContent.includes('我的绑定')) {
      return await this.handleBindingInfo(openid);
    }

    if (lowerContent.includes('解除绑定') || lowerContent.includes('取消绑定')) {
      return await this.handleUnbindAccount(openid);
    }

    // 账本管理命令
    if (lowerContent.includes('设置账本') || lowerContent.includes('选择账本')) {
      return await this.handleDefaultAccountBookSelection(binding.user_id);
    }

    // 统计查询命令
    if (
      lowerContent.includes('查看余额') ||
      lowerContent.includes('余额查询') ||
      lowerContent.includes('账本统计')
    ) {
      return await this.handleBalanceQuery(binding.user_id, binding.default_account_book_id);
    }

    if (lowerContent.includes('分类统计') || lowerContent.includes('消费统计')) {
      return await this.handleCategoryStats(binding.user_id, binding.default_account_book_id);
    }

    // 处理账号绑定格式：绑定 邮箱 密码
    if (cleanContent.startsWith('绑定 ')) {
      return await this.handleAccountBinding(openid, cleanContent);
    }

    // 处理账本选择格式：选择1, 选择2等
    if (cleanContent.match(/^选择\d+$/)) {
      return await this.handleAccountBookChoice(openid, cleanContent);
    }

    // 使用智能意图识别
    const intent = this.queryIntentService.recognizeIntent(cleanContent);

    // 根据识别的意图处理
    switch (intent.type) {
      case 'balance':
        return await this.handleBalanceQuery(binding.user_id, binding.default_account_book_id);

      case 'category':
        return await this.handleCategoryStats(binding.user_id, binding.default_account_book_id);

      case 'budget':
        return await this.handleBudgetQuery(binding.user_id, binding.default_account_book_id);

      case 'recent':
        return await this.handleRecentQuery(
          binding.user_id,
          binding.default_account_book_id,
          intent.limit || 5,
        );

      case 'timeRange':
        if (intent.timeRange) {
          return await this.handleTimeRangeQuery(
            binding.user_id,
            binding.default_account_book_id,
            intent.timeRange.start,
            intent.timeRange.end,
            intent.timeRange.period,
          );
        }
        return await this.handleBalanceQuery(binding.user_id, binding.default_account_book_id);

      case 'accounting':
      default:
        // 检查是否是明显的非记账内容
        if (this.isNonAccountingContent(cleanContent)) {
          return '这似乎不是记账信息。\n\n请发送记账信息，例如："50 餐饮 午餐"，或发送"帮助"查看使用说明。';
        }

        // 智能记账处理 - 异步处理，返回空字符串避免超时
        this.handleSmartAccountingAsync(
          openid,
          binding.user_id,
          binding.default_account_book_id,
          cleanContent,
          true,
        );
        return ''; // 返回空字符串，通过客服消息API异步发送结果
    }
  }

  /**
   * 处理直接绑定命令 (文字格式: "绑定 邮箱 密码")
   */
  private async handleDirectBinding(openid: string, content: string): Promise<string> {
    try {
      // 解析绑定命令: "绑定 邮箱 密码"
      const parts = content.split(' ');
      if (parts.length < 3) {
        return '绑定格式错误。\n\n正确格式：绑定 邮箱 密码\n例如：绑定 user@example.com 123456';
      }

      const email = parts[1];
      const password = parts.slice(2).join(' '); // 支持密码中包含空格

      logger.info(`🔗 处理文字绑定: openid=${openid}, email=${email}`);

      // 验证邮箱格式
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return '邮箱格式不正确，请检查后重试。\n\n格式：绑定 邮箱 密码';
      }

      // 调用登录验证
      const loginResult = await this.loginAndGetAccountBooks(email, password);
      
      if (!loginResult.success || !loginResult.data) {
        return `登录失败：${loginResult.message}\n\n请检查邮箱和密码是否正确。`;
      }

      const { user, accountBooks } = loginResult.data;

      // 如果只有一个账本，自动绑定
      if (accountBooks.length === 1) {
        const bindResult = await this.bindWechatAccount(openid, user.id, accountBooks[0].id);
        if (bindResult.success) {
          return `🎉 绑定成功！\n\n账号：${user.name} (${user.email})\n账本：${accountBooks[0].name}\n\n您现在可以发送语音、图片或文字进行记账了！`;
        } else {
          return `绑定失败：${bindResult.message}`;
        }
      }

      // 多个账本，需要用户选择
      let message = `✅ 登录成功！账号：${user.name}\n\n📚 请选择要绑定的账本：\n`;
      accountBooks.forEach((book, index) => {
        const bookType = book.type === 'FAMILY' 
          ? `家庭账本${book.familyName ? ' - ' + book.familyName : ''}` 
          : '个人账本';
        message += `${index + 1}. ${book.name} (${bookType})\n`;
      });
      message += `\n请回复数字 1-${accountBooks.length} 选择账本`;

      // 临时存储用户信息和账本列表
      await this.storeTempUserData(openid, user, accountBooks);

      return message;
    } catch (error) {
      logger.error('处理文字绑定失败:', error);
      return '绑定过程中出现错误，请稍后重试。\n\n如需帮助，请发送"帮助"。';
    }
  }

  /**
   * 临时存储用户数据（用于账本选择）
   */
  private async storeTempUserData(openid: string, user: any, accountBooks: any[]): Promise<void> {
    try {
      // 这里可以使用Redis或数据库临时存储，简单起见使用内存存储
      // 生产环境建议使用Redis
      const tempData = {
        user,
        accountBooks,
        timestamp: Date.now(),
      };
      
      // 临时存储到一个Map中（注意：重启会丢失，生产环境应使用Redis）
      if (!(global as any).tempBindingData) {
        (global as any).tempBindingData = new Map();
      }
      (global as any).tempBindingData.set(openid, tempData);

      // 5分钟后自动清理
      setTimeout(() => {
        if ((global as any).tempBindingData) {
          (global as any).tempBindingData.delete(openid);
        }
      }, 5 * 60 * 1000);
    } catch (error) {
      logger.error('存储临时用户数据失败:', error);
    }
  }

  /**
   * 获取临时用户数据
   */
  private getTempUserData(openid: string): any {
    if (!(global as any).tempBindingData) {
      return null;
    }
    
    const data = (global as any).tempBindingData.get(openid);
    if (!data) {
      return null;
    }

    // 检查是否过期（5分钟）
    if (Date.now() - data.timestamp > 5 * 60 * 1000) {
      (global as any).tempBindingData.delete(openid);
      return null;
    }

    return data;
  }

  /**
   * 处理账本选择（用于绑定流程）
   */
  private async handleAccountBookSelection(openid: string, input: string, tempData: any): Promise<string> {
    try {
      const { user, accountBooks } = tempData;
      
      // 解析用户输入的数字
      const selection = parseInt(input.trim());
      
      if (isNaN(selection) || selection < 1 || selection > accountBooks.length) {
        return `请输入有效的数字 1-${accountBooks.length} 来选择账本。\n\n或发送"取消"退出绑定流程。`;
      }

      const selectedBook = accountBooks[selection - 1];
      
      // 执行绑定
      const bindResult = await this.bindWechatAccount(openid, user.id, selectedBook.id);
      
      // 清理临时数据
      if ((global as any).tempBindingData) {
        (global as any).tempBindingData.delete(openid);
      }
      
      if (bindResult.success) {
        const bookType = selectedBook.type === 'FAMILY' 
          ? `家庭账本${selectedBook.familyName ? ' - ' + selectedBook.familyName : ''}` 
          : '个人账本';
        
        return `🎉 绑定成功！\n\n账号：${user.name} (${user.email})\n账本：${selectedBook.name} (${bookType})\n\n您现在可以发送语音、图片或文字进行记账了！`;
      } else {
        return `绑定失败：${bindResult.message}\n\n请重新发送"绑定 邮箱 密码"进行绑定。`;
      }
    } catch (error) {
      logger.error('处理账本选择失败:', error);
      
      // 清理临时数据
      if ((global as any).tempBindingData) {
        (global as any).tempBindingData.delete(openid);
      }
      
      return '选择账本时出现错误，请重新开始绑定流程。\n\n发送"绑定 邮箱 密码"进行绑定。';
    }
  }

  /**
   * 处理事件消息
   */
  private async handleEventMessage(openid: string, message: any): Promise<string> {
    const event = message.Event;

    logger.info('处理微信事件:', {
      openid,
      event,
      eventKey: message.EventKey,
      timestamp: new Date().toISOString(),
    });

    switch (event) {
      case 'subscribe':
        // 用户关注事件
        await this.logUserEvent(openid, 'subscribe');
        return this.getWelcomeMessage();

      case 'unsubscribe':
        // 用户取消关注事件
        await this.logUserEvent(openid, 'unsubscribe');
        return ''; // 取消关注不需要回复

      case 'CLICK':
        // 菜单点击事件
        return await this.handleMenuClick(openid, message.EventKey);

      case 'VIEW':
        // 菜单跳转事件
        return '感谢您的访问！如需记账，请直接发送消息。';

      case 'SCAN':
        // 扫码事件
        return '扫码成功！欢迎使用只为记账智能记账服务。\n\n发送"帮助"查看使用说明。';

      case 'LOCATION':
        // 位置事件
        return '收到您的位置信息，但暂不支持基于位置的记账功能。\n\n请发送文字消息进行记账。';

      default:
        logger.info('未处理的微信事件:', event);
        return '感谢您的操作！\n\n如需记账，请发送消息，或发送"帮助"查看使用说明。';
    }
  }

  /**
   * 异步处理智能记账
   */
  private async handleSmartAccountingAsync(
    openid: string,
    userId: string,
    accountBookId: string,
    description: string,
    createTransaction: boolean = false,
  ): Promise<void> {
    try {
      const result = await this.smartAccountingService.processWechatAccounting(
        userId,
        accountBookId,
        description,
        createTransaction,
      );

      // 通过客服消息API发送结果
      const message = result.success ? result.message : result.message;
      await this.sendCustomMessage(openid, message);
    } catch (error) {
      logger.error('异步智能记账处理失败:', error);
      // 发送错误消息给用户
      await this.sendCustomMessage(openid, '记账处理失败，请稍后重试。');
    }
  }

  /**
   * 处理智能记账（同步版本，用于其他场景）
   */
  private async handleSmartAccounting(
    userId: string,
    accountBookId: string,
    description: string,
    createTransaction: boolean = false,
  ): Promise<string> {
    try {
      const result = await this.smartAccountingService.processWechatAccounting(
        userId,
        accountBookId,
        description,
        createTransaction,
      );

      return result.success ? result.message : result.message;
    } catch (error) {
      logger.error('智能记账处理失败:', error);
      return '记账处理失败，请稍后重试。';
    }
  }

  /**
   * 处理账号绑定
   */
  private async handleAccountBinding(openid: string, content: string): Promise<string> {
    try {
      // 解析绑定命令：绑定 邮箱 密码
      const parts = content.split(' ');
      if (parts.length !== 3) {
        return '绑定格式错误。正确格式：绑定 邮箱 密码\n\n例如：绑定 user@example.com 123456';
      }

      const [, email, password] = parts;

      // 简单的邮箱格式验证
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return '邮箱格式不正确，请重新输入。\n\n例如：绑定 user@example.com 123456';
      }

      const result = await this.bindingService.bindUserAccount(openid, email, password);

      if (result.success) {
        const accountBooks = result.data?.accountBooks || [];
        let message = `🎉 ${result.message}\n\n`;
        message += `欢迎，${result.data?.userName}！\n\n`;

        if (accountBooks.length > 0) {
          message += '请选择默认账本：\n\n';
          accountBooks.forEach((book: any, index: number) => {
            const bookType =
              book.type === 'FAMILY'
                ? `[家庭账本${book.familyName ? '-' + book.familyName : ''}]`
                : '[个人账本]';
            message += `${index + 1}. ${book.name} ${bookType}\n`;
          });
          message += '\n回复"选择1"、"选择2"等来设置默认账本';
        } else {
          message += '您还没有任何账本，请先在应用中创建账本。';
        }

        return message;
      } else {
        return `❌ ${result.message}`;
      }
    } catch (error) {
      logger.error('处理账号绑定失败:', error);
      return '绑定失败，请稍后重试。';
    }
  }

  /**
   * 处理账本选择
   */
  private async handleAccountBookChoice(openid: string, content: string): Promise<string> {
    try {
      const binding = await this.getUserBinding(openid);
      if (!binding) {
        return '请先绑定账号。';
      }

      // 解析选择的账本编号
      const match = content.match(/^选择(\d+)$/);
      if (!match) {
        return '选择格式错误。请回复"选择1"、"选择2"等。';
      }

      const choice = parseInt(match[1]) - 1;
      const accountBooks = await this.bindingService.getUserAccountBooks(binding.user_id);

      if (choice < 0 || choice >= accountBooks.length) {
        return `选择的账本编号无效。请选择1-${accountBooks.length}之间的数字。`;
      }

      const selectedBook = accountBooks[choice];
      const result = await this.bindingService.setDefaultAccountBook(openid, selectedBook.id);

      return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
    } catch (error) {
      logger.error('处理账本选择失败:', error);
      return '设置失败，请稍后重试。';
    }
  }

  /**
   * 处理解除绑定
   */
  private async handleUnbindAccount(openid: string): Promise<string> {
    try {
      const result = await this.bindingService.unbindAccount(openid);
      return result.success ? `✅ ${result.message}` : `❌ ${result.message}`;
    } catch (error) {
      logger.error('处理解除绑定失败:', error);
      return '解除绑定失败，请稍后重试。';
    }
  }

  /**
   * 处理绑定信息查询
   */
  private async handleBindingInfo(openid: string): Promise<string> {
    try {
      const bindingInfo = await this.bindingService.getBindingInfo(openid);

      if (!bindingInfo) {
        return '您还未绑定账号。发送"绑定账号"获取绑定说明。';
      }

      let message = '📋 绑定信息\n\n';
      message += `用户：${bindingInfo.userName}\n`;
      message += `邮箱：${bindingInfo.userEmail}\n`;
      message += `默认账本：${bindingInfo.defaultAccountBookName || '未设置'}\n`;
      message += `绑定时间：${new Date(bindingInfo.createdAt).toLocaleString('zh-CN')}\n\n`;
      message += '发送"解除绑定"可以取消绑定';

      return message;
    } catch (error) {
      logger.error('获取绑定信息失败:', error);
      return '获取绑定信息失败，请稍后重试。';
    }
  }

  /**
   * 处理默认账本选择
   */
  private async handleDefaultAccountBookSelection(userId: string): Promise<string> {
    try {
      const accountBooks = await prisma.accountBook.findMany({
        where: {
          OR: [
            { userId },
            {
              type: 'FAMILY',
              family: {
                members: {
                  some: { userId },
                },
              },
            },
          ],
        },
        include: {
          family: true,
        },
      });

      if (accountBooks.length === 0) {
        return '您还没有任何账本，请先在应用中创建账本。';
      }

      let message = '请选择要设置为默认的账本：\n\n';
      accountBooks.forEach((book, index) => {
        const bookType = book.type === 'FAMILY' ? `[家庭账本-${book.family?.name}]` : '[个人账本]';
        message += `${index + 1}. ${book.name} ${bookType}\n`;
      });

      message += '\n回复数字选择账本，例如：选择1';

      return message;
    } catch (error) {
      logger.error('获取账本列表失败:', error);
      return '获取账本列表失败，请稍后重试。';
    }
  }

  /**
   * 处理余额查询
   */
  private async handleBalanceQuery(userId: string, accountBookId: string): Promise<string> {
    try {
      return await this.smartAccountingService.getAccountBookStats(userId, accountBookId);
    } catch (error) {
      logger.error('余额查询失败:', error);
      return '余额查询失败，请稍后重试。';
    }
  }

  /**
   * 处理分类统计查询
   */
  private async handleCategoryStats(userId: string, accountBookId: string): Promise<string> {
    try {
      return await this.smartAccountingService.getCategoryStats(userId, accountBookId);
    } catch (error) {
      logger.error('分类统计查询失败:', error);
      return '分类统计查询失败，请稍后重试。';
    }
  }

  /**
   * 处理预算查询
   */
  private async handleBudgetQuery(userId: string, accountBookId: string): Promise<string> {
    try {
      return await this.smartAccountingService.getBudgetStatus(userId, accountBookId);
    } catch (error) {
      logger.error('获取预算状态失败:', error);
      return '获取预算状态失败，请稍后重试。';
    }
  }

  /**
   * 处理最近记账查询
   */
  private async handleRecentQuery(
    userId: string,
    accountBookId: string,
    limit: number = 5,
  ): Promise<string> {
    try {
      return await this.smartAccountingService.getRecentTransactions(userId, accountBookId, limit);
    } catch (error) {
      logger.error('获取最近记账失败:', error);
      return '获取最近记账失败，请稍后重试。';
    }
  }

  /**
   * 处理时间范围查询
   */
  private async handleTimeRangeQuery(
    userId: string,
    accountBookId: string,
    startDate: Date,
    endDate: Date,
    period: string,
  ): Promise<string> {
    try {
      return await this.smartAccountingService.getTimeRangeStats(
        userId,
        accountBookId,
        startDate,
        endDate,
        period,
      );
    } catch (error) {
      logger.error('获取时间范围统计失败:', error);
      return '获取时间范围统计失败，请稍后重试。';
    }
  }

  /**
   * 处理菜单点击
   */
  private async handleMenuClick(openid: string, eventKey: string): Promise<string> {
    switch (eventKey) {
      case 'BIND_ACCOUNT':
        return this.getBindingInstructions();
      case 'HELP':
        return this.getHelpMessage();
      case 'BALANCE':
        const binding = await this.getUserBinding(openid);
        if (!binding || !binding.default_account_book_id) {
          return '请先绑定账号并设置默认账本。';
        }
        return await this.handleBalanceQuery(binding.user_id, binding.default_account_book_id);
      // 开发环境专用菜单项
      case 'TEST_FEATURES':
        return this.getTestFeaturesMessage();
      case 'HELP_GUIDE':
        return this.getDevelopmentHelpMessage();
      default:
        return '感谢您的操作！';
    }
  }

  /**
   * 获取测试功能说明
   */
  private getTestFeaturesMessage(): string {
    return (
      '🧪 测试功能说明\n\n' +
      '📝 文字记账测试：\n' +
      '发送："50 餐饮 午餐"\n\n' +
      '🎤 语音记账测试：\n' +
      '发送语音消息："花了五十块钱买午餐"\n\n' +
      '📷 图片记账测试：\n' +
      '发送包含价格信息的图片（如收据）\n\n' +
      '🔗 账号绑定测试：\n' +
      '发送："绑定 邮箱 密码"\n\n' +
      '💡 注意：这是测试环境，不会影响正式数据'
    );
  }

  /**
   * 获取开发环境帮助信息
   */
  private getDevelopmentHelpMessage(): string {
    return (
      '🛠️ 开发环境使用指南\n\n' +
      '📋 支持的功能：\n' +
      '• 文字记账 - 发送"金额 分类 备注"\n' +
      '• 语音记账 - 发送语音消息\n' +
      '• 图片记账 - 发送图片\n' +
      '• 账号绑定 - "绑定 邮箱 密码"\n\n' +
      '🔧 调试命令：\n' +
      '• "帮助" - 查看完整帮助\n' +
      '• "绑定信息" - 查看当前绑定状态\n' +
      '• "余额" - 查看账本余额\n\n' +
      '⚠️ 这是测试环境，仅用于功能验证'
    );
  }

  /**
   * 获取用户绑定信息
   */
  private async getUserBinding(openid: string) {
    return await prisma.wechat_user_bindings.findUnique({
      where: { openid },
    });
  }

  /**
   * 记录用户事件
   */
  private async logUserEvent(openid: string, eventType: string) {
    try {
      await prisma.wechat_message_logs.create({
        data: {
          id: crypto.randomUUID(),
          openid,
          message_type: 'event',
          content: eventType,
          status: 'success',
        },
      });
    } catch (error) {
      logger.error('记录用户事件失败:', error);
    }
  }

  /**
   * 记录消息日志
   */
  private async logMessage(openid: string, messageType: string, content: string, status: string) {
    try {
      await prisma.wechat_message_logs.create({
        data: {
          id: crypto.randomUUID(),
          openid,
          message_type: messageType,
          content,
          status,
        },
      });
    } catch (error) {
      logger.error('记录消息日志失败:', error);
    }
  }

  /**
   * 更新消息日志
   */
  private async updateMessageLog(
    openid: string,
    content: string,
    response: string,
    status: string,
    processingTime: number,
    errorMessage?: string,
  ) {
    try {
      const latestLog = await prisma.wechat_message_logs.findFirst({
        where: { openid, content },
        orderBy: { created_at: 'desc' },
      });

      if (latestLog) {
        await prisma.wechat_message_logs.update({
          where: { id: latestLog.id },
          data: {
            response,
            status,
            processing_time: processingTime,
            error_message: errorMessage,
          },
        });
      }
    } catch (error) {
      logger.error('更新消息日志失败:', error);
    }
  }

  /**
   * 创建响应消息
   */
  private createResponse(message: WechatMessage, content: string): WechatResponse {
    return {
      ToUserName: message.FromUserName,
      FromUserName: message.ToUserName,
      CreateTime: Math.floor(Date.now() / 1000),
      MsgType: 'text',
      Content: content,
    };
  }

  /**
   * 获取绑定说明
   */
  private getBindingInstructions(): string {
    return (
      '🔗 账号绑定说明\n\n' +
      '请按以下格式发送绑定信息：\n' +
      '绑定 邮箱 密码\n\n' +
      '例如：\n' +
      '绑定 user@example.com 123456\n\n' +
      '⚠️ 注意：\n' +
      '• 请使用您在只为记账应用中注册的邮箱\n' +
      '• 密码为您的登录密码\n' +
      '• 绑定成功后可选择默认账本\n\n' +
      '如需帮助，请发送"帮助"'
    );
  }

  /**
   * 获取欢迎消息
   */
  private getWelcomeMessage(): string {
    return (
      '🎉 欢迎关注只为记账！\n\n' +
      '我是您的智能记账助手，可以帮您：\n' +
      '📝 智能记账 - 发送消费信息即可自动记账\n' +
      '💰 查看余额 - 随时了解财务状况\n' +
      '📊 账本管理 - 切换不同账本\n\n' +
      '请先点击菜单"绑定账号"开始使用！'
    );
  }

  /**
   * 检查是否是非记账内容
   */
  private isNonAccountingContent(content: string): boolean {
    const lowerContent = content.toLowerCase();

    // 常见的非记账关键词
    const nonAccountingKeywords = [
      '你好',
      'hello',
      'hi',
      '在吗',
      '在不在',
      '怎么样',
      '如何',
      '什么时候',
      '为什么',
      '天气',
      '新闻',
      '股票',
      '彩票',
      '聊天',
      '无聊',
      '哈哈',
      '呵呵',
      '测试',
      'test',
      '试试',
      '谢谢',
      '感谢',
      'thanks',
      '再见',
      'bye',
      '拜拜',
    ];

    // 检查是否包含非记账关键词
    const hasNonAccountingKeywords = nonAccountingKeywords.some((keyword) =>
      lowerContent.includes(keyword),
    );

    // 检查是否是纯文字且没有数字（记账通常包含金额）
    const hasNumbers = /\d/.test(content);
    const isVeryShort = content.length < 3;
    const isOnlyLetters = /^[a-zA-Z\s]+$/.test(content);

    return (
      hasNonAccountingKeywords ||
      (isVeryShort && !hasNumbers) ||
      (isOnlyLetters && content.length < 10)
    );
  }

  /**
   * 获取帮助信息
   */
  private getHelpMessage(): string {
    return (
      '📖 使用帮助\n\n' +
      '🔗 账号管理：\n' +
      '• "绑定账号" - 获取绑定说明\n' +
      '• "绑定 邮箱 密码" - 绑定只为记账账号\n' +
      '• "绑定信息" - 查看当前绑定信息\n' +
      '• "解除绑定" - 取消账号绑定\n\n' +
      '📚 账本管理：\n' +
      '• "设置账本" - 查看并选择默认账本\n' +
      '• "选择1" - 选择第1个账本为默认\n\n' +
      '📊 统计查询：\n' +
      '• "查看余额" / "账本统计" - 查询账本统计\n' +
      '• "分类统计" / "消费统计" - 查看分类统计\n\n' +
      '💡 智能记账示例：\n' +
      '• "50 餐饮 午餐" - 支出记账\n' +
      '• "地铁 5元" - 交通费用\n' +
      '• "工资 8000" - 收入记账\n' +
      '• "买菜花了30块钱" - 自然语言记账\n\n' +
      '💡 记账小贴士：\n' +
      '• 支持自然语言描述\n' +
      '• 自动识别金额、分类和类型\n' +
      '• 智能匹配预算和账本\n\n' +
      '如有问题，请联系客服。'
    );
  }

  /**
   * 用户登录并获取账本列表
   */
  public async loginAndGetAccountBooks(
    email: string,
    password: string,
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      user: any;
      accountBooks: any[];
    };
  }> {
    try {
      // 查找用户
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          passwordHash: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: '用户不存在，请检查邮箱地址',
        };
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: '密码错误，请重新输入',
        };
      }

      // 获取用户的账本列表
      const accountBooks = await prisma.accountBook.findMany({
        where: {
          OR: [
            { userId: user.id },
            {
              type: 'FAMILY',
              family: {
                members: {
                  some: { userId: user.id },
                },
              },
            },
          ],
        },
        include: {
          family: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // 格式化账本数据
      const formattedBooks = accountBooks.map((book) => ({
        id: book.id,
        name: book.name,
        type: book.type,
        familyName: book.family?.name,
      }));

      return {
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          accountBooks: formattedBooks,
        },
      };
    } catch (error) {
      logger.error('登录获取账本失败:', error);
      return {
        success: false,
        message: '登录失败，请稍后重试',
      };
    }
  }

  /**
   * 通过授权码获取用户OpenID
   */
  public async getOpenIdFromCode(code: string): Promise<string> {
    if (!this.isEnabled) {
      throw new Error('微信服务未启用');
    }

    try {
      // 通过code获取access_token和openid
      const response = await axios.get('https://api.weixin.qq.com/sns/oauth2/access_token', {
        params: {
          appid: this.appId,
          secret: this.appSecret,
          code: code,
          grant_type: 'authorization_code',
        },
      });

      if (response.data.errcode) {
        throw new Error(`获取OpenID失败: ${response.data.errmsg}`);
      }

      return response.data.openid;
    } catch (error) {
      logger.error('获取OpenID失败:', error);
      throw error;
    }
  }

  /**
   * 绑定微信账号
   */
  public async bindWechatAccount(
    openid: string,
    userId: string,
    accountBookId: string,
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      // 检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        return {
          success: false,
          message: '用户不存在',
        };
      }

      // 检查账本是否存在且用户有权限
      const accountBook = await prisma.accountBook.findFirst({
        where: {
          id: accountBookId,
          OR: [
            { userId },
            {
              type: 'FAMILY',
              family: {
                members: {
                  some: { userId },
                },
              },
            },
          ],
        },
        select: { id: true, name: true, type: true },
      });

      if (!accountBook) {
        return {
          success: false,
          message: '账本不存在或您没有权限访问',
        };
      }

      // 检查是否已经绑定
      const existingBinding = await prisma.wechat_user_bindings.findUnique({
        where: { openid },
      });

      if (existingBinding) {
        // 更新绑定信息
        await prisma.wechat_user_bindings.update({
          where: { openid },
          data: {
            user_id: userId,
            default_account_book_id: accountBookId,
            is_active: true,
            updated_at: new Date(),
          },
        });
      } else {
        // 创建新绑定
        await prisma.wechat_user_bindings.create({
          data: {
            id: crypto.randomUUID(),
            openid,
            user_id: userId,
            default_account_book_id: accountBookId,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }

      // 发送绑定成功的客服消息
      const welcomeMessage = `🎉 绑定成功！

欢迎使用只为记账智能记账功能！

📖 您已成功绑定账本："${accountBook.name}"

💡 使用方法：
直接发送消息描述您的消费或收入，我会自动帮您记账！

📝 示例：
• "午餐花了25元"
• "买菜30块"
• "工资到账5000"
• "地铁费2.5元"

🔍 查询功能：
• "查看本月支出"
• "查看预算情况"
• "查看账本信息"

现在就试试发送一条消费记录吧！`;

      // 异步发送消息，不影响绑定流程
      this.sendCustomMessage(openid, welcomeMessage).catch((error) => {
        logger.error('发送绑定成功消息失败:', error);
      });

      return {
        success: true,
        message: `绑定成功！已设置"${accountBook.name}"为默认账本`,
        data: {
          user: user,
          accountBook: accountBook,
        },
      };
    } catch (error) {
      logger.error('绑定微信账号失败:', error);
      return {
        success: false,
        message: '绑定失败，请稍后重试',
      };
    }
  }

  /**
   * 解绑微信账号
   */
  public async unbindWechatAccount(openid: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // 检查绑定是否存在
      const existingBinding = await prisma.wechat_user_bindings.findUnique({
        where: { openid },
      });

      if (!existingBinding) {
        return {
          success: false,
          message: '未找到绑定记录',
        };
      }

      // 删除绑定记录
      await prisma.wechat_user_bindings.delete({
        where: { openid },
      });

      return {
        success: true,
        message: '解绑成功',
      };
    } catch (error) {
      logger.error('解绑微信账号失败:', error);
      return {
        success: false,
        message: '解绑失败，请稍后重试',
      };
    }
  }

  /**
   * 发送客服消息
   */
  public async sendCustomMessage(
    openid: string,
    content: string,
  ): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      if (!this.isEnabled) {
        logger.info('微信服务未启用，跳过发送消息');
        return {
          success: false,
          message: '微信服务未启用',
        };
      }

      const accessToken = await this.getAccessToken();

      const messageData = {
        touser: openid,
        msgtype: 'text',
        text: {
          content: content,
        },
      };

      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
        messageData,
      );

      if (response.data.errcode === 0) {
        logger.info('✅ 客服消息发送成功:', { openid, content: content.substring(0, 50) + '...' });
        return {
          success: true,
          message: '消息发送成功',
        };
      } else {
        logger.error('❌ 客服消息发送失败:', response.data);
        return {
          success: false,
          message: `发送失败: ${response.data.errmsg}`,
        };
      }
    } catch (error) {
      logger.error('发送客服消息失败:', error);
      return {
        success: false,
        message: '发送消息失败，请稍后重试',
      };
    }
  }

  /**
   * 获取用户的账本列表
   */
  public async getUserAccountBooks(userId: string): Promise<{
    success: boolean;
    message?: string;
    data?: any[];
  }> {
    try {
      // 获取用户的个人账本
      const personalBooks = await prisma.accountBook.findMany({
        where: {
          userId: userId,
          type: 'PERSONAL',
        },
        select: {
          id: true,
          name: true,
          type: true,
          isDefault: true,
        },
      });

      // 获取用户参与的家庭账本
      const familyBooks = await prisma.accountBook.findMany({
        where: {
          type: 'FAMILY',
          family: {
            members: {
              some: { userId },
            },
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          isDefault: true,
          family: {
            select: {
              name: true,
            },
          },
        },
      });

      const allBooks = [
        ...personalBooks,
        ...familyBooks.map((book) => ({
          ...book,
          familyName: book.family?.name,
        })),
      ];

      return {
        success: true,
        data: allBooks,
      };
    } catch (error) {
      logger.error('获取用户账本失败:', error);
      return {
        success: false,
        message: '获取账本失败，请稍后重试',
      };
    }
  }

  /**
   * 处理语音消息
   */
  private async handleVoiceMessage(openid: string, message: WechatMessage): Promise<string> {
    try {
      logger.info(`🎤 处理语音消息: openid=${openid}, mediaId=${message.MediaId}`);

      // 检查用户绑定状态
      const binding = await this.bindingService.getBindingInfo(openid);
      if (!binding || !binding.isActive) {
        return '您还未绑定只为记账账号，请点击菜单"账号绑定"进行绑定后再使用语音记账功能。';
      }

      if (!message.MediaId) {
        return '语音消息格式错误，请重新发送语音消息。';
      }

      // 微信官方已停止语音转文字API服务，直接使用自定义语音识别服务
      logger.info(`🎵 使用自定义语音识别服务处理语音消息...`);

      // 下载语音文件
      logger.info(`📥 开始下载语音文件: ${message.MediaId}`);
      const downloadResult = await this.mediaService.downloadMedia(message.MediaId, 'voice');
      logger.info(`📥 语音下载结果:`, downloadResult);

      if (!downloadResult.success || !downloadResult.filePath) {
        logger.error('下载语音文件失败:', downloadResult.error);
        return '语音文件下载失败，请稍后重试。\n\n您也可以发送文字进行记账。';
      }

      // 声明变量在更外层作用域，以便在catch块中使用
      let processedFilePath = downloadResult.filePath;

      try {
        logger.info(`🎵 开始处理语音文件: ${downloadResult.filePath}`);

        // 创建模拟的multipart文件对象
        const fs = require('fs');

        if (!fs.existsSync(downloadResult.filePath)) {
          logger.info(`❌ 语音文件不存在: ${downloadResult.filePath}`);
          return '语音文件不存在，请重新发送语音。';
        }

        const stats = fs.statSync(downloadResult.filePath);
        logger.info(`📊 语音文件信息: 大小=${stats.size}字节, 格式=${downloadResult.fileName}`);

        // 直接使用AMR格式文件，百度语音识别API支持AMR格式
        processedFilePath = downloadResult.filePath;
        let processedFileName = downloadResult.fileName || 'voice.amr';
        let processedMimeType = 'audio/amr';

        logger.info(`📁 直接使用AMR格式文件: ${processedFileName}`);

        // 读取处理后的文件
        const processedStats = fs.statSync(processedFilePath);
        const mockFile = {
          buffer: fs.readFileSync(processedFilePath),
          originalname: processedFileName,
          mimetype: processedMimeType,
          size: processedStats.size,
          path: processedFilePath,
        };

        // 获取完整的用户信息
        const userInfo = await prisma.user.findUnique({
          where: { id: binding.userId },
          select: { id: true, name: true, email: true }
        });

        // 创建模拟的请求对象
        const mockReq = {
          user: {
            id: binding.userId,
            name: userInfo?.name || 'Unknown User',
            email: userInfo?.email || 'unknown@example.com'
          },
          file: mockFile,
          body: {
            accountBookId: binding.defaultAccountBookId,
            language: 'zh-CN',
            format: 'amr',
          },
        };

        logger.info(`📋 语音请求对象:`, {
          userId: mockReq.user.id,
          accountBookId: mockReq.body.accountBookId,
          fileName: mockFile.originalname,
          fileSize: mockFile.size
        });

        // 创建模拟的响应对象
        let responseData: any = null;
        let statusCode = 200;
        const mockRes = {
          status: (code: number) => {
            statusCode = code;
            logger.info(`📊 语音API响应状态码: ${code}`);
            return mockRes;
          },
          json: (data: any) => {
            responseData = data;
            logger.info(`📊 语音API响应数据:`, data);
          },
        };

        logger.info(`🚀 开始调用语音识别API（第一步：识别）...`);

        // 第一步：调用语音识别API
        await this.multimodalController.speechToText(mockReq as any, mockRes as any);
        
        logger.info(`✅ 语音识别API调用完成，状态码: ${statusCode}, 响应数据:`, responseData);

        // 清理临时文件
        logger.info(`🗑️ 清理语音临时文件: ${downloadResult.filePath}`);
        await this.mediaService.cleanupTempFile(downloadResult.filePath);



        // 处理语音识别响应
        if (statusCode === 200 && responseData?.success) {
          const recognizedText = responseData.data?.text;
          logger.info(`🔍 语音识别结果: ${recognizedText}`);
          
          if (!recognizedText) {
            return '语音识别成功，但未能提取到有效的记账信息。\n\n请重新录制语音，说明清楚金额和用途。';
          }

          // 第二步：将识别结果传递给智能记账API
          logger.info(`🚀 开始调用智能记账API（第二步：记账）...`);
          
          try {
            // 确保有默认账本ID
            if (!binding.defaultAccountBookId) {
              return `语音识别成功：${recognizedText}\n\n但您还没有设置默认账本，请先通过菜单设置默认账本。`;
            }

            const accountingResult = await this.smartAccountingService.processWechatAccounting(
              binding.userId,
              binding.defaultAccountBookId,
              recognizedText,
              true // 创建记账记录
            );

            logger.info(`✅ 智能记账API调用完成:`, accountingResult);

            if (accountingResult.success) {
              if (accountingResult.transaction) {
                // 检查是否是多条记录（数组格式）
                if (Array.isArray(accountingResult.transaction)) {
                  // 多条记录，直接使用已格式化的消息
                  return accountingResult.message;
                } else {
                  // 单条记录，使用传统格式化方法
                  return this.formatAccountingSuccessMessage(accountingResult.transaction, recognizedText);
                }
              } else {
                // 没有记账记录但成功，直接返回消息
                return accountingResult.message;
              }
            } else {
              return `语音识别成功：${recognizedText}\n\n但智能记账失败：${accountingResult.message || '未知错误'}\n\n您可以手动输入记账信息。`;
            }
          } catch (accountingError) {
            logger.error('智能记账API调用失败:', accountingError);
            return `语音识别成功：${recognizedText}\n\n但智能记账服务暂时不可用，请稍后重试或手动输入记账信息。`;
          }
        } else {
          const errorMsg = responseData?.error || '语音识别失败';
          logger.error('语音识别API调用失败:', responseData);
          return `语音识别失败：${errorMsg}\n\n请重新录制语音或发送文字进行记账。`;
        }
      } catch (apiError) {
        logger.error('语音记账API调用异常:', apiError);
        // 确保清理临时文件
        await this.mediaService.cleanupTempFile(downloadResult.filePath);
        return '语音记账服务暂时不可用，请稍后重试。\n\n您也可以发送文字进行记账。';
      }
    } catch (error) {
      logger.error('处理语音消息失败:', error);
      return '处理语音消息时出现错误，请稍后重试。\n\n您也可以发送文字进行记账。';
    }
  }

  /**
   * 处理图片消息
   */
  private async handleImageMessage(openid: string, message: WechatMessage): Promise<string> {
    try {
      logger.info(`📷 处理图片消息: openid=${openid}, mediaId=${message.MediaId}, picUrl=${message.PicUrl}`);

      // 检查用户绑定状态
      const binding = await this.bindingService.getBindingInfo(openid);
      if (!binding || !binding.isActive) {
        return '您还未绑定只为记账账号，请点击菜单"账号绑定"进行绑定后再使用图片记账功能。';
      }

      if (!binding.defaultAccountBookId) {
        return '您还没有设置默认账本，请先通过菜单设置默认账本。';
      }

      // 异步处理图片记账，避免超时
      this.handleImageAccountingAsync(openid, message, binding);
      
      return ''; // 返回空字符串，通过客服消息API异步发送结果
    } catch (error) {
      logger.error('处理图片消息失败:', error);
      return '处理图片消息时出现错误，请稍后重试。\n\n您也可以发送文字进行记账。';
    }
  }

  /**
   * 异步处理图片记账
   */
  private async handleImageAccountingAsync(
    openid: string, 
    message: WechatMessage, 
    binding: any
  ): Promise<void> {
    let imagePath: string | undefined;
    let shouldCleanup = false;

    try {
      logger.info(`🔍 开始处理图片识别...`);
      
      // 优先使用MediaId下载图片（高清），fallback到PicUrl
      if (message.MediaId) {
        logger.info(`📥 尝试使用MediaId下载图片: ${message.MediaId}`);
        const downloadResult = await this.mediaService.downloadMedia(message.MediaId, 'image');
        logger.info(`📥 下载结果:`, downloadResult);
        
        if (downloadResult.success && downloadResult.filePath) {
          imagePath = downloadResult.filePath;
          shouldCleanup = true;
          logger.info(`✅ 图片下载成功，路径: ${imagePath}`);
        } else {
          logger.info(`❌ MediaId下载失败: ${downloadResult.error}`);
        }
      }

      // 如果MediaId下载失败，使用PicUrl
      if (!imagePath && message.PicUrl) {
        logger.info(`🌐 使用PicUrl作为图片源: ${message.PicUrl}`);
        imagePath = message.PicUrl;
        shouldCleanup = false;
      }

      if (!imagePath) {
        logger.info(`❌ 图片路径为空，无法继续处理`);
        await this.sendCustomMessage(openid, '图片获取失败，请重新发送图片。');
        return;
      }

      logger.info(`🎯 准备调用图片识别API，图片路径: ${imagePath}, shouldCleanup: ${shouldCleanup}`);

      // 获取完整的用户信息
      const userInfo = await prisma.user.findUnique({
        where: { id: binding.userId },
        select: { id: true, name: true, email: true }
      });

      // 创建模拟的请求对象
      const mockReq = {
        user: {
          id: binding.userId,
          name: userInfo?.name || 'Unknown User',
          email: userInfo?.email || 'unknown@example.com'
        },
        body: {
          accountBookId: binding.defaultAccountBookId,
          imageUrl: shouldCleanup ? undefined : imagePath,
          prompt: '请识别这张图片中的记账信息，包括金额、类别、商品名称等。',
          detailLevel: 'high',
        },
      };

      logger.info(`📋 请求对象:`, {
        userId: mockReq.user.id,
        accountBookId: mockReq.body.accountBookId,
        imageUrl: mockReq.body.imageUrl,
        hasLocalFile: shouldCleanup
      });

      // 如果是本地文件，添加文件对象
      if (shouldCleanup && imagePath) {
        logger.info(`📁 添加本地文件对象...`);
        const fs = require('fs');
        
        if (!fs.existsSync(imagePath)) {
          logger.info(`❌ 本地文件不存在: ${imagePath}`);
          await this.sendCustomMessage(openid, '图片文件不存在，请重新发送图片。');
          return;
        }
        
        const stats = fs.statSync(imagePath);
        logger.info(`📊 文件信息: 大小=${stats.size}字节`);
        
        const mockFile = {
          buffer: fs.readFileSync(imagePath),
          originalname: 'wechat-image.jpg',
          mimetype: 'image/jpeg',
          size: stats.size,
          path: imagePath,
        };
        (mockReq as any).file = mockFile;
        logger.info(`✅ 文件对象添加完成`);
      }

      // 创建模拟的响应对象
      let responseData: any = null;
      let statusCode = 200;
      const mockRes = {
        status: (code: number) => {
          statusCode = code;
          logger.info(`📊 API响应状态码: ${code}`);
          return mockRes;
        },
        json: (data: any) => {
          responseData = data;
          logger.info(`📊 API响应数据:`, data);
        },
      };

      logger.info(`🚀 开始调用图片识别API（第一步：识别）...`);
      
      // 第一步：调用图片识别API
      await this.multimodalController.imageRecognition(mockReq as any, mockRes as any);
      
      logger.info(`✅ 图片识别API调用完成，状态码: ${statusCode}, 响应数据:`, responseData);

      // 处理图片识别响应
      if (statusCode === 200 && responseData?.success) {
        let recognizedText = responseData.data?.text;
        logger.info(`🔍 图片识别原始结果: ${recognizedText}`);
        
        // 如果返回的是JSON格式的文本，尝试解析
        if (recognizedText && recognizedText.includes('```json')) {
          try {
            // 提取JSON部分
            const jsonMatch = recognizedText.match(/```json\n([\s\S]*?)\n```/);
            if (jsonMatch && jsonMatch[1]) {
              const parsedData = JSON.parse(jsonMatch[1]);
              // 构造记账描述文本
              recognizedText = `${parsedData.amount || '未知金额'} ${parsedData.category || '购物'} ${parsedData.description || ''}`.trim();
              logger.info(`🔍 解析后的记账文本: ${recognizedText}`);
            }
          } catch (parseError) {
            logger.info(`⚠️ JSON解析失败，使用原始文本: ${parseError}`);
            // 如果解析失败，提取关键信息
            const amountMatch = recognizedText.match(/"amount"\s*:\s*"([^"]+)"/);
            const categoryMatch = recognizedText.match(/"category"\s*:\s*"([^"]+)"/);
            const descMatch = recognizedText.match(/"description"\s*:\s*"([^"]+)"/);
            
            if (amountMatch) {
              recognizedText = `${amountMatch[1]} ${categoryMatch?.[1] || '购物'} ${descMatch?.[1] || ''}`.trim();
              logger.info(`🔍 正则提取的记账文本: ${recognizedText}`);
            }
          }
        }
        
        if (!recognizedText) {
          await this.sendCustomMessage(openid, '图片识别成功，但未能提取到有效的记账信息。\n\n请确保图片包含清晰的金额和商品信息。');
          return;
        }

        // 第二步：将识别结果传递给智能记账API
        logger.info(`🚀 开始调用智能记账API（第二步：记账）...`);
        
        try {
          const accountingResult = await this.smartAccountingService.processWechatAccounting(
            binding.userId,
            binding.defaultAccountBookId,
            recognizedText,
            true, // 创建记账记录
            true  // 来自图片识别
          );

          logger.info(`✅ 智能记账API调用完成:`, accountingResult);

          if (accountingResult.success && accountingResult.transaction) {
            // 第三步：保存图片作为记账附件
            if (shouldCleanup && imagePath) {
              try {
                // 检查是否是多条记录
                if (Array.isArray(accountingResult.transaction)) {
                  // 多条记录，为每条记录都保存图片附件
                  logger.info(`💾 开始为 ${accountingResult.transaction.length} 条记录保存图片附件`);
                  for (let i = 0; i < accountingResult.transaction.length; i++) {
                    const transaction = accountingResult.transaction[i];
                    logger.info(`💾 保存图片附件到第 ${i + 1} 条记录: ${transaction.id}`);
                    await this.saveImageAttachment(transaction.id, imagePath, binding.userId);
                  }
                  logger.info(`✅ 所有图片附件保存成功`);
                } else {
                  // 单条记录
                  logger.info(`💾 开始保存图片附件到记账记录: ${accountingResult.transaction.id}`);
                  await this.saveImageAttachment(accountingResult.transaction.id, imagePath, binding.userId);
                  logger.info(`✅ 图片附件保存成功`);
                }
              } catch (attachmentError) {
                logger.error('保存图片附件失败:', attachmentError);
                // 附件保存失败不影响记账结果
              }
            }

            // 发送成功消息 - 使用智能记账的格式化消息，而不是图片识别的原始内容
            await this.sendCustomMessage(openid, accountingResult.message);
          } else if (accountingResult.success) {
            // 没有记账记录但成功，直接返回消息
            await this.sendCustomMessage(openid, accountingResult.message);
          } else {
            await this.sendCustomMessage(openid, `图片识别成功，但智能记账失败：${accountingResult.message || '未知错误'}\n\n您可以手动输入记账信息。`);
          }
        } catch (accountingError) {
          logger.error('智能记账API调用失败:', accountingError);
          await this.sendCustomMessage(openid, `图片识别成功：${recognizedText}\n\n但智能记账服务暂时不可用，请稍后重试或手动输入记账信息。`);
        }
      } else {
        const errorMsg = responseData?.error || '图片识别失败';
        logger.error('图片识别API调用失败:', responseData);
        await this.sendCustomMessage(openid, `图片识别失败：${errorMsg}\n\n请确保图片清晰且包含价格信息，或发送文字进行记账。`);
      }
    } catch (apiError) {
      logger.error('图片记账API调用异常:', apiError);
      await this.sendCustomMessage(openid, '图片记账服务暂时不可用，请稍后重试。\n\n您也可以发送文字进行记账。');
    } finally {
      // 清理临时文件
      if (shouldCleanup && imagePath) {
        logger.info(`🗑️ 清理临时文件: ${imagePath}`);
        await this.mediaService.cleanupTempFile(imagePath);
      }
    }
  }

  /**
   * 保存图片作为记账附件
   */
  private async saveImageAttachment(transactionId: string, imagePath: string, userId: string): Promise<void> {
    try {
      const fs = require('fs');
      
      if (!fs.existsSync(imagePath)) {
        logger.error('图片文件不存在:', imagePath);
        return;
      }

      // 读取文件
      const fileBuffer = fs.readFileSync(imagePath);
      const stats = fs.statSync(imagePath);
      const fileName = `wechat-image-${Date.now()}.jpg`;

      // 创建模拟的multer文件对象
      const mockFile: Express.Multer.File = {
        buffer: fileBuffer,
        originalname: fileName,
        mimetype: 'image/jpeg',
        size: stats.size,
        fieldname: 'attachment',
        encoding: '7bit',
        filename: fileName,
        path: imagePath,
        destination: '',
        stream: undefined as any,
      };

      // 使用全局FileStorageService实例
      const { getGlobalFileStorageService } = require('../services/file-storage.service');
      const fileStorageService = getGlobalFileStorageService();
      
      if (!fileStorageService || !fileStorageService.isStorageAvailable()) {
        logger.warn('⚠️ 文件存储服务不可用，跳过附件保存');
        return;
      }
      
      const uploadRequest = {
        bucket: 'transaction-attachments',
        category: 'wechat',
        description: '微信图片记账附件',
        metadata: {
          transactionId,
          attachmentType: 'RECEIPT',
          source: 'wechat',
        },
      };

      const uploadResult = await fileStorageService.uploadFile(
        mockFile,
        uploadRequest,
        userId,
      );

      // 创建记账附件记录
      await prisma.transactionAttachment.create({
        data: {
          id: crypto.randomUUID(),
          transactionId: transactionId,
          fileId: uploadResult.fileId,
          attachmentType: 'RECEIPT',
          description: '微信图片记账附件',
          createdAt: new Date(),
        },
      });

      logger.info(`✅ 图片附件已保存到S3: ${uploadResult.filename}, URL: ${uploadResult.url}`);
    } catch (error) {
      logger.error('保存图片附件失败:', error);
      // 附件保存失败不影响记账流程，只记录错误
    }
  }

  /**
   * 格式化记账成功消息
   */
  private formatAccountingSuccessMessage(transaction: any, recognizedText?: string): string {
    const type = transaction.type === 'EXPENSE' ? '支出' : '收入';
    const categoryIcon = this.getCategoryIcon(transaction.category?.name);
    const category = `${categoryIcon}${transaction.category?.name || '未分类'}`;
    const desc = transaction.description || recognizedText || '';

    // 格式化日期 - 只显示日期部分
    const transactionDate = new Date(transaction.date);
    const dateStr = transactionDate.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    // 构建预算信息
    let budgetInfo = '';
    if (transaction.budget) {
      // 检查是否是个人预算
      if (transaction.budget.type === 'PERSONAL' && transaction.budget.user?.name) {
        budgetInfo = `\n📊 预算：个人预算（${transaction.budget.user.name}）`;
      } else {
        budgetInfo = `\n📊 预算：${transaction.budget.name}`;
      }
    }

    return (
      `✅ 语音记账成功！\n` +
      `📝 明细：${desc}\n` +
      `📅 日期：${dateStr}\n` +
      `💸 方向：${type}；分类：${category}\n` +
      `💰 金额：${transaction.amount}元` +
      budgetInfo
    );
  }

  /**
   * 获取记账类型文本
   */
  private getTransactionTypeText(type: string): string {
    switch (type) {
      case 'EXPENSE':
        return '支出';
      case 'INCOME':
        return '收入';
      case 'TRANSFER':
        return '转账';
      default:
        return type;
    }
  }

  /**
   * 获取分类图标
   */
  private getCategoryIcon(categoryName?: string): string {
    if (!categoryName) return '';

    const iconMap: { [key: string]: string } = {
      '餐饮': '🍽️',
      '交通': '🚗',
      '购物': '🛒',
      '娱乐': '🎮',
      '医疗': '🏥',
      '教育': '📚',
      '住房': '🏠',
      '通讯': '📱',
      '服装': '👕',
      '美容': '💄',
      '运动': '⚽',
      '旅游': '✈️',
      '礼品': '🎁',
      '宠物': '🐕',
      '数码': '💻',
      '家居': '🏡',
      '投资': '💰',
      '保险': '🛡️',
      '税费': '📋',
      '其他': '📦',
      '日用': '🧴',
      '工资': '💼',
      '奖金': '🏆',
      '理财': '📈',
      '红包': '🧧',
      '转账': '💸',
    };

    return iconMap[categoryName] || '';
  }
}
