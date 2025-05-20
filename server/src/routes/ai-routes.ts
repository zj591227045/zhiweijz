import { Router } from 'express';
import { AIController } from '../controllers/ai-controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const aiController = new AIController();

/**
 * @route POST /api/ai/account/:accountId/smart-accounting
 * @desc 智能记账 - 需要提供账本ID作为URL参数
 * @access Private
 */
router.post('/account/:accountId/smart-accounting', authenticate, aiController.handleSmartAccounting.bind(aiController));

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
router.get('/llm-settings/list', authenticate, aiController.getUserLLMSettingsList.bind(aiController));

/**
 * @route POST /api/ai/llm-settings
 * @desc 创建用户LLM设置
 * @access Private
 */
router.post('/llm-settings', authenticate, aiController.createUserLLMSettings.bind(aiController));

/**
 * @route GET /api/ai/account/:accountId/llm-settings
 * @desc 获取账本LLM设置
 * @access Private
 */
router.get('/account/:accountId/llm-settings', authenticate, aiController.getAccountLLMSettings.bind(aiController));

/**
 * @route PUT /api/ai/account/:accountId/llm-settings
 * @desc 更新账本LLM设置 - 绑定到用户的LLM设置
 * @access Private
 */
router.put('/account/:accountId/llm-settings', authenticate, aiController.updateAccountLLMSettings.bind(aiController));

export default router;
