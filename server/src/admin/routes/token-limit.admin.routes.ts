import { Router } from 'express';
import { TokenLimitAdminController } from '../controllers/token-limit.admin.controller';

const router = Router();
const tokenLimitController = new TokenLimitAdminController();

// 全局设置路由
router.get('/global/settings', tokenLimitController.getGlobalSettings.bind(tokenLimitController));
router.put('/global/settings', tokenLimitController.updateGlobalSettings.bind(tokenLimitController));

// 用户限额管理路由
router.get('/users', tokenLimitController.getUserTokenLimits.bind(tokenLimitController));
router.post('/users/set-limit', tokenLimitController.setUserTokenLimit.bind(tokenLimitController));
router.post('/users/batch-set-limits', tokenLimitController.batchSetUserTokenLimits.bind(tokenLimitController));

// 趋势统计路由
router.get('/trends', tokenLimitController.getTokenUsageTrends.bind(tokenLimitController));

export default router; 