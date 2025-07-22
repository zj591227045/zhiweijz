import { Router } from 'express';
import { versionController } from '../controllers/version.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { authenticateAdmin, requireAdmin } from '../admin/middleware/auth.admin.middleware';

const router = Router();

// 公开接口
router.post('/check', versionController.checkVersion);
router.get('/latest/:platform', versionController.getLatestVersion);

// 用户接口（需要登录）
router.post('/log/update', authenticate, versionController.logUpdate);
router.post('/log/skip', authenticate, versionController.logSkip);

// 用户版本状态管理接口
router.post('/user/status', authenticate, versionController.setUserVersionStatus);
router.get('/user/status/:platform/:appVersionId', authenticate, versionController.getUserVersionStatus);
router.get('/user/statuses', authenticate, versionController.getUserVersionStatuses);

// 管理员接口（每个路由单独应用中间件）
// 版本管理
router.post('/', authenticateAdmin, requireAdmin, versionController.createVersion);
router.get('/', authenticateAdmin, requireAdmin, versionController.getVersions);
router.get('/stats', authenticateAdmin, requireAdmin, versionController.getVersionStats);
router.get('/:id', authenticateAdmin, requireAdmin, versionController.getVersionById);
router.put('/:id', authenticateAdmin, requireAdmin, versionController.updateVersion);
router.delete('/:id', authenticateAdmin, requireAdmin, versionController.deleteVersion);
router.post('/:id/publish', authenticateAdmin, requireAdmin, versionController.publishVersion);
router.post('/:id/unpublish', authenticateAdmin, requireAdmin, versionController.unpublishVersion);

// 配置管理
router.get('/config/:key', authenticateAdmin, requireAdmin, versionController.getVersionConfig);
router.post('/config', authenticateAdmin, requireAdmin, versionController.setVersionConfig);

export default router;