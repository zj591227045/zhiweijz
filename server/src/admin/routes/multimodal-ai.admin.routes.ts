import { Router } from 'express';
import { MultimodalAIAdminController } from '../controllers/multimodal-ai.admin.controller';
import { authenticateAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const multimodalAIAdminController = new MultimodalAIAdminController();

// 所有路由需要管理员认证
router.use(authenticateAdmin);

/**
 * @route GET /api/admin/multimodal-ai/config
 * @desc 获取多模态AI配置
 * @access Admin
 */
router.get(
  '/config',
  multimodalAIAdminController.getConfig.bind(multimodalAIAdminController)
);

/**
 * @route PUT /api/admin/multimodal-ai/config
 * @desc 批量更新多模态AI配置
 * @access Admin
 */
router.put(
  '/config',
  multimodalAIAdminController.updateConfig.bind(multimodalAIAdminController)
);

/**
 * @route PUT /api/admin/multimodal-ai/speech
 * @desc 更新语音识别配置
 * @access Admin
 */
router.put(
  '/speech',
  multimodalAIAdminController.updateSpeechConfig.bind(multimodalAIAdminController)
);

/**
 * @route PUT /api/admin/multimodal-ai/vision
 * @desc 更新视觉识别配置
 * @access Admin
 */
router.put(
  '/vision',
  multimodalAIAdminController.updateVisionConfig.bind(multimodalAIAdminController)
);

/**
 * @route POST /api/admin/multimodal-ai/speech/test
 * @desc 测试语音识别配置
 * @access Admin
 */
router.post(
  '/speech/test',
  multimodalAIAdminController.testSpeechConfig.bind(multimodalAIAdminController)
);

/**
 * @route POST /api/admin/multimodal-ai/vision/test
 * @desc 测试视觉识别配置
 * @access Admin
 */
router.post(
  '/vision/test',
  multimodalAIAdminController.testVisionConfig.bind(multimodalAIAdminController)
);

/**
 * @route GET /api/admin/multimodal-ai/models
 * @desc 获取支持的模型列表
 * @access Admin
 */
router.get(
  '/models',
  multimodalAIAdminController.getModels.bind(multimodalAIAdminController)
);

/**
 * @route GET /api/admin/multimodal-ai/status
 * @desc 获取配置状态
 * @access Admin
 */
router.get(
  '/status',
  multimodalAIAdminController.getStatus.bind(multimodalAIAdminController)
);

export default router;
