import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import userSettingRoutes from './user-setting.routes';
import categoryRoutes from './category.routes';
import userCategoryConfigRoutes from './user-category-config.routes';
import transactionRoutes from './transaction.routes';
import budgetRoutes from './budget.routes';
import categoryBudgetRoutes from './category-budget.routes';
import accountBookRoutes from './account-book.routes';
import familyRoutes from './family.routes';
import statisticsRoutes from './statistics.routes';
import securityRoutes from './security.routes';

const router = Router();

// 导入各模块路由
// import aiRoutes from './ai.routes';

// 注册路由
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/user-settings', userSettingRoutes);
router.use('/categories', categoryRoutes);
router.use('/user-category-configs', userCategoryConfigRoutes);
router.use('/transactions', transactionRoutes);
router.use('/budgets', budgetRoutes);
router.use('/category-budgets', categoryBudgetRoutes);
router.use('/account-books', accountBookRoutes);
router.use('/families', familyRoutes);
router.use('/statistics', statisticsRoutes);
router.use('/security', securityRoutes);
// router.use('/ai', aiRoutes);

export default router;
