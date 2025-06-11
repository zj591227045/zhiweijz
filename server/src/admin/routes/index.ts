import { Router } from 'express';
import authAdminRoutes from './auth.admin.routes';
import dashboardAdminRoutes from './dashboard.admin.routes';

const router = Router();

// 注册管理员路由
router.use('/auth', authAdminRoutes);
router.use('/dashboard', dashboardAdminRoutes);

export default router; 