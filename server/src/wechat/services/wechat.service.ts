import axios from 'axios';
import * as crypto from 'crypto';
import { pool } from '../../db/db';
import { logger } from '../../utils/logger';
import { TransactionService } from '../../services/transaction.service';
import { UserService } from '../../services/user.service';

/**
 * 微信服务类
 * 处理微信相关的业务逻辑
 */
export class WechatService {
  private appId: string;
  private appSecret: string;
  private accessToken: string | null = null;
  private accessTokenExpires: number = 0;
  private transactionService: TransactionService;
  private userService: UserService;

  constructor() {
    this.appId = process.env.WECHAT_APP_ID || '';
    this.appSecret = process.env.WECHAT_APP_SECRET || '';
    this.transactionService = new TransactionService();
    this.userService = new UserService();
  }

  /**
   * 获取微信访问令牌
   * @returns 访问令牌
   */
  public async getAccessToken(): Promise<string> {
    // 检查缓存的令牌是否有效
    const now = Date.now();
    if (this.accessToken && this.accessTokenExpires > now) {
      return this.accessToken;
    }

    try {
      // 获取新的访问令牌
      const response = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${this.appId}&secret=${this.appSecret}`
      );

      if (response.data.access_token) {
        this.accessToken = response.data.access_token;
        // 设置过期时间（提前5分钟过期，以防止边界情况）
        this.accessTokenExpires = now + (response.data.expires_in - 300) * 1000;
        return this.accessToken;
      } else {
        throw new Error(`获取访问令牌失败: ${JSON.stringify(response.data)}`);
      }
    } catch (error) {
      logger.error('获取微信访问令牌失败:', error);
      throw new Error('获取微信访问令牌失败');
    }
  }

  /**
   * 记录微信消息
   * @param message 消息内容
   * @param direction 消息方向（incoming/outgoing）
   */
  public async logMessage(message: any, direction: 'incoming' | 'outgoing'): Promise<void> {
    try {
      let openid = '';
      let messageType = '';
      
      if (direction === 'incoming') {
        openid = message.FromUserName;
        messageType = message.MsgType;
      } else if (typeof message === 'string') {
        // 尝试从XML字符串中提取信息
        const toUserMatch = message.match(/<ToUserName><!\[CDATA\[(.*?)\]\]><\/ToUserName>/);
        const msgTypeMatch = message.match(/<MsgType><!\[CDATA\[(.*?)\]\]><\/MsgType>/);
        
        if (toUserMatch && toUserMatch[1]) {
          openid = toUserMatch[1];
        }
        
        if (msgTypeMatch && msgTypeMatch[1]) {
          messageType = msgTypeMatch[1];
        }
      }

      // 将消息内容转换为JSON字符串
      const content = typeof message === 'string' ? message : JSON.stringify(message);

      // 记录到数据库
      await pool.query(
        `INSERT INTO wechat_message_logs (openid, message_type, content, direction, status)
         VALUES ($1, $2, $3, $4, $5)`,
        [openid, messageType, content, direction, 'received']
      );
    } catch (error) {
      logger.error('记录微信消息失败:', error);
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 绑定用户
   * @param userId 用户ID
   * @param openid 微信OpenID
   * @returns 绑定信息
   */
  public async bindUser(userId: string, openid: string): Promise<any> {
    try {
      // 检查用户是否存在
      const user = await this.userService.getUserById(userId);
      if (!user) {
        throw new Error('用户不存在');
      }

      // 检查是否已绑定
      const existingBinding = await this.getBindingByOpenid(openid);
      if (existingBinding) {
        // 如果已绑定到同一用户，直接返回
        if (existingBinding.user_id === userId) {
          return existingBinding;
        }
        
        // 如果已绑定到其他用户，先解绑
        await this.unbindUser(undefined, openid);
      }

      // 获取用户信息
      const userInfo = await this.getUserInfo(openid);
      
      // 创建绑定记录
      const result = await pool.query(
        `INSERT INTO wechat_bindings (user_id, openid, unionid, nickname, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [
          userId,
          openid,
          userInfo.unionid || null,
          userInfo.nickname || null,
          userInfo.headimgurl || null
        ]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('绑定用户失败:', error);
      throw new Error('绑定用户失败');
    }
  }

  /**
   * 解绑用户
   * @param userId 用户ID（可选）
   * @param openid 微信OpenID（可选）
   */
  public async unbindUser(userId?: string, openid?: string): Promise<void> {
    try {
      if (!userId && !openid) {
        throw new Error('用户ID和OpenID至少提供一个');
      }

      let query = 'UPDATE wechat_bindings SET is_active = false WHERE ';
      const params = [];

      if (userId) {
        query += 'user_id = $1';
        params.push(userId);
      } else {
        query += 'openid = $1';
        params.push(openid);
      }

      await pool.query(query, params);
    } catch (error) {
      logger.error('解绑用户失败:', error);
      throw new Error('解绑用户失败');
    }
  }

  /**
   * 根据OpenID获取绑定信息
   * @param openid 微信OpenID
   * @returns 绑定信息
   */
  public async getBindingByOpenid(openid: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM wechat_bindings WHERE openid = $1 AND is_active = true',
        [openid]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('获取绑定信息失败:', error);
      throw new Error('获取绑定信息失败');
    }
  }

