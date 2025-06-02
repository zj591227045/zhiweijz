import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { CaptchaController } from '../controllers/captcha.controller';

const router = Router();
const authController = new AuthController();
const captchaController = new CaptchaController();

// 用户登录
router.post('/login', (req, res) => authController.login(req, res));

// 用户注册
router.post('/register', (req, res) => authController.register(req, res));

// 忘记密码
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));

// 重置密码
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

// 检查认证状态
router.get('/check', authenticate, (req, res) => authController.checkAuth(req, res));

// 刷新token
router.post('/refresh', authenticate, (req, res) => authController.refreshToken(req, res));

// 验证验证码
router.post('/verify-captcha', (req, res) => captchaController.verifyCaptcha(req, res));

export default router;
