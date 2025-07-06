import { Router } from 'express';
import { UserCategoryConfigController } from '../controllers/user-category-config.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const userCategoryConfigController = new UserCategoryConfigController();

// 所有路由需要认证
router.use(authenticate);

// 获取用户的所有分类配置
router.get('/', (req, res) => userCategoryConfigController.getUserCategoryConfigs(req, res));

// 更新用户分类配置
router.put('/:categoryId', (req, res) =>
  userCategoryConfigController.updateUserCategoryConfig(req, res),
);

// 批量更新用户分类配置
router.put('/', (req, res) =>
  userCategoryConfigController.batchUpdateUserCategoryConfigs(req, res),
);

export default router;
