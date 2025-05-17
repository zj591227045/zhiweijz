import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const categoryController = new CategoryController();

// 初始化默认分类（系统管理员使用）
router.post('/initialize', (req, res) => categoryController.initializeDefaultCategories(req, res));

// 以下路由需要认证
router.use(authenticate);

// 获取分类列表
router.get('/', (req, res) => categoryController.getCategories(req, res));

// 创建分类
router.post('/', (req, res) => categoryController.createCategory(req, res));

// 获取单个分类
router.get('/:id', (req, res) => categoryController.getCategory(req, res));

// 更新分类排序（注意：这个路由必须放在 /:id 路由之前，否则会被 /:id 路由匹配）
router.put('/order', (req, res) => categoryController.updateCategoryOrder(req, res));

// 更新分类
router.put('/:id', (req, res) => categoryController.updateCategory(req, res));

// 删除分类
router.delete('/:id', (req, res) => categoryController.deleteCategory(req, res));

export default router;
