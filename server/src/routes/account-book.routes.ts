import { Router } from 'express';
import { AccountBookController } from '../controllers/account-book.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();
const accountBookController = new AccountBookController();

// 所有路由都需要JWT认证
router.use(authenticate);

// 获取账本列表
router.get('/', accountBookController.getAccountBooks.bind(accountBookController));

// 获取默认账本
router.get('/default', accountBookController.getDefaultAccountBook.bind(accountBookController));

// 创建账本
router.post('/', accountBookController.createAccountBook.bind(accountBookController));

// 获取单个账本
router.get('/:id', accountBookController.getAccountBook.bind(accountBookController));

// 更新账本
router.put('/:id', accountBookController.updateAccountBook.bind(accountBookController));

// 删除账本
router.delete('/:id', accountBookController.deleteAccountBook.bind(accountBookController));

// 设置默认账本
router.post('/:id/set-default', accountBookController.setDefaultAccountBook.bind(accountBookController));

// 获取账本LLM设置
router.get('/:id/llm-settings', accountBookController.getAccountBookLLMSetting.bind(accountBookController));

// 更新账本LLM设置
router.put('/:id/llm-settings', accountBookController.updateAccountBookLLMSetting.bind(accountBookController));

export default router;
