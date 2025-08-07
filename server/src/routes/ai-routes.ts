import { Router } from 'express';
import { AIController } from '../controllers/ai-controller';
import { authenticate } from '../middlewares/auth.middleware';
import multer from 'multer';

const router = Router();
const aiController = new AIController();

// 配置multer用于Android文件上传
const androidUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB限制
  },
  fileFilter: (req, file, cb) => {
    // 只允许图片文件
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

/**
 * @route GET /api/ai/providers
 * @desc 获取可用的AI提供商列表
 * @access Public
 */
router.get('/providers', aiController.getProviders.bind(aiController));

/**
 * @route POST /ai/account/:accountId/smart-accounting
 * @desc 智能记账 - 需要提供账本ID作为URL参数
 * @access Private
 */
router.post(
  '/account/:accountId/smart-accounting',
  authenticate,
  aiController.handleSmartAccounting.bind(aiController),
);

/**
 * @route POST /ai/account/:accountId/smart-accounting/direct
 * @desc 智能记账并直接创建记账记录 - 需要提供账本ID作为URL参数
 * @access Private
 */
router.post(
  '/account/:accountId/smart-accounting/direct',
  authenticate,
  aiController.handleSmartAccountingDirect.bind(aiController),
);

/**
 * @route POST /ai/smart-accounting/direct
 * @desc 智能记账并直接创建记账记录 - 账本ID在请求体中提供，支持家庭成员调用
 * @access Private
 */
router.post(
  '/smart-accounting/direct',
  authenticate,
  aiController.handleSmartAccountingDirectWithBody.bind(aiController),
);

/**
 * @route POST /ai/account/:accountId/smart-accounting/create-selected
 * @desc 创建用户选择的记账记录
 * @access Private
 */
router.post(
  '/account/:accountId/smart-accounting/create-selected',
  authenticate,
  aiController.createSelectedTransactions.bind(aiController),
);



/**
 * @route GET /api/ai/global-llm-config
 * @desc 获取全局LLM配置
 * @access Private
 */
router.get('/global-llm-config', authenticate, aiController.getGlobalLLMConfig.bind(aiController));

/**
 * @route GET /api/ai/llm-settings
 * @desc 获取用户当前LLM设置
 * @access Private
 */
router.get('/llm-settings', authenticate, aiController.getUserLLMSettings.bind(aiController));

/**
 * @route GET /api/ai/llm-settings/list
 * @desc 获取用户所有LLM设置列表
 * @access Private
 */
router.get(
  '/llm-settings/list',
  authenticate,
  aiController.getUserLLMSettingsList.bind(aiController),
);

/**
 * @route POST /api/ai/llm-settings
 * @desc 创建用户LLM设置
 * @access Private
 */
router.post('/llm-settings', authenticate, aiController.createUserLLMSettings.bind(aiController));

/**
 * @route GET /api/ai/llm-settings/:id
 * @desc 获取用户LLM设置详情
 * @access Private
 */
router.get(
  '/llm-settings/:id',
  authenticate,
  aiController.getUserLLMSettingsById.bind(aiController),
);

/**
 * @route GET /api/ai/account/:accountId/llm-settings
 * @desc 获取账本LLM设置
 * @access Private
 */
router.get(
  '/account/:accountId/llm-settings',
  authenticate,
  aiController.getAccountLLMSettings.bind(aiController),
);

/**
 * @route PUT /api/ai/account/:accountId/llm-settings
 * @desc 更新账本LLM设置 - 绑定到用户的LLM设置
 * @access Private
 */
router.put(
  '/account/:accountId/llm-settings',
  authenticate,
  aiController.updateAccountLLMSettings.bind(aiController),
);

/**
 * @route GET /api/ai/account/:accountId/active-service
 * @desc 获取账本当前激活的AI服务详情
 * @access Private
 */
router.get(
  '/account/:accountId/active-service',
  authenticate,
  aiController.getAccountActiveAIService.bind(aiController),
);

/**
 * @route PUT /api/ai/llm-settings/:id
 * @desc 更新用户LLM设置
 * @access Private
 */
router.put(
  '/llm-settings/:id',
  authenticate,
  aiController.updateUserLLMSettingsById.bind(aiController),
);

/**
 * @route DELETE /api/ai/llm-settings/:id
 * @desc 删除用户LLM设置
 * @access Private
 */
router.delete(
  '/llm-settings/:id',
  authenticate,
  aiController.deleteUserLLMSettings.bind(aiController),
);

/**
 * @route POST /api/ai/llm-settings/test
 * @desc 测试LLM连接
 * @access Private
 */
router.post('/llm-settings/test', authenticate, aiController.testLLMConnection.bind(aiController));

/**
 * @route GET /ai/shortcuts/token
 * @desc 获取快捷指令临时上传token
 * @access Private
 */
router.get(
  '/shortcuts/token',
  authenticate,
  aiController.getShortcutsToken.bind(aiController),
);

/**
 * @route POST /ai/shortcuts/check-token
 * @desc 检查快捷指令token有效性
 * @access Public (不需要认证，因为要检查的就是token本身)
 */
router.post(
  '/shortcuts/check-token',
  aiController.checkShortcutsToken.bind(aiController),
);

/**
 * @route POST /ai/shortcuts/image-accounting
 * @desc 快捷指令图片记账（通过图片URL）
 * @access Private
 */
router.post(
  '/shortcuts/image-accounting',
  authenticate,
  aiController.shortcutsImageAccounting.bind(aiController),
);

/**
 * @route POST /ai/android/screenshot-accounting
 * @desc Android MacroDroid截图记账（通过文件上传）
 * @access Public (使用token认证)
 */
router.post(
  '/android/screenshot-accounting',
  androidUpload.single('image'),
  aiController.androidScreenshotAccounting.bind(aiController),
);

export default router;
