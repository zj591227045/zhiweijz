import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import userSettingRoutes from './user-setting.routes';
import categoryRoutes from './category.routes';
import transactionRoutes from './transaction.routes';

const router = Router();

// 导入各模块路由
// import budgetRoutes from './budget.routes';
// import familyRoutes from './family.routes';
// import aiRoutes from './ai.routes';

// 注册路由
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/user-settings', userSettingRoutes);
router.use('/categories', categoryRoutes);
router.use('/transactions', transactionRoutes);
// router.use('/budgets', budgetRoutes);
// router.use('/families', familyRoutes);
// router.use('/ai', aiRoutes);

export default router;
