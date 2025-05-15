import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';

const router = Router();
const authController = new AuthController();

// 用户登录
router.post('/login', (req, res) => authController.login(req, res));

// 用户注册
router.post('/register', (req, res) => authController.register(req, res));

// 忘记密码
router.post('/forgot-password', (req, res) => authController.forgotPassword(req, res));

// 重置密码
router.post('/reset-password', (req, res) => authController.resetPassword(req, res));

export default router;
