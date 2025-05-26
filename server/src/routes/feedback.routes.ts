import { Router } from 'express';
import { FeedbackController } from '../controllers/feedback.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const feedbackController = new FeedbackController();

// 所有路由都需要认证
router.use(authenticate);

// 创建反馈
router.post('/', (req, res) => feedbackController.createFeedback(req, res));

// 获取用户的反馈列表
router.get('/my', (req, res) => feedbackController.getUserFeedbacks(req, res));

// 获取所有反馈（管理员用）
router.get('/all', (req, res) => feedbackController.getAllFeedbacks(req, res));

export default router;
