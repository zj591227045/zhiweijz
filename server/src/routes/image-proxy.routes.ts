import { Router } from 'express';
import { ImageProxyController } from '../controllers/image-proxy.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const imageProxyController = new ImageProxyController();

// 所有路由需要认证
router.use(authenticate);

/**
 * @route GET /api/image-proxy/thumbnail/s3/:bucket/*
 * @desc 获取图片缩略图
 * @access Private
 * @query width - 宽度 (默认: 200)
 * @query height - 高度 (默认: 200) 
 * @query quality - 质量 1-100 (默认: 80)
 * @query format - 输出格式 jpeg/webp (默认: jpeg)
 */
router.get('/thumbnail/s3/:bucket/*', (req, res) =>
  imageProxyController.getThumbnail(req, res),
);

/**
 * @route GET /api/image-proxy/s3/:bucket/*
 * @desc 代理访问S3存储的图片
 * @access Private
 */
router.get('/s3/:bucket/*', (req, res) =>
  imageProxyController.proxyS3Image(req, res),
);

/**
 * @route GET /api/image-proxy/avatar/:userId
 * @desc 代理访问用户头像
 * @access Private
 */
router.get('/avatar/:userId', (req, res) =>
  imageProxyController.proxyUserAvatar(req, res),
);

/**
 * @route GET /api/image-proxy/info/:bucket/*
 * @desc 获取图片信息（不下载内容）
 * @access Private
 */
router.get('/info/:bucket/*', (req, res) =>
  imageProxyController.getImageInfo(req, res),
);

export default router;
