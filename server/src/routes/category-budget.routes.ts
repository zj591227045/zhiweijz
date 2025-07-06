import { Router } from 'express';
import { CategoryBudgetController } from '../controllers/category-budget.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const categoryBudgetController = new CategoryBudgetController();

// 所有路由都需要认证
router.use(authenticate);

// 获取分类预算列表
router.get('/', (req, res) => categoryBudgetController.getCategoryBudgets(req, res));

// 创建分类预算
router.post('/', (req, res) => categoryBudgetController.createCategoryBudget(req, res));

// 根据预算ID获取分类预算列表
router.get('/budget/:budgetId', (req, res) =>
  categoryBudgetController.getCategoryBudgetsByBudgetId(req, res),
);

// 获取单个分类预算
router.get('/:id', (req, res) => categoryBudgetController.getCategoryBudget(req, res));

// 更新分类预算
router.put('/:id', (req, res) => categoryBudgetController.updateCategoryBudget(req, res));

// 删除分类预算
router.delete('/:id', (req, res) => categoryBudgetController.deleteCategoryBudget(req, res));

export default router;
