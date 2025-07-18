import { Router } from 'express';
import { StatisticsController } from '../controllers/statistics.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const statisticsController = new StatisticsController();

// 获取支出统计
router.get('/expenses', authenticate, (req, res) =>
  statisticsController.getExpenseStatistics(req, res),
);

// 获取收入统计
router.get('/income', authenticate, (req, res) =>
  statisticsController.getIncomeStatistics(req, res),
);

// 获取预算执行情况
router.get('/budgets', authenticate, (req, res) =>
  statisticsController.getBudgetStatistics(req, res),
);

// 获取财务概览
router.get('/overview', authenticate, (req, res) =>
  statisticsController.getFinancialOverview(req, res),
);

// 获取按标签统计
router.get('/by-tags', authenticate, (req, res) => statisticsController.getTagStatistics(req, res));

// 检查是否存在无预算记账
router.get('/check-unbudgeted', authenticate, (req, res) =>
  statisticsController.checkUnbudgetedTransactions(req, res)
);

export default router;
