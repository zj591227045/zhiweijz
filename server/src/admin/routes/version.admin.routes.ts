import { Router } from 'express';
import { VersionAdminController } from '../controllers/version.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const versionAdminController = new VersionAdminController();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

// 版本管理路由
router.get('/', (req, res) => versionAdminController.getVersions(req, res));
router.post('/', (req, res) => versionAdminController.createVersion(req, res));
router.get('/stats', (req, res) => versionAdminController.getVersionStats(req, res));
router.get('/:id', (req, res) => versionAdminController.getVersionById(req, res));
router.put('/:id', (req, res) => versionAdminController.updateVersion(req, res));
router.delete('/:id', (req, res) => versionAdminController.deleteVersion(req, res));
router.post('/:id/publish', (req, res) => versionAdminController.publishVersion(req, res));
router.post('/:id/unpublish', (req, res) => versionAdminController.unpublishVersion(req, res));

// 配置管理路由
router.get('/config', (req, res) => versionAdminController.getVersionConfigs(req, res));
router.get('/config/:key', (req, res) => versionAdminController.getVersionConfig(req, res));
router.post('/config', (req, res) => versionAdminController.setVersionConfig(req, res));

// 日志管理路由
router.get('/logs', (req, res) => versionAdminController.getVersionLogs(req, res));
router.get('/logs/stats', (req, res) => versionAdminController.getVersionLogStats(req, res));

export default router;