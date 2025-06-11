import { Router } from 'express';
import { AdminDashboardController } from '../controllers/dashboard.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const dashboardController = new AdminDashboardController();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

// 获取仪表盘概览数据
router.get('/overview', (req, res) => dashboardController.getOverview(req, res));

// 获取用户统计数据
router.get('/users', (req, res) => dashboardController.getUserStats(req, res));

// 获取交易统计数据
router.get('/transactions', (req, res) => dashboardController.getTransactionStats(req, res));

// 获取系统资源使用情况
router.get('/system', (req, res) => dashboardController.getSystemResources(req, res));

// 获取图表数据
router.get('/charts', (req, res) => dashboardController.getChartData(req, res));

export default router; 