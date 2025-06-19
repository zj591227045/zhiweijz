import { Router } from 'express';
import { TagController } from '../controllers/tag.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const tagController = new TagController();

// 所有路由都需要认证
router.use(authenticate);

// 标签管理路由
router.get('/', (req, res) => tagController.getTags(req, res));
router.post('/', (req, res) => tagController.createTag(req, res));
router.get('/suggestions', (req, res) => tagController.getTagSuggestions(req, res));
router.get('/:tagId', (req, res) => tagController.getTagById(req, res));
router.put('/:tagId', (req, res) => tagController.updateTag(req, res));
router.delete('/:tagId', (req, res) => tagController.deleteTag(req, res));

export default router;