  /**
   * 根据用户ID获取绑定信息
   * @param userId 用户ID
   * @returns 绑定信息
   */
  public async getBindingByUserId(userId: string): Promise<any> {
    try {
      const result = await pool.query(
        'SELECT * FROM wechat_bindings WHERE user_id = $1 AND is_active = true',
        [userId]
      );

      return result.rows[0] || null;
    } catch (error) {
      logger.error('获取绑定信息失败:', error);
      throw new Error('获取绑定信息失败');
    }
  }

  /**
   * 生成绑定URL
   * @param openid 微信OpenID
   * @returns 绑定URL
   */
  public async generateBindUrl(openid: string): Promise<string> {
    try {
      // 生成一个随机的绑定码
      const bindCode = crypto.randomBytes(16).toString('hex');
      
      // 存储绑定码（有效期10分钟）
      await pool.query(
        `INSERT INTO wechat_bind_codes (code, openid, expires_at)
         VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
        [bindCode, openid]
      );
      
      // 生成绑定URL
      const baseUrl = process.env.APP_URL || 'http://localhost:3000';
      return `${baseUrl}/wechat/bind?code=${bindCode}`;
    } catch (error) {
      logger.error('生成绑定URL失败:', error);
      throw new Error('生成绑定URL失败');
    }
  }

  /**
   * 验证绑定码
   * @param code 绑定码
   * @returns 绑定信息
   */
  public async verifyBindCode(code: string): Promise<any> {
    try {
      const result = await pool.query(
        `SELECT * FROM wechat_bind_codes
         WHERE code = $1 AND expires_at > NOW() AND is_used = false`,
        [code]
      );

      if (result.rows.length === 0) {
        throw new Error('无效或已过期的绑定码');
      }

      // 标记绑定码为已使用
      await pool.query(
        'UPDATE wechat_bind_codes SET is_used = true WHERE code = $1',
        [code]
      );

      return result.rows[0];
    } catch (error) {
      logger.error('验证绑定码失败:', error);
      throw new Error('验证绑定码失败');
    }
  }

  /**
   * 处理用户取消关注
   * @param openid 微信OpenID
   */
  public async handleUnsubscribe(openid: string): Promise<void> {
    try {
      // 解绑用户
      await this.unbindUser(undefined, openid);
    } catch (error) {
      logger.error('处理用户取消关注失败:', error);
      // 不抛出异常，避免影响主流程
    }
  }

  /**
   * 获取用户信息
   * @param openid 微信OpenID
   * @returns 用户信息
   */
  public async getUserInfo(openid: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken();
      
      const response = await axios.get(
        `https://api.weixin.qq.com/cgi-bin/user/info?access_token=${accessToken}&openid=${openid}&lang=zh_CN`
      );

      if (response.data.errcode) {
        throw new Error(`获取用户信息失败: ${response.data.errmsg}`);
      }

      return response.data;
    } catch (error) {
      logger.error('获取用户信息失败:', error);
      // 返回一个空对象，避免影响主流程
      return {};
    }
  }

  /**
   * 处理记账消息
   * @param content 消息内容
   * @param openid 微信OpenID
   * @returns 处理结果
   */
  public async processAccountingMessage(content: string, openid: string): Promise<any> {
    try {
      // 检查用户是否已绑定
      const binding = await this.getBindingByOpenid(openid);
      if (!binding) {
        return {
          success: false,
          message: '您尚未绑定只为记账账号，请先发送"绑定"进行账号绑定。'
        };
      }

      // 解析记账消息
      // 格式：记账 [描述] [金额] [分类]
      // 示例：记账 午餐 25 餐饮
      const parts = content.trim().split(/\s+/);
      
      if (parts.length < 3) {
        return {
          success: false,
          message: '记账格式不正确，正确格式为：记账 [描述] [金额] [分类(可选)]'
        };
      }

      // 提取信息
      const description = parts[1];
      const amount = parseFloat(parts[2]);
      const category = parts.length > 3 ? parts[3] : '其他';

      if (isNaN(amount)) {
        return {
          success: false,
          message: '金额格式不正确，请输入有效的数字。'
        };
      }

      // 创建交易记录
      const transaction = await this.transactionService.createTransaction({
        userId: binding.user_id,
        amount: amount,
        type: 'expense',
        category: category,
        description: description,
        date: new Date(),
        paymentMethod: '微信',
        tags: ['微信记账']
      });

      return {
        success: true,
        message: `记账成功！\n描述：${description}\n金额：${amount}元\n分类：${category}`
      };
    } catch (error) {
      logger.error('处理记账消息失败:', error);
      return {
        success: false,
        message: '记账失败，请稍后重试。'
      };
    }
  }

  /**
   * 处理查询消息
   * @param content 消息内容
   * @param openid 微信OpenID
   * @returns 处理结果
   */
  public async processQueryMessage(content: string, openid: string): Promise<any> {
    try {
      // 检查用户是否已绑定
      const binding = await this.getBindingByOpenid(openid);
      if (!binding) {
        return {
          success: false,
          message: '您尚未绑定只为记账账号，请先发送"绑定"进行账号绑定。'
        };
      }

      // 确定查询类型
      let queryType = '';
      if (content.includes('今日') || content.includes('今天')) {
        queryType = 'today';
      } else if (content.includes('本周') || content.includes('这周')) {
        queryType = 'week';
      } else if (content.includes('本月') || content.includes('这月')) {
        queryType = 'month';
      } else {
        return {
          success: false,
          message: '不支持的查询类型，可用的查询类型：今日、本周、本月'
        };
      }

      // 获取查询结果
      let summary = '';
      switch (queryType) {
        case 'today':
          summary = await this.getTodaySummary(binding.user_i