import crypto from 'crypto';
import axios from 'axios';
import bcrypt from 'bcrypt';
import config from '../config/config';
import prisma from '../config/database';
import { AIController } from '../controllers/ai-controller';
import { WechatBindingService } from './wechat-binding.service';
import { WechatSmartAccountingService } from './wechat-smart-accounting.service';
import { WechatQueryIntentService } from './wechat-query-intent.service';

export interface WechatMessage {
  ToUserName: string;
  FromUserName: string;
  CreateTime: string;
  MsgType: string;
  Content?: string;
  MsgId?: string;
  Event?: string;
  EventKey?: string;
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
  private isEnabled: boolean;

  constructor() {
    this.isEnabled = !!(config.wechat?.appId && config.wechat?.appSecret && config.wechat?.token);

    if (!this.isEnabled) {
      console.warn('⚠️ 微信配置未设置，微信功能将被禁用');
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
      console.log('✅ 微信服务已启用');
    }

    this.aiController = new AIController();
    this.bindingService = new WechatBindingService();
    this.smartAccountingService = new WechatSmartAccountingService();
    this.queryIntentService = new WechatQueryIntentService();
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
          secret: this.appSecret
        }
      });

      if (response.data.errcode) {
        throw new Error(`获取access_token失败: ${response.data.errmsg}`);
      }

      return response.data.access_token;
    } catch (error) {
      console.error('获取微信access_token失败:', error);
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
        error: '微信服务未启用'
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
            type: "view",
            name: "访问官网",
            url: "https://www.zhiweijz.cn"
          },
          {
            type: "view",
            name: "账号绑定",
            url: authUrl
          },
          {
            type: "view",
            name: "下载App",
            url: "https://www.zhiweijz.cn/downloads"
          }
        ]
      };

      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/menu/create?access_token=${accessToken}`,
        menuConfig
      );

      if (response.data.errcode === 0) {
        console.log('微信菜单创建成功');
        return {
          success: true,
          data: response.data
        };
      } else {
        console.error('微信菜单创建失败:', response.data);
        return {
          success: false,
          error: `创建失败: ${response.data.errmsg}`
        };
      }
    } catch (error) {
      console.error('创建微信菜单异常:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 验证微信服务器签名
   */
  verifySignature(signature: string, timestamp: string, nonce: string, echostr?: string): boolean {
    if (!this.isEnabled) {
      console.warn('微信服务未启用，签名验证失败');
      return false;
    }

    const tmpArr = [this.token, timestamp, nonce].sort();
    const tmpStr = tmpArr.join('');
    const sha1 = crypto.createHash('sha1').update(tmpStr).digest('hex');

    const isValid = sha1 === signature;

    if (!isValid) {
      console.log('微信签名验证失败');
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
      await this.logMessage(openid, message.MsgType, message.Content || message.Event || '', 'pending');

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
          responseContent = '暂不支持图片消息，请发送文字进行记账。\n\n发送"帮助"查看使用说明。';
          break;
        case 'voice':
          responseContent = '暂不支持语音消息，请发送文字进行记账。\n\n发送"帮助"查看使用说明。';
          break;
        case 'video':
          responseContent = '暂不支持视频消息，请发送文字进行记账。\n\n发送"帮助"查看使用说明。';
          break;
        case 'location':
          responseContent = '暂不支持位置消息，请发送文字进行记账。\n\n发送"帮助"查看使用说明。';
          break;
        default:
          responseContent = '抱歉，暂不支持此类型消息。\n\n请发送文字消息进行记账，或发送"帮助"查看使用说明。';
      }

      const processingTime = Date.now() - startTime;

      // 更新消息日志
      await this.updateMessageLog(openid, message.Content || message.Event || '', responseContent, 'success', processingTime);

      return this.createResponse(message, responseContent);
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      // 记录错误日志
      await this.updateMessageLog(openid, message.Content || message.Event || '', '', 'failed', processingTime, errorMessage);

      console.error('处理微信消息失败:', {
        error: errorMessage,
        openid,
        messageType: message.MsgType,
        content: message.Content || message.Event,
        processingTime
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

    // 检查用户是否已绑定
    const binding = await this.getUserBinding(openid);

    if (!binding) {
      return this.getBindingInstructions();
    }

    if (!binding.is_active) {
      return '您的账号绑定已被禁用，请联系管理员重新激活。\n\n如需帮助，请发送"帮助"。';
    }

    // 检查是否有默认账本
    if (!binding.default_account_book_id) {
      // 如果是设置账本的命令，允许执行
      if (cleanContent.includes('设置账本') || cleanContent.includes('选择账本')) {
        return await this.handleAccountBookSelection(binding.user_id);
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
      return await this.handleAccountBookSelection(binding.user_id);
    }

    // 统计查询命令
    if (lowerContent.includes('查看余额') || lowerContent.includes('余额查询') || lowerContent.includes('账本统计')) {
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
        return await this.handleRecentQuery(binding.user_id, binding.default_account_book_id, intent.limit || 5);

      case 'timeRange':
        if (intent.timeRange) {
          return await this.handleTimeRangeQuery(
            binding.user_id,
            binding.default_account_book_id,
            intent.timeRange.start,
            intent.timeRange.end,
            intent.timeRange.period
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
        this.handleSmartAccountingAsync(openid, binding.user_id, binding.default_account_book_id, cleanContent, true);
        return ''; // 返回空字符串，通过客服消息API异步发送结果
    }
  }

  /**
   * 处理事件消息
   */
  private async handleEventMessage(openid: string, message: any): Promise<string> {
    const event = message.Event;

    console.log('处理微信事件:', {
      openid,
      event,
      eventKey: message.EventKey,
      timestamp: new Date().toISOString()
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
        console.log('未处理的微信事件:', event);
        return '感谢您的操作！\n\n如需记账，请发送消息，或发送"帮助"查看使用说明。';
    }
  }

  /**
   * 异步处理智能记账
   */
  private async handleSmartAccountingAsync(openid: string, userId: string, accountBookId: string, description: string, createTransaction: boolean = false): Promise<void> {
    try {
      const result = await this.smartAccountingService.processWechatAccounting(
        userId,
        accountBookId,
        description,
        createTransaction
      );

      // 通过客服消息API发送结果
      const message = result.success ? result.message : result.message;
      await this.sendCustomMessage(openid, message);

    } catch (error) {
      console.error('异步智能记账处理失败:', error);
      // 发送错误消息给用户
      await this.sendCustomMessage(openid, '记账处理失败，请稍后重试。');
    }
  }

  /**
   * 处理智能记账（同步版本，用于其他场景）
   */
  private async handleSmartAccounting(userId: string, accountBookId: string, description: string, createTransaction: boolean = false): Promise<string> {
    try {
      const result = await this.smartAccountingService.processWechatAccounting(
        userId,
        accountBookId,
        description,
        createTransaction
      );

      return result.success ? result.message : result.message;

    } catch (error) {
      console.error('智能记账处理失败:', error);
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
            const bookType = book.type === 'FAMILY' ? `[家庭账本${book.familyName ? '-' + book.familyName : ''}]` : '[个人账本]';
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
      console.error('处理账号绑定失败:', error);
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
      console.error('处理账本选择失败:', error);
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
      console.error('处理解除绑定失败:', error);
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
      console.error('获取绑定信息失败:', error);
      return '获取绑定信息失败，请稍后重试。';
    }
  }

  /**
   * 处理账本选择
   */
  private async handleAccountBookSelection(userId: string): Promise<string> {
    try {
      const accountBooks = await prisma.accountBook.findMany({
        where: {
          OR: [
            { userId },
            {
              type: 'FAMILY',
              family: {
                members: {
                  some: { userId }
                }
              }
            }
          ]
        },
        include: {
          family: true
        }
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
      console.error('获取账本列表失败:', error);
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
      console.error('余额查询失败:', error);
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
      console.error('分类统计查询失败:', error);
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
      console.error('获取预算状态失败:', error);
      return '获取预算状态失败，请稍后重试。';
    }
  }

  /**
   * 处理最近交易查询
   */
  private async handleRecentQuery(userId: string, accountBookId: string, limit: number = 5): Promise<string> {
    try {
      return await this.smartAccountingService.getRecentTransactions(userId, accountBookId, limit);
    } catch (error) {
      console.error('获取最近交易失败:', error);
      return '获取最近交易失败，请稍后重试。';
    }
  }

  /**
   * 处理时间范围查询
   */
  private async handleTimeRangeQuery(userId: string, accountBookId: string, startDate: Date, endDate: Date, period: string): Promise<string> {
    try {
      return await this.smartAccountingService.getTimeRangeStats(userId, accountBookId, startDate, endDate, period);
    } catch (error) {
      console.error('获取时间范围统计失败:', error);
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
      default:
        return '感谢您的操作！';
    }
  }

  /**
   * 获取用户绑定信息
   */
  private async getUserBinding(openid: string) {
    return await prisma.wechat_user_bindings.findUnique({
      where: { openid },
      include: {
        users: true,
        account_books: true
      }
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
          status: 'success'
        }
      });
    } catch (error) {
      console.error('记录用户事件失败:', error);
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
          status
        }
      });
    } catch (error) {
      console.error('记录消息日志失败:', error);
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
    errorMessage?: string
  ) {
    try {
      const latestLog = await prisma.wechat_message_logs.findFirst({
        where: { openid, content },
        orderBy: { created_at: 'desc' }
      });

      if (latestLog) {
        await prisma.wechat_message_logs.update({
          where: { id: latestLog.id },
          data: {
            response,
            status,
            processing_time: processingTime,
            error_message: errorMessage
          }
        });
      }
    } catch (error) {
      console.error('更新消息日志失败:', error);
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
      Content: content
    };
  }

  /**
   * 获取绑定说明
   */
  private getBindingInstructions(): string {
    return '🔗 账号绑定说明\n\n' +
           '请按以下格式发送绑定信息：\n' +
           '绑定 邮箱 密码\n\n' +
           '例如：\n' +
           '绑定 user@example.com 123456\n\n' +
           '⚠️ 注意：\n' +
           '• 请使用您在只为记账应用中注册的邮箱\n' +
           '• 密码为您的登录密码\n' +
           '• 绑定成功后可选择默认账本\n\n' +
           '如需帮助，请发送"帮助"';
  }

  /**
   * 获取欢迎消息
   */
  private getWelcomeMessage(): string {
    return '🎉 欢迎关注只为记账！\n\n' +
           '我是您的智能记账助手，可以帮您：\n' +
           '📝 智能记账 - 发送消费信息即可自动记账\n' +
           '💰 查看余额 - 随时了解财务状况\n' +
           '📊 账本管理 - 切换不同账本\n\n' +
           '请先点击菜单"绑定账号"开始使用！';
  }

  /**
   * 检查是否是非记账内容
   */
  private isNonAccountingContent(content: string): boolean {
    const lowerContent = content.toLowerCase();

    // 常见的非记账关键词
    const nonAccountingKeywords = [
      '你好', 'hello', 'hi', '在吗', '在不在',
      '怎么样', '如何', '什么时候', '为什么',
      '天气', '新闻', '股票', '彩票',
      '聊天', '无聊', '哈哈', '呵呵',
      '测试', 'test', '试试',
      '谢谢', '感谢', 'thanks',
      '再见', 'bye', '拜拜'
    ];

    // 检查是否包含非记账关键词
    const hasNonAccountingKeywords = nonAccountingKeywords.some(keyword =>
      lowerContent.includes(keyword)
    );

    // 检查是否是纯文字且没有数字（记账通常包含金额）
    const hasNumbers = /\d/.test(content);
    const isVeryShort = content.length < 3;
    const isOnlyLetters = /^[a-zA-Z\s]+$/.test(content);

    return hasNonAccountingKeywords ||
           (isVeryShort && !hasNumbers) ||
           (isOnlyLetters && content.length < 10);
  }

  /**
   * 获取帮助信息
   */
  private getHelpMessage(): string {
    return '📖 使用帮助\n\n' +
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
           '如有问题，请联系客服。';
  }

  /**
   * 用户登录并获取账本列表
   */
  public async loginAndGetAccountBooks(email: string, password: string): Promise<{
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
          passwordHash: true
        }
      });

      if (!user) {
        return {
          success: false,
          message: '用户不存在，请检查邮箱地址'
        };
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        return {
          success: false,
          message: '密码错误，请重新输入'
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
                  some: { userId: user.id }
                }
              }
            }
          ]
        },
        include: {
          family: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      // 格式化账本数据
      const formattedBooks = accountBooks.map(book => ({
        id: book.id,
        name: book.name,
        type: book.type,
        familyName: book.family?.name
      }));

      return {
        success: true,
        message: '登录成功',
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email
          },
          accountBooks: formattedBooks
        }
      };

    } catch (error) {
      console.error('登录获取账本失败:', error);
      return {
        success: false,
        message: '登录失败，请稍后重试'
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
          grant_type: 'authorization_code'
        }
      });

      if (response.data.errcode) {
        throw new Error(`获取OpenID失败: ${response.data.errmsg}`);
      }

      return response.data.openid;
    } catch (error) {
      console.error('获取OpenID失败:', error);
      throw error;
    }
  }

  /**
   * 绑定微信账号
   */
  public async bindWechatAccount(openid: string, userId: string, accountBookId: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      // 检查用户是否存在
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true }
      });

      if (!user) {
        return {
          success: false,
          message: '用户不存在'
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
                  some: { userId }
                }
              }
            }
          ]
        },
        select: { id: true, name: true, type: true }
      });

      if (!accountBook) {
        return {
          success: false,
          message: '账本不存在或您没有权限访问'
        };
      }

      // 检查是否已经绑定
      const existingBinding = await prisma.wechat_user_bindings.findUnique({
        where: { openid }
      });

      if (existingBinding) {
        // 更新绑定信息
        await prisma.wechat_user_bindings.update({
          where: { openid },
          data: {
            user_id: userId,
            default_account_book_id: accountBookId,
            is_active: true,
            updated_at: new Date()
          }
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
            updated_at: new Date()
          }
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
      this.sendCustomMessage(openid, welcomeMessage).catch(error => {
        console.error('发送绑定成功消息失败:', error);
      });

      return {
        success: true,
        message: `绑定成功！已设置"${accountBook.name}"为默认账本`,
        data: {
          user: user,
          accountBook: accountBook
        }
      };

    } catch (error) {
      console.error('绑定微信账号失败:', error);
      return {
        success: false,
        message: '绑定失败，请稍后重试'
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
        where: { openid }
      });

      if (!existingBinding) {
        return {
          success: false,
          message: '未找到绑定记录'
        };
      }

      // 删除绑定记录
      await prisma.wechat_user_bindings.delete({
        where: { openid }
      });

      return {
        success: true,
        message: '解绑成功'
      };

    } catch (error) {
      console.error('解绑微信账号失败:', error);
      return {
        success: false,
        message: '解绑失败，请稍后重试'
      };
    }
  }

  /**
   * 发送客服消息
   */
  public async sendCustomMessage(openid: string, content: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      if (!this.isEnabled) {
        console.log('微信服务未启用，跳过发送消息');
        return {
          success: false,
          message: '微信服务未启用'
        };
      }

      const accessToken = await this.getAccessToken();

      const messageData = {
        touser: openid,
        msgtype: 'text',
        text: {
          content: content
        }
      };

      const response = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`,
        messageData
      );

      if (response.data.errcode === 0) {
        console.log('✅ 客服消息发送成功:', { openid, content: content.substring(0, 50) + '...' });
        return {
          success: true,
          message: '消息发送成功'
        };
      } else {
        console.error('❌ 客服消息发送失败:', response.data);
        return {
          success: false,
          message: `发送失败: ${response.data.errmsg}`
        };
      }

    } catch (error) {
      console.error('发送客服消息失败:', error);
      return {
        success: false,
        message: '发送消息失败，请稍后重试'
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
          type: 'PERSONAL'
        },
        select: {
          id: true,
          name: true,
          type: true,
          isDefault: true
        }
      });

      // 获取用户参与的家庭账本
      const familyBooks = await prisma.accountBook.findMany({
        where: {
          type: 'FAMILY',
          family: {
            members: {
              some: { userId }
            }
          }
        },
        select: {
          id: true,
          name: true,
          type: true,
          isDefault: true,
          family: {
            select: {
              name: true
            }
          }
        }
      });

      const allBooks = [
        ...personalBooks,
        ...familyBooks.map(book => ({
          ...book,
          familyName: book.family?.name
        }))
      ];

      return {
        success: true,
        data: allBooks
      };

    } catch (error) {
      console.error('获取用户账本失败:', error);
      return {
        success: false,
        message: '获取账本失败，请稍后重试'
      };
    }
  }
}
