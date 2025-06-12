import { Router } from 'express';
import authAdminRoutes from './auth.admin.routes';
import dashboardAdminRoutes from './dashboard.admin.routes';
import userAdminRoutes from './user.admin.routes';
import systemConfigAdminRoutes from './system-config.admin.routes';
import llmLogAdminRoutes from './llm-log.admin.routes';
import announcementAdminRoutes from './announcement.admin.routes';

const router = Router();

// 注册管理员路由
router.use('/auth', authAdminRoutes);
router.use('/dashboard', dashboardAdminRoutes);
router.use('/users', userAdminRoutes);
router.use('/system-configs', systemConfigAdminRoutes);
router.use('/llm-logs', llmLogAdminRoutes);
router.use('/announcements', announcementAdminRoutes);

export default router; 