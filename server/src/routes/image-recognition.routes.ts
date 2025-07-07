import { Router } from 'express';
import { ImageRecognitionController } from '../controllers/image-recognition.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const imageRecognitionController = new ImageRecognitionController();

// 所有路由需要认证
router.use(authenticate);

/**
 * @route POST /api/image-recognition/recognize
 * @desc 识别单个图片
 * @access Private
 */
router.post('/recognize', (req, res) =>
  imageRecognitionController.recognizeImage(req, res),
);

/**
 * @route POST /api/image-recognition/batch-recognize
 * @desc 批量识别图片
 * @access Private
 */
router.post('/batch-recognize', (req, res) =>
  imageRecognitionController.batchRecognizeImages(req, res),
);

/**
 * @route POST /api/image-recognition/validate
 * @desc 验证识别结果
 * @access Private
 */
router.post('/validate', (req, res) =>
  imageRecognitionController.validateRecognition(req, res),
);

/**
 * @route GET /api/image-recognition/stats
 * @desc 获取识别统计信息
 * @access Private
 */
router.get('/stats', (req, res) =>
  imageRecognitionController.getRecognitionStats(req, res),
);

/**
 * @route GET /api/image-recognition/config
 * @desc 获取识别配置
 * @access Private
 */
router.get('/config', (req, res) =>
  imageRecognitionController.getRecognitionConfig(req, res),
);

/**
 * @route PUT /api/image-recognition/config
 * @desc 更新识别配置（管理员功能）
 * @access Admin
 */
router.put('/config', (req, res) =>
  imageRecognitionController.updateRecognitionConfig(req, res),
);

/**
 * @route GET /api/image-recognition/types
 * @desc 获取支持的识别类型
 * @access Private
 */
router.get('/types', (req, res) =>
  imageRecognitionController.getSupportedTypes(req, res),
);

/**
 * @route GET /api/image-recognition/test
 * @desc 测试识别服务连接
 * @access Private
 */
router.get('/test', (req, res) =>
  imageRecognitionController.testRecognitionService(req, res),
);

export default router;
