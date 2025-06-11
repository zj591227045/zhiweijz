import { Router } from 'express';
import { UserAdminController } from '../controllers/user.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const userAdminController = new UserAdminController();

// 所有路由都需要管理员认证
router.use(authenticateAdmin);
router.use(requireAdmin);

// 用户列表
router.get('/', userAdminController.getUsers.bind(userAdminController));

// 获取单个用户详情
router.get('/:id', userAdminController.getUser.bind(userAdminController));

// 创建用户
router.post('/', userAdminController.createUser.bind(userAdminController));

// 更新用户
router.put('/:id', userAdminController.updateUser.bind(userAdminController));

// 删除用户（软删除）
router.delete('/:id', userAdminController.deleteUser.bind(userAdminController));

// 重置用户密码
router.post('/:id/reset-password', userAdminController.resetPassword.bind(userAdminController));

// 切换用户状态
router.patch('/:id/toggle-status', userAdminController.toggleUserStatus.bind(userAdminController));

// 批量操作
router.post('/batch', userAdminController.batchOperation.bind(userAdminController));

// 注册开关相关
router.get('/system/registration-status', userAdminController.getRegistrationStatus.bind(userAdminController));
router.post('/system/toggle-registration', userAdminController.toggleRegistration.bind(userAdminController));

export default router; 