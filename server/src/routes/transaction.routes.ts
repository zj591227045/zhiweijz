import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const transactionController = new TransactionController();

// 所有路由都需要认证
router.use(authenticate);

// 获取交易统计
router.get('/statistics', (req, res) => transactionController.getTransactionStatistics(req, res));

// 获取交易列表和统计信息
router.get('/with-statistics', (req, res) => transactionController.getTransactionsWithStatistics(req, res));

// 导出交易记录
router.post('/export', (req, res) => transactionController.exportTransactions(req, res));

// 导入交易记录
router.post('/import', (req, res) => transactionController.importTransactions(req, res));

// 获取交易记录列表
router.get('/', (req, res) => transactionController.getTransactions(req, res));

// 创建交易记录
router.post('/', (req, res) => transactionController.createTransaction(req, res));

// 获取单个交易记录
router.get('/:id', (req, res) => transactionController.getTransaction(req, res));

// 更新交易记录
router.put('/:id', (req, res) => transactionController.updateTransaction(req, res));

// 删除交易记录
router.delete('/:id', (req, res) => transactionController.deleteTransaction(req, res));

export default router;
