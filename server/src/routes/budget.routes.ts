import { Router } from 'express';
import { BudgetController } from '../controllers/budget.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const budgetController = new BudgetController();

// 所有路由都需要认证
router.use(authenticate);

// 获取当前活跃的预算
router.get('/active', (req, res) => budgetController.getActiveBudgets(req, res));

// 获取预算列表
router.get('/', (req, res) => budgetController.getBudgets(req, res));

// 创建预算
router.post('/', (req, res) => budgetController.createBudget(req, res));

// 获取单个预算
router.get('/:id', (req, res) => budgetController.getBudget(req, res));

// 更新预算
router.put('/:id', (req, res) => budgetController.updateBudget(req, res));

// 删除预算
router.delete('/:id', (req, res) => budgetController.deleteBudget(req, res));

// 获取预算分类预算
router.get('/:id/categories', (req, res) => budgetController.getBudgetCategories(req, res));

// 获取预算趋势
router.get('/:id/trends', (req, res) => budgetController.getBudgetTrends(req, res));

// 获取预算结转历史（兼容旧版本）
router.get('/:id/rollover-history', (req, res) => budgetController.getRolloverHistory(req, res));

// 获取用户级别的预算结转历史
router.get('/rollover-history/user', (req, res) => budgetController.getUserRolloverHistory(req, res));

// 处理预算结转
router.post('/:id/rollover', (req, res) => budgetController.processBudgetRollover(req, res));

// 重新计算预算结转
router.post('/:id/recalculate-rollover', (req, res) => budgetController.recalculateBudgetRollover(req, res));

// 获取预算相关交易
router.get('/:id/transactions', (req, res) => budgetController.getBudgetTransactions(req, res));

// 获取家庭预算汇总
router.get('/:id/family-summary', (req, res) => budgetController.getFamilyBudgetSummary(req, res));

export default router;
