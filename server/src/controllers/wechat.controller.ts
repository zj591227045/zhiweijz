import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { WechatService, WechatMessage } from '../services/wechat.service';
import { WechatConfigService } from '../services/wechat-config.service';
import { WechatBindingService } from '../services/wechat-binding.service';

export class WechatController {
  private wechatService: WechatService;
  private configService: WechatConfigService;
  private bindingService: WechatBindingService;
  private processedMessages: Set<string> = new Set();

  constructor() {
    this.wechatService = new WechatService();
    this.configService = new WechatConfigService();
    this.bindingService = new WechatBindingService();

    // 定期清理已处理消息记录（避免内存泄漏）
    setInterval(() => {
      this.processedMessages.clear();
    }, 300000); // 5分钟清理一次
  }

  /**
   * 微信服务器验证
   */
  public async verify(req: Request, res: Response) {
    try {
      // 检查微信服务是否启用
      if (!this.wechatService.isWechatEnabled()) {
        logger.info('微信服务未启用');
        return res.status(503).send('Wechat service not configured');
      }

      const wechatParams = req.wechatParams;

      if (!wechatParams) {
        return res.status(400).send('Missing wechat parameters');
      }

      const isValid = this.wechatService.verifySignature(
        wechatParams.signature,
        wechatParams.timestamp,
        wechatParams.nonce,
        wechatParams.echostr,
      );

      if (isValid && wechatParams.echostr) {
        logger.info('微信服务器验证成功');
        return res.send(wechatParams.echostr);
      } else {
        logger.info('微信服务器验证失败');
        return res.status(403).send('Verification failed');
      }
    } catch (error) {
      logger.error('微信验证错误:', error);
      return res.status(500).send('Internal server error');
    }
  }

  /**
   * 处理微信消息
   */
  public async handleMessage(req: Request, res: Response) {
    try {
      // 检查微信服务是否启用
      if (!this.wechatService.isWechatEnabled()) {
        logger.info('微信服务未启用');
        return res.send('success'); // 返回success避免微信重试
      }

      const wechatParams = req.wechatParams;

      if (!wechatParams) {
        return res.status(400).send('Missing wechat parameters');
      }

      // 验证签名
      if (
        !this.wechatService.verifySignature(
          wechatParams.signature,
          wechatParams.timestamp,
          wechatParams.nonce,
        )
      ) {
        logger.info('微信消息签名验证失败');
        return res.send('success'); // 返回success避免微信重试
      }

      // 获取解析后的消息数据并转换数组为字符串
      const rawMessage = req.body as any;

      // 记录原始消息数据用于调试
      logger.info('🔍 [微信消息调试] 原始消息数据 (rawMessage):');
      logger.info(JSON.stringify(rawMessage, null, 2));

      // 转换微信XML解析后的数组格式为字符串
      const message: WechatMessage = {
        ToUserName: Array.isArray(rawMessage.ToUserName)
          ? rawMessage.ToUserName[0]
          : rawMessage.ToUserName,
        FromUserName: Array.isArray(rawMessage.FromUserName)
          ? rawMessage.FromUserName[0]
          : rawMessage.FromUserName,
        CreateTime: Array.isArray(rawMessage.CreateTime)
          ? rawMessage.CreateTime[0]
          : rawMessage.CreateTime,
        MsgType: Array.isArray(rawMessage.MsgType) ? rawMessage.MsgType[0] : rawMessage.MsgType,
        Content: Array.isArray(rawMessage.Content) ? rawMessage.Content[0] : rawMessage.Content,
        MsgId: Array.isArray(rawMessage.MsgId) ? rawMessage.MsgId[0] : rawMessage.MsgId,
        Event: Array.isArray(rawMessage.Event) ? rawMessage.Event[0] : rawMessage.Event,
        EventKey: Array.isArray(rawMessage.EventKey) ? rawMessage.EventKey[0] : rawMessage.EventKey,
        // 语音消息字段
        MediaId: Array.isArray(rawMessage.MediaId) ? rawMessage.MediaId[0] : rawMessage.MediaId,
        Format: Array.isArray(rawMessage.Format) ? rawMessage.Format[0] : rawMessage.Format,
        Recognition: Array.isArray(rawMessage.Recognition) ? rawMessage.Recognition[0] : rawMessage.Recognition,
        // 图片消息字段
        PicUrl: Array.isArray(rawMessage.PicUrl) ? rawMessage.PicUrl[0] : rawMessage.PicUrl,
      };

      // 记录转换后的消息数据用于调试
      logger.info('🔍 [微信消息调试] 转换后的消息数据 (message):');
      logger.info(JSON.stringify(message, null, 2));

      if (!message || !message.FromUserName) {
        logger.info('微信消息数据无效');
        return res.send('success');
      }

      // 消息排重（根据官方文档建议）
      const messageId = message.MsgId
        ? message.MsgId.toString()
        : `${message.FromUserName}_${message.CreateTime}`;

      if (this.processedMessages.has(messageId)) {
        logger.info('重复消息，忽略处理:', messageId);
        return res.send('success');
      }

      this.processedMessages.add(messageId);

      logger.info('收到微信消息:', {
        fromUser: message.FromUserName,
        msgType: message.MsgType,
        content: message.Content || message.Event,
        // 语音消息相关字段
        mediaId: message.MediaId,
        format: message.Format,
        recognition: message.Recognition, // 这是微信语音转文字的结果
        // 图片消息相关字段
        picUrl: message.PicUrl,
        // 其他字段
        msgId: message.MsgId,
        timestamp: new Date().toISOString(),
      });

      // 根据消息类型设置不同的超时时间
      let timeoutMs = 4000; // 默认4秒
      if (message.MsgType === 'voice' || message.MsgType === 'image') {
        timeoutMs = 8000; // 语音和图片处理延长到8秒
      }
      
      // 设置超时，确保在微信限制内响应
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Processing timeout')), timeoutMs);
      });

