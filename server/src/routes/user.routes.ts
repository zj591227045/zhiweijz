import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { avatarUpload } from '../middlewares/upload.middleware';

const router = Router();
const userController = new UserController();

// 创建用户 - 仅管理员可用，暂时不需要认证
router.post('/', (req, res) => userController.createUser(req, res));

// 获取所有用户 - 需要认证
router.get('/', authenticate, (req, res) => userController.getAllUsers(req, res));

// 获取当前用户的个人资料 - 需要认证
router.get('/me/profile', authenticate, (req, res) => userController.getUserProfile(req, res));

// 更新当前用户的个人资料 - 需要认证
router.put('/me/profile', authenticate, (req, res) => userController.updateUserProfile(req, res));

// 上传当前用户的头像 - 需要认证
router.post('/me/avatar', authenticate, avatarUpload.single('avatar'), (req, res) => userController.uploadAvatar(req, res));

// 获取单个用户 - 需要认证
router.get('/:id', authenticate, (req, res) => userController.getUser(req, res));

// 更新用户 - 需要认证
router.put('/:id', authenticate, (req, res) => userController.updateUser(req, res));

// 删除用户 - 需要认证
router.delete('/:id', authenticate, (req, res) => userController.deleteUser(req, res));

export default router;
