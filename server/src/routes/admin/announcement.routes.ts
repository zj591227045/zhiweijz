import express from 'express';
import { announcementController } from '../../controllers/admin/announcement.controller';
import { authenticate } from '../../middlewares/auth';

const router = express.Router();

// 获取公告列表
router.get('/', authenticate, announcementController.getAnnouncements);

// 获取单个公告详情
router.get('/:id', authenticate, announcementController.getAnnouncementById);

// 创建公告
router.post('/', authenticate, announcementController.createAnnouncement);

// 更新公告
router.put('/:id', authenticate, announcementController.updateAnnouncement);

// 删除公告
router.delete('/:id', authenticate, announcementController.deleteAnnouncement);

// 发布公告
router.post('/:id/publish', authenticate, announcementController.publishAnnouncement);

// 撤回公告
router.post('/:id/unpublish', authenticate, announcementController.unpublishAnnouncement);

// 获取公告统计信息
router.get('/stats/overview', authenticate, announcementController.getAnnouncementStats);

export default router; 