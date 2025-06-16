import { Router } from 'express';
import { MultiProviderLLMAdminController } from '../controllers/multi-provider-llm.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const multiProviderLLMController = new MultiProviderLLMAdminController();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

/**
 * @route GET /api/admin/multi-provider-llm/config
 * @desc 获取多提供商LLM配置
 * @access Admin
 */
router.get('/config', (req, res) => multiProviderLLMController.getMultiProviderConfig(req, res));

/**
 * @route PUT /api/admin/multi-provider-llm/config
 * @desc 更新多提供商LLM配置
 * @access Admin
 */
router.put('/config', (req, res) => multiProviderLLMController.updateMultiProviderConfig(req, res));

/**
 * @route POST /api/admin/multi-provider-llm/providers
 * @desc 添加提供商实例
 * @access Admin
 */
router.post('/providers', (req, res) => multiProviderLLMController.addProviderInstance(req, res));

/**
 * @route PUT /api/admin/multi-provider-llm/providers/:id
 * @desc 更新提供商实例
 * @access Admin
 */
router.put('/providers/:id', (req, res) => multiProviderLLMController.updateProviderInstance(req, res));

/**
 * @route DELETE /api/admin/multi-provider-llm/providers/:id
 * @desc 删除提供商实例
 * @access Admin
 */
router.delete('/providers/:id', (req, res) => multiProviderLLMController.deleteProviderInstance(req, res));

/**
 * @route POST /api/admin/multi-provider-llm/providers/:id/test
 * @desc 测试提供商实例连接
 * @access Admin
 */
router.post('/providers/:id/test', (req, res) => multiProviderLLMController.testProviderInstance(req, res));

/**
 * @route GET /api/admin/multi-provider-llm/health
 * @desc 获取所有提供商健康状态
 * @access Admin
 */
router.get('/health', (req, res) => multiProviderLLMController.getProvidersHealthStatus(req, res));

/**
 * @route POST /api/admin/multi-provider-llm/health/check
 * @desc 手动触发健康检查
 * @access Admin
 */
router.post('/health/check', (req, res) => multiProviderLLMController.triggerHealthCheck(req, res));

/**
 * @route GET /api/admin/multi-provider-llm/templates
 * @desc 获取预定义的提供商模板
 * @access Admin
 */
router.get('/templates', (req, res) => multiProviderLLMController.getProviderTemplates(req, res));

/**
 * @route GET /api/admin/multi-provider-llm/config/priority-info
 * @desc 获取配置优先级信息（多提供商vs全局配置）
 * @access Admin
 */
router.get('/config/priority-info', (req, res) => multiProviderLLMController.getConfigPriorityInfo(req, res));

export default router; 