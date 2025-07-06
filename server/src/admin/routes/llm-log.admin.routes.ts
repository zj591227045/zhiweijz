import { Router } from 'express';
import { LLMLogAdminController } from '../controllers/llm-log.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const llmLogController = new LLMLogAdminController();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

/**
 * @route GET /api/admin/llm-logs
 * @desc 获取LLM调用日志列表
 * @access Admin
 */
router.get('/', (req, res) => llmLogController.getLLMLogs(req, res));

/**
 * @route GET /api/admin/llm-logs/statistics
 * @desc 获取LLM调用统计数据
 * @access Admin
 */
router.get('/statistics', (req, res) => llmLogController.getLLMLogStatistics(req, res));

/**
 * @route GET /api/admin/llm-logs/export
 * @desc 导出LLM调用日志
 * @access Admin
 */
router.get('/export', (req, res) => llmLogController.exportLLMLogs(req, res));

/**
 * @route GET /api/admin/llm-logs/:id
 * @desc 获取单个LLM调用日志详情
 * @access Admin
 */
router.get('/:id', (req, res) => llmLogController.getLLMLog(req, res));

/**
 * @route DELETE /api/admin/llm-logs/:id
 * @desc 删除LLM调用日志
 * @access Admin
 */
router.delete('/:id', (req, res) => llmLogController.deleteLLMLog(req, res));

/**
 * @route POST /api/admin/llm-logs/batch-delete
 * @desc 批量删除LLM调用日志
 * @access Admin
 */
router.post('/batch-delete', (req, res) => llmLogController.batchDeleteLLMLogs(req, res));

/**
 * @route POST /api/admin/llm-logs/cleanup
 * @desc 清理过期的LLM调用日志
 * @access Admin
 */
router.post('/cleanup', (req, res) => llmLogController.cleanupExpiredLogs(req, res));

export default router;
