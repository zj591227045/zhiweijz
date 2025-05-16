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

export default router;
