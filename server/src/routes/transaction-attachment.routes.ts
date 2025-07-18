import { Router } from 'express';
import { TransactionAttachmentController } from '../controllers/transaction-attachment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { s3AttachmentUpload } from '../middlewares/upload.middleware';

const router = Router();
const attachmentController = new TransactionAttachmentController();

// 所有路由需要认证
router.use(authenticate);

/**
 * @route POST /api/transactions/:transactionId/attachments
 * @desc 为记账添加附件
 * @access Private
 */
router.post('/:transactionId/attachments', s3AttachmentUpload.single('attachment'), (req, res) =>
  attachmentController.addAttachment(req, res),
);

/**
 * @route POST /api/transactions/:transactionId/attachments/batch
 * @desc 批量上传记账附件
 * @access Private
 */
router.post('/:transactionId/attachments/batch', s3AttachmentUpload.array('attachments', 10), (req, res) =>
  attachmentController.batchUploadAttachments(req, res),
);

/**
 * @route GET /api/transactions/:transactionId/attachments
 * @desc 获取记账的所有附件
 * @access Private
 */
router.get('/:transactionId/attachments', (req, res) =>
  attachmentController.getTransactionAttachments(req, res),
);

/**
 * @route DELETE /api/transactions/attachments/:attachmentId
 * @desc 删除记账附件
 * @access Private
 */
router.delete('/attachments/:attachmentId', (req, res) =>
  attachmentController.deleteAttachment(req, res),
);

/**
 * @route GET /api/transactions/attachments/stats
 * @desc 获取用户的附件统计
 * @access Private
 */
router.get('/attachments/stats', (req, res) =>
  attachmentController.getAttachmentStats(req, res),
);

export default router;
