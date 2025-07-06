import { Router } from 'express';
import { SystemConfigAdminController } from '../controllers/system-config.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const systemConfigController = new SystemConfigAdminController();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

/**
 * @route GET /api/admin/system-configs
 * @desc 获取系统配置列表
 * @access Admin
 */
router.get('/', (req, res) => systemConfigController.getSystemConfigs(req, res));

/**
 * @route POST /api/admin/system-configs/batch
 * @desc 批量更新系统配置
 * @access Admin
 */
router.post('/batch', (req, res) => systemConfigController.batchUpdateSystemConfigs(req, res));

/**
 * @route GET /api/admin/system-configs/llm/configs
 * @desc 获取LLM相关配置
 * @access Admin
 */
router.get('/llm/configs', (req, res) => systemConfigController.getLLMConfigs(req, res));

/**
 * @route PUT /api/admin/system-configs/llm/configs
 * @desc 更新LLM配置
 * @access Admin
 */
router.put('/llm/configs', (req, res) => systemConfigController.updateLLMConfigs(req, res));

/**
 * @route GET /api/admin/system-configs/global-ai
 * @desc 获取全局AI配置（管理员版本）
 * @access Admin
 */
router.get('/global-ai', (req, res) => systemConfigController.getGlobalAIConfig(req, res));

/**
 * @route PUT /api/admin/system-configs/global-ai
 * @desc 更新全局AI配置（管理员版本）
 * @access Admin
 */
router.put('/global-ai', (req, res) => systemConfigController.updateGlobalAIConfig(req, res));

/**
 * @route POST /api/admin/system-configs/llm/test
 * @desc 测试LLM连接
 * @access Admin
 */
router.post('/llm/test', (req, res) => systemConfigController.testLLMConnection(req, res));

/**
 * @route GET /api/admin/system-configs/registration
 * @desc 获取用户注册状态
 * @access Admin
 */
router.get('/registration', (req, res) => systemConfigController.getRegistrationStatus(req, res));

/**
 * @route PUT /api/admin/system-configs/registration
 * @desc 切换用户注册状态
 * @access Admin
 */
router.put('/registration', (req, res) => systemConfigController.toggleRegistration(req, res));

/**
 * @route POST /api/admin/system-configs
 * @desc 创建系统配置
 * @access Admin
 */
router.post('/', (req, res) => systemConfigController.createSystemConfig(req, res));

/**
 * @route GET /api/admin/system-configs/:id
 * @desc 获取单个系统配置
 * @access Admin
 */
router.get('/:id', (req, res) => systemConfigController.getSystemConfig(req, res));

/**
 * @route PUT /api/admin/system-configs/:id
 * @desc 更新系统配置
 * @access Admin
 */
router.put('/:id', (req, res) => systemConfigController.updateSystemConfig(req, res));

/**
 * @route DELETE /api/admin/system-configs/:id
 * @desc 删除系统配置
 * @access Admin
 */
router.delete('/:id', (req, res) => systemConfigController.deleteSystemConfig(req, res));

export default router;
