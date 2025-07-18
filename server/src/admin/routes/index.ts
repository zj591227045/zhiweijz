import { Router } from 'express';
import authAdminRoutes from './auth.admin.routes';
import dashboardAdminRoutes from './dashboard.admin.routes';
import userAdminRoutes from './user.admin.routes';
import systemConfigAdminRoutes from './system-config.admin.routes';
import llmLogAdminRoutes from './llm-log.admin.routes';
import aiCallLogAdminRoutes from './ai-call-log.admin.routes';
import announcementAdminRoutes from './announcement.admin.routes';
import tokenLimitAdminRoutes from './token-limit.admin.routes';
import multiProviderLLMAdminRoutes from './multi-provider-llm.admin.routes';
import storageConfigAdminRoutes from './storage-config.admin.routes';
import multimodalAIAdminRoutes from './multimodal-ai.admin.routes';
import accountingPointsAdminRoutes from './accounting-points.admin.routes';
import membershipAdminRoutes from './membership.admin.routes';
import versionAdminRoutes from './version.admin.routes';

const router = Router();

// 注册管理员路由
router.use('/auth', authAdminRoutes);
router.use('/dashboard', dashboardAdminRoutes);
router.use('/users', userAdminRoutes);
router.use('/system-configs', systemConfigAdminRoutes);
router.use('/llm-logs', llmLogAdminRoutes);
router.use('/ai-call-logs', aiCallLogAdminRoutes);
router.use('/announcements', announcementAdminRoutes);
router.use('/token-limit', tokenLimitAdminRoutes);
router.use('/multi-provider-llm', multiProviderLLMAdminRoutes);
router.use('/storage', storageConfigAdminRoutes);
router.use('/multimodal-ai', multimodalAIAdminRoutes);
router.use('/accounting-points', accountingPointsAdminRoutes);
router.use('/membership', membershipAdminRoutes);
router.use('/version', versionAdminRoutes);

export default router;
