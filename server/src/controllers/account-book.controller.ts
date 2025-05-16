import { Request, Response } from 'express';
import { AccountBookService } from '../services/account-book.service';
import { 
  AccountBookQueryParams, 
  CreateAccountBookDto, 
  UpdateAccountBookDto 
} from '../models/account-book.model';
import { CreateAccountLLMSettingDto } from '../models/account-llm-setting.model';

export class AccountBookController {
  private accountBookService: AccountBookService;

  constructor() {
    this.accountBookService = new AccountBookService();
  }

  /**
   * 创建账本
   */
  async createAccountBook(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const accountBookData: CreateAccountBookDto = req.body;
      const accountBook = await this.accountBookService.createAccountBook(userId, accountBookData);
      res.status(201).json(accountBook);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '创建账本时发生错误' });
      }
    }
  }

  /**
   * 获取账本列表
   */
  async getAccountBooks(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      // 解析查询参数
      const params: AccountBookQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        sortBy: req.query.sortBy as string | undefined,
        sortOrder: req.query.sortOrder as 'asc' | 'desc' | undefined,
      };
      
      const accountBooks = await this.accountBookService.getAccountBooks(userId, params);
      res.status(200).json(accountBooks);
    } catch (error) {
      res.status(500).json({ message: '获取账本列表时发生错误' });
    }
  }

  /**
   * 获取单个账本
   */
  async getAccountBook(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const accountBookId = req.params.id;
      const accountBook = await this.accountBookService.getAccountBookById(accountBookId, userId);
      res.status(200).json(accountBook);
    } catch (error) {
      if (error instanceof Error) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取账本时发生错误' });
      }
    }
  }

  /**
   * 获取默认账本
   */
  async getDefaultAccountBook(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const accountBook = await this.accountBookService.getDefaultAccountBook(userId);
      if (!accountBook) {
        res.status(404).json({ message: '未找到默认账本' });
        return;
      }
      
      res.status(200).json(accountBook);
    } catch (error) {
      res.status(500).json({ message: '获取默认账本时发生错误' });
    }
  }

  /**
   * 更新账本
   */
  async updateAccountBook(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const accountBookId = req.params.id;
      const accountBookData: UpdateAccountBookDto = req.body;
      
      const accountBook = await this.accountBookService.updateAccountBook(accountBookId, userId, accountBookData);
      res.status(200).json(accountBook);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新账本时发生错误' });
      }
    }
  }

  /**
   * 删除账本
   */
  async deleteAccountBook(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const accountBookId = req.params.id;
      await this.accountBookService.deleteAccountBook(accountBookId, userId);
      res.status(204).end();
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '删除账本时发生错误' });
      }
    }
  }

  /**
   * 设置默认账本
   */
  async setDefaultAccountBook(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const accountBookId = req.params.id;
      const accountBook = await this.accountBookService.setDefaultAccountBook(accountBookId, userId);
      res.status(200).json(accountBook);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '设置默认账本时发生错误' });
      }
    }
  }

  /**
   * 获取账本LLM设置
   */
  async getAccountBookLLMSetting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const accountBookId = req.params.id;
      const setting = await this.accountBookService.getAccountBookLLMSetting(accountBookId, userId);
      
      if (!setting) {
        res.status(404).json({ message: '未找到LLM设置' });
        return;
      }
      
      res.status(200).json(setting);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '获取LLM设置时发生错误' });
      }
    }
  }

  /**
   * 更新账本LLM设置
   */
  async updateAccountBookLLMSetting(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ message: '未授权' });
        return;
      }

      const accountBookId = req.params.id;
      const settingData: CreateAccountLLMSettingDto = req.body;
      
      const setting = await this.accountBookService.updateAccountBookLLMSetting(accountBookId, userId, settingData);
      res.status(200).json(setting);
    } catch (error) {
      if (error instanceof Error) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: '更新LLM设置时发生错误' });
      }
    }
  }
}
