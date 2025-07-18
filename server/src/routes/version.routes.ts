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

// 管理员接口
router.use(authenticateAdmin);
router.use(requireAdmin);

// 版本管理
router.post('/', versionController.createVersion);
router.get('/', versionController.getVersions);
router.get('/stats', versionController.getVersionStats);
router.get('/:id', versionController.getVersionById);
router.put('/:id', versionController.updateVersion);
router.delete('/:id', versionController.deleteVersion);
router.post('/:id/publish', versionController.publishVersion);
router.post('/:id/unpublish', versionController.unpublishVersion);

// 配置管理
router.get('/config/:key', versionController.getVersionConfig);
router.post('/config', versionController.setVersionConfig);

export default router;