      try {
        // 处理消息，带超时控制
        const response = await Promise.race([
          this.wechatService.handleMessage(message),
          timeoutPromise,
        ]);

        // 返回XML响应
        const responseXML = this.buildResponseXML(response);

        if (responseXML) {
          res.set('Content-Type', 'application/xml');
          return res.send(responseXML);
        } else {
          // 当返回空内容时，返回success（用于异步处理场景）
          return res.send('success');
        }
      } catch (timeoutError) {
        logger.info('消息处理超时，返回success避免微信重试');
        return res.send('success');
      }
    } catch (error) {
      logger.error('处理微信消息错误:', error);
      return res.send('success'); // 微信要求返回success避免重试
    }
  }

  /**
   * 微信回调处理（GET和POST统一入口）
   */
  public async callback(req: Request, res: Response) {
    if (req.method === 'GET') {
      return this.verify(req, res);
    } else if (req.method === 'POST') {
      return this.handleMessage(req, res);
    } else {
      return res.status(405).send('Method not allowed');
    }
  }

  /**
   * 构建XML响应
   */
  private buildResponseXML(response: any): string {
    if (!response || !response.Content) {
      return '';
    }

    return `<xml>
<ToUserName><![CDATA[${response.ToUserName}]]></ToUserName>
<FromUserName><![CDATA[${response.FromUserName}]]></FromUserName>
<CreateTime>${response.CreateTime}</CreateTime>
<MsgType><![CDATA[${response.MsgType}]]></MsgType>
<Content><![CDATA[${response.Content}]]></Content>
</xml>`;
  }

  /**
   * 获取微信访问令牌
   */
  public async getAccessToken(req: Request, res: Response) {
    try {
      // 这里可以实现获取微信访问令牌的逻辑
      // 用于后续的主动消息发送等功能
      res.json({ message: '获取访问令牌功能待实现' });
    } catch (error) {
      logger.error('获取访问令牌错误:', error);
      res.status(500).json({ error: '获取访问令牌失败' });
    }
  }

  /**
   * 设置微信菜单
   */
  public async setMenu(req: Request, res: Response) {
    try {
      if (!this.wechatService.isWechatEnabled()) {
        return res.status(400).json({
          success: false,
          error: '微信服务未启用',
          message: '请检查微信配置',
        });
      }

      const result = await this.wechatService.createMenu();

      if (result.success) {
        res.json({
          success: true,
          message: '微信菜单创建成功',
          data: result.data,
        });
      } else {
        res.status(400).json({
          success: false,
          error: result.error,
          message: '微信菜单创建失败',
        });
      }
    } catch (error) {
      logger.error('设置菜单错误:', error);
      res.status(500).json({
        success: false,
        error: '设置菜单失败',
        message: '服务器内部错误',
      });
    }
  }

  /**
   * 获取微信服务状态
   */
  public async getStatus(req: Request, res: Response) {
    try {
      const status = await this.configService.getServiceStatus();
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.error('获取服务状态错误:', error);
      res.status(500).json({
        success: false,
        error: '获取服务状态失败',
      });
    }
  }

  /**
   * 获取错误统计
   */
  public async getErrorStats(req: Request, res: Response) {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const errorStats = await this.configService.getErrorStats(days);

      res.json({
        success: true,
        data: errorStats,
      });
    } catch (error) {
      logger.error('获取错误统计错误:', error);
      res.status(500).json({
        success: false,
        error: '获取错误统计失败',
      });
    }
  }

  /**
   * 清理过期日志
   */
  public async cleanupLogs(req: Request, res: Response) {
    try {
      const retentionDays = parseInt(req.body.retentionDays) || 30;
      const deletedCount = await this.configService.cleanupOldLogs(retentionDays);

      res.json({
        success: true,
        message: `成功清理 ${deletedCount} 条过期日志`,
        deletedCount,
      });
    } catch (error) {
      logger.error('清理日志错误:', error);
      res.status(500).json({
        success: false,
        error: '清理日志失败',
      });
    }
  }

  /**
   * 健康检查
   */
  public async health(req: Request, res: Response) {
    const isEnabled = this.wechatService.isWechatEnabled();

    res.json({
      status: 'ok',
      service: 'wechat-integration',
      enabled: isEnabled,
      message: isEnabled ? '微信服务已启用' : '微信服务未配置',
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 用户登录并获取账本列表
   */
  public async loginAndGetBooks(req: Request, res: Response) {
    try {
      const { email, password, openid } = req.body;

      logger.info('🎯 WechatController.loginAndGetBooks 被调用');
      logger.info('📝 收到登录请求:', { email, openid, hasPassword: !!password });
      logger.info('📋 完整请求体:', req.body);

      if (!email || !password) {
        return this.renderErrorPage(res, '请填写完整的登录信息');
      }

      if (!openid) {
        return this.renderErrorPage(res, '无法获取微信用户信息，请重新进入');
      }

      const result = await this.wechatService.loginAndGetAccountBooks(email, password);

      if (result.success && result.data) {
        // 渲染账本选择页面
        return this.renderAccountBooksPage(
          res,
          result.data!.user,
          result.data!.accountBooks,
          openid,
        );
      } else {
        return this.renderErrorPage(res, result.message || '登录失败');
      }
    } catch (error) {
      logger.error('登录获取账本错误:', error);
      return this.renderErrorPage(res, '服务器内部错误');
    }
  }

  /**
   * 渲染错误页面
   */
  private renderErrorPage(res: Response, message: string) {
    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>登录失败 - 只为记账</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
              .icon { font-size: 48px; margin-bottom: 20px; }
              h1 { color: #333; margin-bottom: 20px; }
              p { color: #666; line-height: 1.6; margin-bottom: 20px; }
              .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="icon">❌</div>
              <h1>登录失败</h1>
              <p>${message}</p>
              <a href="javascript:history.back()" class="btn">返回重试</a>
          </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /**
   * 渲染账本选择页面
   */
  private renderAccountBooksPage(res: Response, user: any, accountBooks: any[], openid: string) {
    let accountBooksHtml = '';

    if (accountBooks.length === 0) {
      accountBooksHtml =
        '<p style="text-align: center; color: #666;">您还没有任何账本，请先在应用中创建账本。</p>';
    } else {
      accountBooks.forEach((book, index) => {
        const bookType =
          book.type === 'FAMILY'
            ? `家庭账本${book.familyName ? ' - ' + book.familyName : ''}`
            : '个人账本';

        accountBooksHtml += `
          <label class="account-book-item" for="book_${book.id}">
              <input type="radio" name="accountBookId" value="${book.id}" id="book_${book.id}" required>
              <div class="book-content">
                  <h4>${book.name}</h4>
                  <p>${bookType}</p>
              </div>
          </label>
        `;
      });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>选择账本 - 只为记账</title>
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
              .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
              .header h1 { font-size: 24px; margin-bottom: 8px; }
              .header p { opacity: 0.9; font-size: 14px; }
              .content { padding: 30px 20px; }
              .account-book-item { display: block; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; margin-bottom: 10px; cursor: pointer; transition: all 0.3s; position: relative; }
              .account-book-item:hover { border-color: #667eea; background: #f8f9ff; }
              .account-book-item input[type="radio"] { position: absolute; top: 12px; right: 12px; width: 18px; height: 18px; cursor: pointer; }
              .account-book-item input[type="radio"]:checked + .book-content { background: #f8f9ff; }
              .account-book-item input[type="radio"]:checked { accent-color: #667eea; }
              .account-book-item:has(input[type="radio"]:checked) { border-color: #667eea; background: #f8f9ff; }
              .book-content { padding-right: 30px; }
              .account-book-item h4 { margin-bottom: 4px; color: #333; }
              .account-book-item p { color: #666; font-size: 12px; }
              .btn { width: 100%; padding: 14px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 20px; }
              .btn:disabled { opacity: 0.6; cursor: not-allowed; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🔗 选择账本</h1>
                  <p>欢迎，${user.name}！请选择要绑定的账本</p>
              </div>
              <div class="content">
                  <form method="POST" action="/api/wechat/bind-account" id="bindForm">
                      <input type="hidden" name="openid" value="${openid}">
                      <input type="hidden" name="userId" value="${user.id}">
                      ${accountBooksHtml}

                      <button type="submit" class="btn" id="bindBtn">确认绑定</button>
                  </form>
              </div>
          </div>
          <!-- 不使用JavaScript，改用纯HTML表单 -->
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /**
   * 绑定微信账号
   */
  public async bindAccount(req: Request, res: Response) {
    try {
      const { openid, userId, accountBookId } = req.body;

      logger.info('📝 收到绑定请求:', { openid, userId, accountBookId });

      if (!openid || !userId || !accountBookId) {
        return this.renderErrorPage(res, '缺少必要参数');
      }

      const result = await this.wechatService.bindWechatAccount(openid, userId, accountBookId);

      if (result.success) {
        return this.renderSuccessPage(res, result.message);
      } else {
        return this.renderErrorPage(res, result.message);
      }
    } catch (error) {
      logger.error('绑定账号错误:', error);
      return this.renderErrorPage(res, '服务器内部错误');
    }
  }

  /**
   * 解绑微信账号
   */
  public async unbindAccount(req: Request, res: Response) {
    try {
      const { openid } = req.body;

      logger.info('📝 收到解绑请求:', { openid });

      if (!openid) {
        return this.renderErrorPage(res, '缺少必要参数');
      }

      const result = await this.wechatService.unbindWechatAccount(openid);

      if (result.success) {
        return this.renderUnbindSuccessPage(res, '解绑成功！您可以重新绑定其他账号。');
      } else {
        return this.renderErrorPage(res, result.message);
      }
    } catch (error) {
      logger.error('解绑账号错误:', error);
      return this.renderErrorPage(res, '服务器内部错误');
    }
  }

  /**
   * 渲染重新绑定页面（已绑定用户）
   */
  private renderRebindingPage(
    res: Response,
    bindingInfo: any,
    accountBooks: any[],
    openid: string,
  ) {
    let accountBooksHtml = '';

    if (accountBooks.length === 0) {
      accountBooksHtml =
        '<p style="text-align: center; color: #666;">您还没有任何账本，请先在应用中创建账本。</p>';
    } else {
      accountBooks.forEach((book, index) => {
        const bookType =
          book.type === 'FAMILY'
            ? `家庭账本${book.familyName ? ' - ' + book.familyName : ''}`
            : '个人账本';

        const isSelected = book.id === bindingInfo.defaultAccountBookId;

        accountBooksHtml += `
          <label class="account-book-item ${isSelected ? 'current-binding' : ''}" for="book_${
          book.id
        }">
              <input type="radio" name="accountBookId" value="${book.id}" id="book_${book.id}" ${
          isSelected ? 'checked' : ''
        } required>
              <div class="book-content">
                  <h4>${book.name} ${isSelected ? '(当前绑定)' : ''}</h4>
                  <p>${bookType}</p>
              </div>
          </label>
        `;
      });
    }

    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>重新选择账本 - 只为记账</title>
          <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; padding: 20px; }
              .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.1); overflow: hidden; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
              .header h1 { font-size: 24px; margin-bottom: 8px; }
              .header p { opacity: 0.9; font-size: 14px; }
              .content { padding: 30px 20px; }
              .account-book-item { display: block; padding: 12px; border: 2px solid #e1e5e9; border-radius: 8px; margin-bottom: 10px; cursor: pointer; transition: all 0.3s; position: relative; }
              .account-book-item:hover { border-color: #667eea; background: #f8f9ff; }
              .account-book-item.current-binding { border-color: #28a745; background: #f8fff8; }
              .account-book-item input[type="radio"] { position: absolute; top: 12px; right: 12px; width: 18px; height: 18px; cursor: pointer; }
              .account-book-item input[type="radio"]:checked + .book-content { background: #f8f9ff; }
              .account-book-item input[type="radio"]:checked { accent-color: #667eea; }
              .account-book-item:has(input[type="radio"]:checked) { border-color: #667eea; background: #f8f9ff; }
              .book-content { padding-right: 30px; }
              .account-book-item h4 { margin-bottom: 4px; color: #333; }
              .account-book-item p { color: #666; font-size: 12px; }
              .btn { width: 100%; padding: 14px; border: none; border-radius: 8px; font-size: 16px; font-weight: 600; cursor: pointer; margin-top: 10px; }
              .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
              .btn-danger { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; }
              .btn:disabled { opacity: 0.6; cursor: not-allowed; }
              .user-info { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
              .user-info h3 { color: #333; margin-bottom: 5px; }
              .user-info p { color: #666; font-size: 14px; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>🔄 重新选择账本</h1>
                  <p>您已绑定账号，可以更换绑定的账本</p>
              </div>
              <div class="content">
                  <div class="user-info">
                      <h3>当前绑定用户</h3>
                      <p>${bindingInfo.userName} (${bindingInfo.userEmail})</p>
                  </div>

                  <form method="POST" action="/api/wechat/bind-account" id="rebindForm">
                      <input type="hidden" name="openid" value="${openid}">
                      <input type="hidden" name="userId" value="${bindingInfo.userId}">
                      ${accountBooksHtml}
                      <button type="submit" class="btn btn-primary" id="rebindBtn">更换绑定账本</button>
                  </form>

                  <form method="POST" action="/api/wechat/unbind-account" id="unbindForm" style="margin-top: 20px;">
                      <input type="hidden" name="openid" value="${openid}">
                      <button type="submit" class="btn btn-danger" id="unbindBtn" onclick="return confirm('确定要解绑当前账号吗？解绑后需要重新登录绑定。')">解绑账号</button>
                  </form>
              </div>
          </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /**
   * 渲染解绑成功页面
   */
  private renderUnbindSuccessPage(res: Response, message: string) {
    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>解绑成功 - 只为记账</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
              .icon { font-size: 48px; margin-bottom: 20px; }
              h1 { color: #333; margin-bottom: 20px; }
              p { color: #666; line-height: 1.6; margin-bottom: 20px; }
              .success { color: #28a745; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="icon">🔓</div>
              <h1 class="success">解绑成功！</h1>
              <p>${message}</p>
              <p>如需重新绑定，请再次点击微信菜单中的"账号绑定"。</p>
              <p style="font-size: 12px; color: #999; margin-top: 30px;">信息已经保存，您可以手动关闭此页面了</p>
          </div>
          <!-- 不自动关闭页面，让用户手动关闭 -->
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /**
   * 渲染成功页面
   */
  private renderSuccessPage(res: Response, message: string) {
    const html = `
      <!DOCTYPE html>
      <html lang="zh-CN">
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>绑定成功 - 只为记账</title>
          <style>
              body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
              .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
              .icon { font-size: 48px; margin-bottom: 20px; }
              h1 { color: #333; margin-bottom: 20px; }
              p { color: #666; line-height: 1.6; margin-bottom: 20px; }
              .success { color: #28a745; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="icon">🎉</div>
              <h1 class="success">绑定成功！</h1>
              <p>${message}</p>
              <p>您现在可以通过微信进行智能记账了。</p>
              <p style="font-size: 12px; color: #999; margin-top: 30px;">信息已经保存，您可以手动关闭此页面了</p>
          </div>
          <!-- 不自动关闭页面，让用户手动关闭 -->
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /**
   * 提供微信绑定页面
   */
  public async getBindingPage(req: Request, res: Response) {
    logger.info('🔍 getBindingPage 被调用了！');
    logger.info('请求头:', req.headers);
    logger.info('查询参数:', req.query);

    try {
      // 检查是否在微信环境中
      const userAgent = req.headers['user-agent'] || '';
      const isWechatBrowser = /MicroMessenger/i.test(userAgent);

      if (!isWechatBrowser) {
        return res.status(403).send(`
          <!DOCTYPE html>
          <html lang="zh-CN">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>访问限制</title>
              <style>
                  body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                  .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
                  .icon { font-size: 48px; margin-bottom: 20px; }
                  h1 { color: #333; margin-bottom: 20px; }
                  p { color: #666; line-height: 1.6; }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="icon">🚫</div>
                  <h1>访问受限</h1>
                  <p>此页面仅限在微信中访问</p>
                  <p>请在微信中打开此链接</p>
              </div>
          </body>
          </html>
        `);
      }

      // 检查是否有微信授权参数
      const code = req.query.code as string;
      const state = req.query.state as string;

      let openid = '';

      if (code) {
        // 如果有授权码，获取用户openid
        try {
          openid = await this.wechatService.getOpenIdFromCode(code);
        } catch (error) {
          logger.error('获取OpenID失败:', error);
          return res.status(400).send(`
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>授权失败</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                    .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
                    .icon { font-size: 48px; margin-bottom: 20px; }
                    h1 { color: #333; margin-bottom: 20px; }
                    p { color: #666; line-height: 1.6; }
                    .btn { display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin-top: 20px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon">❌</div>
                    <h1>授权失败</h1>
                    <p>获取微信用户信息失败，请重试</p>
                    <a href="javascript:history.back()" class="btn">返回重试</a>
                </div>
            </body>
            </html>
          `);
        }
      } else {
        // 没有code参数，生成一个测试openid
        logger.info('⚠️ 没有授权code，使用测试openid');
        openid = 'test_openid_' + Date.now();
      }

      // 检查是否已经绑定过
      const existingBinding = await this.bindingService.getBindingInfo(openid);

      if (existingBinding && existingBinding.isActive) {
        logger.info('🔄 用户已绑定，显示账本重选页面');
        // 获取用户的所有账本
        const accountBooksResult = await this.wechatService.getUserAccountBooks(
          existingBinding.userId,
        );

        if (accountBooksResult.success && accountBooksResult.data) {
          return this.renderRebindingPage(res, existingBinding, accountBooksResult.data, openid);
        }
      }

      // 读取并返回绑定页面
      const fs = require('fs');
      const path = require('path');

      const htmlPath = path.join(process.cwd(), 'public', 'wechat-binding.html');

      if (!fs.existsSync(htmlPath)) {
        return res.status(404).json({
          success: false,
          message: '绑定页面不存在',
        });
      }

      let htmlContent = fs.readFileSync(htmlPath, 'utf8');

      // 将openid注入到页面中
      if (openid) {
        htmlContent = htmlContent.replace('{{OPENID_PLACEHOLDER}}', openid);
      } else {
        htmlContent = htmlContent.replace('{{OPENID_PLACEHOLDER}}', 'test_openid_' + Date.now());
      }

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('X-Frame-Options', 'SAMEORIGIN');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(htmlContent);
    } catch (error) {
      logger.error('获取绑定页面错误:', error);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
      });
    }
  }
}
