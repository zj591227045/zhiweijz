import { Request, Response } from 'express';
import { SecurityService } from '../services/security.service';
import { 
  ChangePasswordDto, 
  ChangeEmailDto, 
  SendVerificationCodeDto,
  SecurityLogQueryParams
} from '../models/security.model';

export class SecurityController {
  private securityService: SecurityService;

  constructor() {
    this.securityService = new SecurityService();
  }

  /**
   * 获取用户安全设置
   */
  async getUserSecurity(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const securitySettings = await this.securityService.getUserSecurity(userId);
      res.status(200).json(securitySettings);
    } catch (error) {
      console.error('获取用户安全设置失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取用户安全设置失败' });
      }
    }
  }

  /**
   * 修改密码
   */
  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const passwordData: ChangePasswordDto = req.body;
      await this.securityService.changePassword(userId, passwordData);
      res.status(200).json({ message: '密码修改成功' });
    } catch (error) {
      console.error('修改密码失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '修改密码失败' });
      }
    }
  }

  /**
   * 发送邮箱验证码
   */
  async sendEmailVerificationCode(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const codeData: SendVerificationCodeDto = req.body;
      await this.securityService.sendEmailVerificationCode(userId, codeData);
      res.status(200).json({ message: '验证码已发送' });
    } catch (error) {
      console.error('发送验证码失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '发送验证码失败' });
      }
    }
  }

  /**
   * 修改邮箱
   */
  async changeEmail(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const emailData: ChangeEmailDto = req.body;
      await this.securityService.changeEmail(userId, emailData);
      res.status(200).json({ message: '邮箱修改成功' });
    } catch (error) {
      console.error('修改邮箱失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '修改邮箱失败' });
      }
    }
  }

  /**
   * 获取用户登录会话列表
   */
  async getUserSessions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const sessions = await this.securityService.getUserSessions(userId);
      res.status(200).json({ sessions });
    } catch (error) {
      console.error('获取登录会话失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取登录会话失败' });
      }
    }
  }

  /**
   * 登出指定会话
   */
  async logoutSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const sessionId = req.params.sessionId;
      await this.securityService.logoutSession(userId, sessionId);
      res.status(200).json({ message: '设备已登出' });
    } catch (error) {
      console.error('登出会话失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '登出会话失败' });
      }
    }
  }

  /**
   * 获取安全日志
   */
  async getSecurityLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 解析查询参数
      const params: SecurityLogQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        type: req.query.type as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await this.securityService.getSecurityLogs(userId, params);
      res.status(200).json(result);
    } catch (error) {
      console.error('获取安全日志失败:', error);
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取安全日志失败' });
      }
    }
  }
}
