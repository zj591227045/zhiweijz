import { logger } from '../utils/logger';
import { Request, Response } from 'express';
import { CaptchaService } from '../services/captcha.service';
import { CaptchaVerifyRequest } from '../models/captcha.model';

export class CaptchaController {
  private captchaService: CaptchaService;

  constructor() {
    this.captchaService = new CaptchaService();
  }

  /**
   * 验证验证码
   */
  async verifyCaptcha(req: Request, res: Response): Promise<void> {
    try {
      const { token, action }: CaptchaVerifyRequest = req.body;

      if (!token || !action) {
        res.status(400).json({
          success: false,
          message: '缺少必要参数',
        });
        return;
      }

      if (!['login', 'register'].includes(action)) {
        res.status(400).json({
          success: false,
          message: '无效的操作类型',
        });
        return;
      }

      const result = await this.captchaService.verifySlidingPuzzle(token, action);

      if (result.success) {
        res.status(200).json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      logger.error('验证码验证失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误',
      });
    }
  }

  /**
   * 生成测试验证码（仅开发环境）
   */
  async generateTestCaptcha(req: Request, res: Response): Promise<void> {
    try {
      if (process.env.NODE_ENV === 'production') {
        res.status(403).json({
          success: false,
          message: '生产环境不允许生成测试验证码',
        });
        return;
      }

      const { position = 100, target = 100, duration = 2000 } = req.body;
      const token = this.captchaService.generateTestToken(position, target, duration);

      res.status(200).json({
        success: true,
        token,
        message: '测试验证码生成成功',
      });
    } catch (error) {
      logger.error('生成测试验证码失败:', error);
      res.status(500).json({
        success: false,
        message: '服务器错误',
      });
    }
  }
}
