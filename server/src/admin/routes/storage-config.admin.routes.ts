import { Router } from 'express';
import { StorageConfigAdminController } from '../controllers/storage-config.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const storageConfigController = new StorageConfigAdminController();

// 请求日志已移除

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

/**
 * @route GET /api/admin/storage/config
 * @desc 获取存储配置
 * @access Admin
 */
router.get('/config', (req, res) => storageConfigController.getStorageConfig(req, res));

/**
 * @route PUT /api/admin/storage/config
 * @desc 更新存储配置
 * @access Admin
 */
router.put('/config', (req, res) => storageConfigController.updateStorageConfig(req, res));

/**
 * @route POST /api/admin/storage/test
 * @desc 测试存储连接
 * @access Admin
 */
router.post('/test', (req, res) => storageConfigController.testStorageConnection(req, res));

/**
 * @route GET /api/admin/storage/stats
 * @desc 获取存储统计信息
 * @access Admin
 */
router.get('/stats', (req, res) => storageConfigController.getStorageStats(req, res));

/**
 * @route POST /api/admin/storage/reset
 * @desc 重置存储配置为默认值
 * @access Admin
 */
router.post('/reset', (req, res) => storageConfigController.resetStorageConfig(req, res));

/**
 * @route GET /api/admin/storage/templates
 * @desc 获取存储配置模板
 * @access Admin
 */
router.get('/templates', (req, res) => storageConfigController.getStorageConfigTemplate(req, res));

/**
 * @route GET /api/admin/storage/status
 * @desc 获取存储服务状态
 * @access Admin
 */
router.get('/status', (req, res) => storageConfigController.getStorageStatus(req, res));

/**
 * @route GET /api/admin/storage/diagnose
 * @desc 详细诊断存储服务
 * @access Admin
 */
router.get('/diagnose', (req, res) => storageConfigController.diagnoseStorage(req, res));

export default router;
