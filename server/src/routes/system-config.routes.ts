import { Router } from 'express';
import { SystemConfigController } from '../controllers/system-config.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const systemConfigController = new SystemConfigController();

// 应用用户认证中间件
router.use(authenticate);

/**
 * @route GET /api/system-config/global-ai
 * @desc 获取全局AI配置（普通用户可访问）
 * @access User
 */
router.get('/global-ai', (req, res) => systemConfigController.getGlobalAIConfig(req, res));

/**
 * @route GET /api/system-config/ai-status
 * @desc 获取AI服务状态
 * @access User
 */
router.get('/ai-status', (req, res) => systemConfigController.getAIServiceStatus(req, res));

/**
 * @route GET /api/system-config/token-usage
 * @desc 获取当前用户TOKEN使用量统计
 * @access User
 */
router.get('/token-usage', (req, res) => systemConfigController.getTokenUsage(req, res));

/**
 * @route GET /api/system-config/token-usage/today
 * @desc 获取今日TOKEN使用量
 * @access User
 */
router.get('/token-usage/today', (req, res) => systemConfigController.getTodayTokenUsage(req, res));

/**
 * @route PUT /api/system-config/global-ai
 * @desc 更新全局AI配置
 * @access User
 */
router.put('/global-ai', (req, res) => systemConfigController.updateGlobalAIConfig(req, res));

/**
 * @route POST /api/system-config/ai-service/switch
 * @desc 切换AI服务类型
 * @access User
 */
router.post('/ai-service/switch', (req, res) => systemConfigController.switchAIServiceType(req, res));

/**
 * @route POST /api/system-config/ai-service/test
 * @desc 测试AI服务连接
 * @access User
 */
router.post('/ai-service/test', (req, res) => systemConfigController.testAIServiceConnection(req, res));

export default router;
