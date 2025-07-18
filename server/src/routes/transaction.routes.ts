import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { TagController } from '../controllers/tag.controller';
import { TransactionAttachmentController } from '../controllers/transaction-attachment.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { s3AttachmentUpload } from '../middlewares/upload.middleware';

const router = Router();
const transactionController = new TransactionController();
const tagController = new TagController();
const attachmentController = new TransactionAttachmentController();

// 所有路由都需要认证
router.use(authenticate);

// 获取记账统计
router.get('/statistics', (req, res) => transactionController.getTransactionStatistics(req, res));

// 获取记账列表和统计信息
router.get('/with-statistics', (req, res) =>
  transactionController.getTransactionsWithStatistics(req, res),
);

// 导出记账记录
router.post('/export', (req, res) => transactionController.exportTransactions(req, res));

// 导入记账记录
router.post('/import', (req, res) => transactionController.importTransactions(req, res));

// 获取分组记账记录
router.get('/grouped', (req, res) => transactionController.getGroupedTransactions(req, res));

// 获取记账记录列表
router.get('/', (req, res) => transactionController.getTransactions(req, res));

// 创建记账记录
router.post('/', (req, res) => transactionController.createTransaction(req, res));

// 获取单个记账记录
router.get('/:id', (req, res) => transactionController.getTransaction(req, res));

// 更新记账记录
router.put('/:id', (req, res) => transactionController.updateTransaction(req, res));

// 删除记账记录
router.delete('/:id', (req, res) => transactionController.deleteTransaction(req, res));

// 记账标签相关路由
// 获取记账记录的标签
router.get('/:transactionId/tags', (req, res) => tagController.getTransactionTags(req, res));

// 为记账记录添加标签
router.post('/:transactionId/tags', (req, res) => tagController.addTransactionTags(req, res));

// 移除记账记录的标签
router.delete('/:transactionId/tags/:tagId', (req, res) =>
  tagController.removeTransactionTag(req, res),
);

// 批量操作记账标签
router.post('/batch/tags', (req, res) => tagController.batchOperateTransactionTags(req, res));

// 记账附件相关路由
// 为记账添加附件
router.post('/:transactionId/attachments', s3AttachmentUpload.single('attachment'), (req, res) =>
  attachmentController.addAttachment(req, res),
);

// 批量上传记账附件
router.post('/:transactionId/attachments/batch', s3AttachmentUpload.array('attachments', 10), (req, res) =>
  attachmentController.batchUploadAttachments(req, res),
);

// 获取记账的所有附件
router.get('/:transactionId/attachments', (req, res) =>
  attachmentController.getTransactionAttachments(req, res),
);

// 关联已上传的文件到记账
router.post('/:transactionId/attachments/link', (req, res) =>
  attachmentController.linkFileToTransaction(req, res),
);

// 删除记账附件
router.delete('/attachments/:attachmentId', (req, res) =>
  attachmentController.deleteAttachment(req, res),
);

// 获取用户的附件统计
router.get('/attachments/stats', (req, res) =>
  attachmentController.getAttachmentStats(req, res),
);

export default router;
