import { Router } from 'express';
import { SecurityController } from '../controllers/security.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const securityController = new SecurityController();

// 所有路由都需要认证
router.use(authenticate);

// 获取用户安全设置
router.get('/me/security', (req, res) => securityController.getUserSecurity(req, res));

// 修改密码
router.put('/me/password', (req, res) => securityController.changePassword(req, res));

// 发送邮箱验证码
router.post('/me/email/verification-code', (req, res) => securityController.sendEmailVerificationCode(req, res));

// 修改邮箱
router.put('/me/email', (req, res) => securityController.changeEmail(req, res));

// 获取登录会话列表
router.get('/me/sessions', (req, res) => securityController.getUserSessions(req, res));

// 登出指定会话
router.delete('/me/sessions/:sessionId', (req, res) => securityController.logoutSession(req, res));

// 获取安全日志
router.get('/me/security-logs', (req, res) => securityController.getSecurityLogs(req, res));

export default router;
