import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import {
  LoginRequestDto,
  RegisterRequestDto,
  ResetPasswordRequestDto,
  UpdatePasswordRequestDto,
} from '../models/auth.model';
import { CaptchaService } from '../services/captcha.service';
import { shouldRefreshToken, getTokenRemainingTime } from '../utils/jwt';

export class AuthController {
  private authService: AuthService;
  private captchaService: CaptchaService;

  constructor() {
    this.authService = new AuthService();
    this.captchaService = new CaptchaService();
  }

  /**
   * 用户登录
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, captchaToken } = req.body;

      // 如果提供了验证码，先验证验证码
      if (captchaToken) {
        const captchaResult = await this.captchaService.verifySlidingPuzzle(captchaToken, 'login');
        if (!captchaResult.success) {
          res.status(400).json({ message: captchaResult.message || '验证码验证失败' });
          return;
        }
      }

      const loginResponse = await this.authService.login(email, password);
      res.status(200).json(loginResponse);
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ message: error.message });
      } else {
        res.status(500).json({ message: '登录时发生错误' });
      }
    }
  }

  /**
   * 用户注册
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, captchaToken } = req.body;

      // 验证验证码（注册必须提供验证码）
      if (!captchaToken) {
        res.status(400).json({ message: '请完成验证码验证' });
        return;
      }

      const captchaResult = await this.captchaService.verifySlidingPuzzle(captchaToken, 'register');
      if (!captchaResult.success) {
        res.status(400).json({ message: captchaResult.message || '验证码验证失败' });
        return;
      }

      const userData: RegisterRequestDto = { name, email, password };
      const registerResponse = await this.authService.register(userData);
      res.status(201).json(registerResponse);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '注册时发生错误' });
      }
    }
  }

  /**
   * 发送密码重置邮件
   */
  async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email }: ResetPasswordRequestDto = req.body;
      await this.authService.sendPasswordResetEmail(email);
      res.status(200).json({ message: '密码重置邮件已发送' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '发送密码重置邮件时发生错误' });
      }
    }
  }

  /**
   * 重置密码
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password }: UpdatePasswordRequestDto = req.body;
      await this.authService.resetPassword(token, password);
      res.status(200).json({ message: '密码已重置' });
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '重置密码时发生错误' });
      }
    }
  }

  /**
   * 检查认证状态
   */
  async checkAuth(_req: Request, res: Response): Promise<void> {
    try {
      // 如果请求能到达这里，说明认证中间件已经验证了token
      res.status(200).json({ message: '认证有效' });
    } catch (error) {
      res.status(401).json({ message: '认证无效' });
    }
  }

  /**
   * 检查token状态
   */
  async checkTokenStatus(req: Request, res: Response): Promise<void> {
    try {
      // 从请求头获取token
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        res.status(401).json({ message: '未提供认证令牌' });
        return;
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        res.status(401).json({ message: '认证令牌格式不正确' });
        return;
      }

      // 检查是否需要刷新
      const needsRefresh = shouldRefreshToken(token);
      const remainingTime = getTokenRemainingTime(token);

      // 确保返回的数据格式正确
      const responseData = {
        needsRefresh: Boolean(needsRefresh),
        remainingTime: Number(remainingTime),
        user: req.user
      };

      console.log('🔍 Token状态检查响应:', responseData);

      res.status(200).json(responseData);
    } catch (error) {
      console.error('检查token状态时发生错误:', error);
      res.status(500).json({ message: '检查token状态时发生错误' });
    }
  }

  /**
   * 刷新token
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      // 从请求中获取用户ID
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: '无效的用户信息' });
        return;
      }

      // 刷新token
      const refreshResponse = await this.authService.refreshToken(userId);
      res.status(200).json(refreshResponse);
    } catch (error) {
      if (error instanceof Error) {
        res.status(401).json({ message: error.message });
      } else {
        res.status(500).json({ message: '刷新token时发生错误' });
      }
    }
  }
}
