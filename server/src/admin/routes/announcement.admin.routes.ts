import { Router } from 'express';
import { AnnouncementAdminController } from '../controllers/announcement.admin.controller';
import { authenticateAdmin, requireAdmin } from '../middleware/auth.admin.middleware';

const router = Router();
const announcementAdminController = new AnnouncementAdminController();

// 应用管理员认证中间件
router.use(authenticateAdmin);
router.use(requireAdmin);

// 公告管理路由
router.get('/', announcementAdminController.getAnnouncements.bind(announcementAdminController));
router.get('/stats', announcementAdminController.getAnnouncementStats.bind(announcementAdminController));
router.get('/:id', announcementAdminController.getAnnouncementById.bind(announcementAdminController));
router.get('/:id/stats', announcementAdminController.getAnnouncementReadStats.bind(announcementAdminController));

router.post('/', announcementAdminController.createAnnouncement.bind(announcementAdminController));
router.post('/batch', announcementAdminController.batchOperation.bind(announcementAdminController));
router.post('/:id/publish', announcementAdminController.publishAnnouncement.bind(announcementAdminController));
router.post('/:id/unpublish', announcementAdminController.unpublishAnnouncement.bind(announcementAdminController));
router.post('/:id/archive', announcementAdminController.archiveAnnouncement.bind(announcementAdminController));

router.put('/:id', announcementAdminController.updateAnnouncement.bind(announcementAdminController));

router.delete('/:id', announcementAdminController.deleteAnnouncement.bind(announcementAdminController));

export default router; 