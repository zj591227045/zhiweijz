import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { LoginRequestDto, RegisterRequestDto, ResetPasswordRequestDto, UpdatePasswordRequestDto } from '../models/auth.model';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * 用户登录
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: LoginRequestDto = req.body;
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
      const userData: RegisterRequestDto = req.body;
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
}
