import { Router } from 'express';
import { CaptchaController } from '../controllers/captcha.controller';

const router = Router();
const captchaController = new CaptchaController();

// 验证验证码
router.post('/verify', (req, res) => captchaController.verifyCaptcha(req, res));

// 生成测试验证码（仅开发环境）
router.post('/generate-test', (req, res) => captchaController.generateTestCaptcha(req, res));

export default router;
