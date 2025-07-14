import { Router } from 'express';
import multer from 'multer';
import { MultimodalAIController } from '../controllers/multimodal-ai.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { s3FileUpload } from '../middlewares/upload.middleware';

const router = Router();
const multimodalAIController = new MultimodalAIController();

// 配置multer用于文件上传
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 检查文件类型
    if (file.mimetype.startsWith('audio/') || file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('只支持音频和图片文件'));
    }
  },
});

// 所有路由需要认证
router.use(authenticate);

/**
 * @route POST /api/ai/speech-to-text
 * @desc 语音转文本
 * @access Private
 */
router.post(
  '/speech-to-text',
  upload.single('audio'),
  multimodalAIController.speechToText.bind(multimodalAIController)
);

/**
 * @route POST /api/ai/image-recognition
 * @desc 图片识别
 * @access Private
 */
router.post(
  '/image-recognition',
  s3FileUpload.single('image'),
  multimodalAIController.imageRecognition.bind(multimodalAIController)
);

/**
 * @route POST /api/ai/smart-accounting/speech
 * @desc 智能记账 - 语音识别
 * @access Private
 */
router.post(
  '/smart-accounting/speech',
  upload.single('audio'),
  multimodalAIController.smartAccountingSpeech.bind(multimodalAIController)
);

/**
 * @route POST /api/ai/smart-accounting/vision
 * @desc 智能记账 - 图片识别
 * @access Private
 */
router.post(
  '/smart-accounting/vision',
  s3FileUpload.single('image'),
  multimodalAIController.smartAccountingVision.bind(multimodalAIController)
);

/**
 * @route GET /api/ai/multimodal/status
 * @desc 获取多模态AI配置状态
 * @access Private
 */
router.get(
  '/multimodal/status',
  multimodalAIController.getStatus.bind(multimodalAIController)
);

/**
 * @route POST /api/ai/multimodal/test
 * @desc 测试多模态AI连接
 * @access Private
 */
router.post(
  '/multimodal/test',
  multimodalAIController.testConnection.bind(multimodalAIController)
);

export default router;
