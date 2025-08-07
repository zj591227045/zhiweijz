import { Router } from 'express';
import { AccountingPointsAdminController } from '../controllers/accounting-points.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const accountingPointsAdminController = new AccountingPointsAdminController();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

/**
 * 获取所有用户的记账点统计
 * GET /admin/accounting-points/users
 */
router.get('/users', accountingPointsAdminController.getUsersPointsStats.bind(accountingPointsAdminController));

/**
 * 获取记账点总体统计
 * GET /admin/accounting-points/overall-stats
 */
router.get('/overall-stats', accountingPointsAdminController.getOverallStats.bind(accountingPointsAdminController));

/**
 * 获取用户的记账点记账记录
 * GET /admin/accounting-points/users/:userId/transactions
 */
router.get('/users/:userId/transactions', accountingPointsAdminController.getUserTransactions.bind(accountingPointsAdminController));

/**
 * 管理员手动为用户添加记账点
 * POST /admin/accounting-points/users/:userId/add
 */
router.post('/users/:userId/add', accountingPointsAdminController.addPointsToUser.bind(accountingPointsAdminController));

/**
 * 批量为用户添加记账点
 * POST /admin/accounting-points/batch-add
 */
router.post('/batch-add', accountingPointsAdminController.batchAddPoints.bind(accountingPointsAdminController));

/**
 * 获取记账点配置
 * GET /admin/accounting-points/config
 */
router.get('/config', accountingPointsAdminController.getPointsConfig.bind(accountingPointsAdminController));

/**
 * 更新注册赠送点数配置
 * PUT /admin/accounting-points/config/registration-gift
 */
router.put('/config/registration-gift', accountingPointsAdminController.updateRegistrationGiftPoints.bind(accountingPointsAdminController));

/**
 * 获取每日活跃用户统计
 * GET /admin/accounting-points/daily-active-stats
 */
router.get('/daily-active-stats', accountingPointsAdminController.getDailyActiveStats.bind(accountingPointsAdminController));

/**
 * 获取去重的活跃用户统计
 * GET /admin/accounting-points/unique-active-stats
 */
router.get('/unique-active-stats', accountingPointsAdminController.getUniqueActiveStats.bind(accountingPointsAdminController));

export default router;