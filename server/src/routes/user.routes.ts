import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const userController = new UserController();

// 创建用户 - 仅管理员可用，暂时不需要认证
router.post('/', (req, res) => userController.createUser(req, res));

// 获取所有用户 - 需要认证
router.get('/', authenticate, (req, res) => userController.getAllUsers(req, res));

// 获取单个用户 - 需要认证
router.get('/:id', authenticate, (req, res) => userController.getUser(req, res));

// 更新用户 - 需要认证
router.put('/:id', authenticate, (req, res) => userController.updateUser(req, res));

// 删除用户 - 需要认证
router.delete('/:id', authenticate, (req, res) => userController.deleteUser(req, res));

export default router;
