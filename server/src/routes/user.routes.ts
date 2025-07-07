import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { avatarUpload, s3AvatarUpload } from '../middlewares/upload.middleware';

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

// 用户注销相关路由
// 发起注销请求 - 需要认证
router.post('/me/request-deletion', authenticate, (req, res) =>
  userController.requestDeletion(req, res),
);

// 取消注销请求 - 需要认证
router.post('/me/cancel-deletion', authenticate, (req, res) =>
  userController.cancelDeletion(req, res),
);

// 查询注销状态 - 需要认证
router.get('/me/deletion-status', authenticate, (req, res) =>
  userController.getDeletionStatus(req, res),
);

// 验证密码 - 需要认证
router.post('/me/verify-password', authenticate, (req, res) =>
  userController.verifyPassword(req, res),
);

// 上传当前用户的头像 - 需要认证（使用S3存储）
router.post('/me/avatar', authenticate, s3AvatarUpload.single('avatar'), (req, res) =>
  userController.uploadAvatar(req, res),
);

// 更新当前用户的头像ID（预设头像） - 需要认证
router.put('/me/avatar', authenticate, (req, res) => userController.updateAvatarId(req, res));

// 获取单个用户 - 需要认证
router.get('/:id', authenticate, (req, res) => userController.getUser(req, res));

// 更新用户 - 需要认证
router.put('/:id', authenticate, (req, res) => userController.updateUser(req, res));

// 删除用户 - 需要认证
router.delete('/:id', authenticate, (req, res) => userController.deleteUser(req, res));

export default router;
