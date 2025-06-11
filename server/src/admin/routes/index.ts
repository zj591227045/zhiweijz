import { Router } from 'express';
import authAdminRoutes from './auth.admin.routes';
import dashboardAdminRoutes from './dashboard.admin.routes';
import userAdminRoutes from './user.admin.routes';

const router = Router();

// 注册管理员路由
router.use('/auth', authAdminRoutes);
router.use('/dashboard', dashboardAdminRoutes);
router.use('/users', userAdminRoutes);

export default router; 