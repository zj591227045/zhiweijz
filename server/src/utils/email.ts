import { logger } from '../utils/logger';
import nodemailer from 'nodemailer';
import { config } from '../config';

/**
 * 邮件发送配置
 */
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * 邮件内容
 */
interface EmailContent {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

/**
 * 邮件发送工具类
 */
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // 创建邮件发送器
    const emailConfig: EmailConfig = {
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.user,
        pass: config.email.password,
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);
  }

  /**
   * 发送邮件
   * @param content 邮件内容
   */
  async sendEmail(content: EmailContent): Promise<boolean> {
    try {
      const mailOptions = {
        from: `"只为记账" <${config.email.user}>`,
        to: content.to,
        subject: content.subject,
        text: content.text,
        html: content.html,
      };

      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      logger.error('发送邮件失败:', error);
      return false;
    }
  }

  /**
   * 发送密码重置邮件
   * @param email 用户邮箱
   * @param resetToken 重置令牌
   * @param userName 用户名
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName: string,
  ): Promise<boolean> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${resetToken}`;

    const subject = '【只为记账】密码重置';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">密码重置</h2>
        <p>亲爱的 ${userName}：</p>
        <p>我们收到了您的密码重置请求。请点击下面的链接重置您的密码：</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
            重置密码
          </a>
        </p>
        <p>或者复制以下链接到浏览器地址栏：</p>
        <p>${resetUrl}</p>
        <p>此链接将在24小时后失效。</p>
        <p>如果您没有请求重置密码，请忽略此邮件，您的账户将保持安全。</p>
        <p>谢谢！</p>
        <p>只为记账团队</p>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject,
      html,
    });
  }
}

// 创建邮件服务实例
export const emailService = new EmailService();
