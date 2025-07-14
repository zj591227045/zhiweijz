import { Router } from 'express';
import { AICallLogAdminController } from '../controllers/ai-call-log.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const aiCallLogController = new AICallLogAdminController();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

/**
 * @route GET /api/admin/ai-call-logs
 * @desc 获取统一的AI调用日志列表
 * @access Admin
 */
router.get('/', (req, res) => aiCallLogController.getAICallLogs(req, res));

/**
 * @route GET /api/admin/ai-call-logs/statistics
 * @desc 获取AI调用统计数据
 * @access Admin
 */
router.get('/statistics', (req, res) => aiCallLogController.getAICallLogStatistics(req, res));

/**
 * @route GET /api/admin/ai-call-logs/:id
 * @desc 获取单个AI调用日志详情
 * @access Admin
 */
router.get('/:id', (req, res) => aiCallLogController.getAICallLogById(req, res));

/**
 * @route GET /api/admin/ai-call-logs/export
 * @desc 导出AI调用日志
 * @access Admin
 */
router.get('/export', (req, res) => aiCallLogController.exportAICallLogs(req, res));

/**
 * @route DELETE /api/admin/ai-call-logs/cleanup
 * @desc 清理过期的AI调用日志
 * @access Admin
 */
router.delete('/cleanup', (req, res) => aiCallLogController.cleanupAICallLogs(req, res));

export default router;
