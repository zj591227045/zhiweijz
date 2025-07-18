import { Router } from 'express';
import { FileStorageController } from '../controllers/file-storage.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { s3FileUpload, s3AvatarUpload, s3AttachmentUpload } from '../middlewares/upload.middleware';

const router = Router();
const fileStorageController = new FileStorageController();

// 所有路由需要认证
router.use(authenticate);

/**
 * @route GET /api/file-storage/status
 * @desc 获取存储服务状态
 * @access Private
 */
router.get('/status', (req, res) =>
  fileStorageController.getStorageStatus(req, res),
);

/**
 * @route POST /api/file-storage/upload
 * @desc 通用文件上传
 * @access Private
 */
router.post('/upload', s3FileUpload.single('file'), (req, res) =>
  fileStorageController.uploadFile(req, res),
);

/**
 * @route POST /api/file-storage/avatar
 * @desc 上传用户头像
 * @access Private
 */
router.post('/avatar', s3AvatarUpload.single('avatar'), (req, res) =>
  fileStorageController.uploadAvatar(req, res),
);

/**
 * @route POST /api/file-storage/attachment
 * @desc 上传交易附件
 * @access Private
 */
router.post('/attachment', s3AttachmentUpload.single('attachment'), (req, res) =>
  fileStorageController.uploadAttachment(req, res),
);

/**
 * @route GET /api/file-storage
 * @desc 获取文件列表
 * @access Private
 */
router.get('/', (req, res) => fileStorageController.getFiles(req, res));

/**
 * @route GET /api/file-storage/:fileId
 * @desc 获取文件信息
 * @access Private
 */
router.get('/:fileId', (req, res) => fileStorageController.getFile(req, res));

/**
 * @route GET /api/file-storage/:fileId/download
 * @desc 下载文件
 * @access Private
 */
router.get('/:fileId/download', (req, res) => fileStorageController.downloadFile(req, res));

/**
 * @route DELETE /api/file-storage/:fileId
 * @desc 删除文件
 * @access Private
 */
router.delete('/:fileId', (req, res) => fileStorageController.deleteFile(req, res));

/**
 * @route POST /api/file-storage/presigned-url
 * @desc 生成预签名URL
 * @access Private
 */
router.post('/presigned-url', (req, res) =>
  fileStorageController.generatePresignedUrl(req, res),
);

/**
 * @route GET /api/file-storage/test/connection
 * @desc 测试存储连接
 * @access Private
 */
router.get('/test/connection', (req, res) =>
  fileStorageController.testConnection(req, res),
);

/**
 * @route POST /api/file-storage/cleanup/expired
 * @desc 清理过期文件
 * @access Private
 */
router.post('/cleanup/expired', (req, res) =>
  fileStorageController.cleanupExpiredFiles(req, res),
);

export default router;
