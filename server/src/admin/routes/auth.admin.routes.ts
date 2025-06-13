import { Router } from 'express';
import { AdminAuthController } from '../controllers/auth.admin.controller';
import { authenticateAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const adminAuthController = new AdminAuthController();

// 管理员登录
router.post('/login', (req, res) => adminAuthController.login(req, res));

// 检查管理员认证状态
router.get('/check', authenticateAdmin, (req, res) => adminAuthController.checkAuth(req, res));

// 管理员修改密码
router.post('/change-password', authenticateAdmin, (req, res) => adminAuthController.changePassword(req, res));

// 管理员登出
router.post('/logout', authenticateAdmin, (req, res) => adminAuthController.logout(req, res));

export default router; 