import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { announcementController } from '../../controllers/user/announcement.controller';

const router = Router();

// 获取用户公告列表
router.get('/', authenticate, announcementController.getUserAnnouncements);

// 标记公告为已读
router.post('/:id/read', authenticate, announcementController.markAsRead);

// 标记所有公告为已读
router.post('/read-all', authenticate, announcementController.markAllAsRead);

export default router; 