import { Router } from 'express';
import { UserSettingController } from '../controllers/user-setting.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const userSettingController = new UserSettingController();

// 所有路由都需要认证
router.use(authenticate);

// 获取用户的所有设置
router.get('/', (req, res) => userSettingController.getUserSettings(req, res));

// 获取用户的特定设置
router.get('/:key', (req, res) => userSettingController.getUserSetting(req, res));

// 创建或更新用户设置
router.post('/', (req, res) => userSettingController.createOrUpdateUserSetting(req, res));

// 批量创建或更新用户设置
router.post('/batch', (req, res) => userSettingController.batchCreateOrUpdateUserSettings(req, res));

// 更新用户设置
router.put('/:key', (req, res) => userSettingController.updateUserSetting(req, res));

// 删除用户设置
router.delete('/:key', (req, res) => userSettingController.deleteUserSetting(req, res));

// 初始化用户默认设置
router.post('/initialize', (req, res) => userSettingController.initializeDefaultSettings(req, res));

export default router;
