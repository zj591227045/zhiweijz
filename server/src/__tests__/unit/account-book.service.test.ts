import { AccountBookService } from '../../services/account-book.service';
import { AccountBookRepository } from '../../repositories/account-book.repository';
import { AccountLLMSettingRepository } from '../../repositories/account-llm-setting.repository';
import { CreateAccountBookDto, UpdateAccountBookDto } from '../../models/account-book.model';
import { CreateAccountLLMSettingDto } from '../../models/account-llm-setting.model';

// 模拟依赖
jest.mock('../../repositories/account-book.repository');
jest.mock('../../repositories/account-llm-setting.repository');

describe('AccountBookService', () => {
  let accountBookService: AccountBookService;
  let mockAccountBookRepository: jest.Mocked<AccountBookRepository>;
  let mockAccountLLMSettingRepository: jest.Mocked<AccountLLMSettingRepository>;

  const mockUserId = 'user-123';
  const mockAccountBookId = 'account-book-123';
  const mockAccountBook = {
    id: mockAccountBookId,
    name: '测试账本',
    description: '测试描述',
    userId: mockUserId,
    isDefault: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const mockAccountLLMSetting = {
    id: 'setting-123',
    accountBookId: mockAccountBookId,
    provider: 'openai',
    model: 'gpt-3.5-turbo',
    apiKey: null,
    temperature: 0.3,
    maxTokens: 1000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();

    // 初始化模拟实例
    mockAccountBookRepository = new AccountBookRepository() as jest.Mocked<AccountBookRepository>;
    mockAccountLLMSettingRepository = new AccountLLMSettingRepository() as jest.Mocked<AccountLLMSettingRepository>;

    // 设置模拟方法
    mockAccountBookRepository.create.mockResolvedValue(mockAccountBook);
    mockAccountBookRepository.findById.mockResolvedValue(mockAccountBook);
    mockAccountBookRepository.findAllByUserId.mockResolvedValue({
      accountBooks: [mockAccountBook],
      total: 1,
    });
    mockAccountBookRepository.findDefaultByUserId.mockResolvedValue(mockAccountBook);
    mockAccountBookRepository.update.mockResolvedValue(mockAccountBook);
    mockAccountBookRepository.delete.mockResolvedValue();
    mockAccountBookRepository.getAccountBookStats.mockResolvedValue({
      transactionCount: 10,
      categoryCount: 5,
      budgetCount: 3,
    });

    mockAccountLLMSettingRepository.findByAccountBookId.mockResolvedValue(mockAccountLLMSetting);
    mockAccountLLMSettingRepository.upsert.mockResolvedValue(mockAccountLLMSetting);

    // 初始化服务
    accountBookService = new AccountBookService();
    (accountBookService as any).accountBookRepository = mockAccountBookRepository;
    (accountBookService as any).accountLLMSettingRepository = mockAccountLLMSettingRepository;
  });

  describe('createAccountBook', () => {
    it('应该创建账本并返回带有统计信息的响应', async () => {
      const createDto: CreateAccountBookDto = {
        name: '测试账本',
        description: '测试描述',
      };

      const result = await accountBookService.createAccountBook(mockUserId, createDto);

      expect(mockAccountBookRepository.create).toHaveBeenCalledWith(mockUserId, createDto);
      expect(mockAccountBookRepository.getAccountBookStats).toHaveBeenCalledWith(mockAccountBookId);
      expect(result).toEqual({
        id: mockAccountBookId,
        name: '测试账本',
        description: '测试描述',
        userId: mockUserId,
        isDefault: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        transactionCount: 10,
        categoryCount: 5,
        budgetCount: 3,
      });
    });
  });

  describe('getAccountBooks', () => {
    it('应该返回带有统计信息的账本列表', async () => {
      const result = await accountBookService.getAccountBooks(mockUserId, {});

      expect(mockAccountBookRepository.findAllByUserId).toHaveBeenCalledWith(mockUserId, {});
      expect(mockAccountBookRepository.getAccountBookStats).toHaveBeenCalledWith(mockAccountBookId);
      expect(result).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        data: [
          {
            id: mockAccountBookId,
            name: '测试账本',
            description: '测试描述',
            userId: mockUserId,
            isDefault: false,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            transactionCount: 10,
            categoryCount: 5,
            budgetCount: 3,
          },
        ],
      });
    });
  });

  describe('getAccountBookById', () => {
    it('应该返回带有统计信息的单个账本', async () => {
      const result = await accountBookService.getAccountBookById(mockAccountBookId, mockUserId);

      expect(mockAccountBookRepository.findById).toHaveBeenCalledWith(mockAccountBookId);
      expect(mockAccountBookRepository.getAccountBookStats).toHaveBeenCalledWith(mockAccountBookId);
      expect(result).toEqual({
        id: mockAccountBookId,
        name: '测试账本',
        description: '测试描述',
        userId: mockUserId,
        isDefault: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        transactionCount: 10,
        categoryCount: 5,
        budgetCount: 3,
      });
    });

    it('当账本不存在时应该抛出错误', async () => {
      mockAccountBookRepository.findById.mockResolvedValueOnce(null);

      await expect(accountBookService.getAccountBookById(mockAccountBookId, mockUserId)).rejects.toThrow('账本不存在');
    });

    it('当用户无权访问账本时应该抛出错误', async () => {
      mockAccountBookRepository.findById.mockResolvedValueOnce({
        ...mockAccountBook,
        userId: 'other-user-id',
      });

      await expect(accountBookService.getAccountBookById(mockAccountBookId, mockUserId)).rejects.toThrow('无权访问此账本');
    });
  });

  describe('getDefaultAccountBook', () => {
    it('应该返回带有统计信息的默认账本', async () => {
      const result = await accountBookService.getDefaultAccountBook(mockUserId);

      expect(mockAccountBookRepository.findDefaultByUserId).toHaveBeenCalledWith(mockUserId);
      expect(mockAccountBookRepository.getAccountBookStats).toHaveBeenCalledWith(mockAccountBookId);
      expect(result).toEqual({
        id: mockAccountBookId,
        name: '测试账本',
        description: '测试描述',
        userId: mockUserId,
        isDefault: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        transactionCount: 10,
        categoryCount: 5,
        budgetCount: 3,
      });
    });

    it('当没有默认账本时应该返回null', async () => {
      mockAccountBookRepository.findDefaultByUserId.mockResolvedValueOnce(null);

      const result = await accountBookService.getDefaultAccountBook(mockUserId);
      expect(result).toBeNull();
    });
  });

  describe('updateAccountBook', () => {
    it('应该更新账本并返回带有统计信息的响应', async () => {
      const updateDto: UpdateAccountBookDto = {
        name: '更新的账本名称',
      };

      const result = await accountBookService.updateAccountBook(mockAccountBookId, mockUserId, updateDto);

      expect(mockAccountBookRepository.findById).toHaveBeenCalledWith(mockAccountBookId);
      expect(mockAccountBookRepository.update).toHaveBeenCalledWith(mockAccountBookId, updateDto);
      expect(mockAccountBookRepository.getAccountBookStats).toHaveBeenCalledWith(mockAccountBookId);
      expect(result).toEqual({
        id: mockAccountBookId,
        name: '测试账本',
        description: '测试描述',
        userId: mockUserId,
        isDefault: false,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        transactionCount: 10,
        categoryCount: 5,
        budgetCount: 3,
      });
    });
  });

  describe('deleteAccountBook', () => {
    it('应该删除非默认账本', async () => {
      await accountBookService.deleteAccountBook(mockAccountBookId, mockUserId);

      expect(mockAccountBookRepository.findById).toHaveBeenCalledWith(mockAccountBookId);
      expect(mockAccountBookRepository.delete).toHaveBeenCalledWith(mockAccountBookId);
    });

    it('当尝试删除默认账本时应该抛出错误', async () => {
      mockAccountBookRepository.findById.mockResolvedValueOnce({
        ...mockAccountBook,
        isDefault: true,
      });

      await expect(accountBookService.deleteAccountBook(mockAccountBookId, mockUserId)).rejects.toThrow('不能删除默认账本');
    });
  });

  describe('updateAccountBookLLMSetting', () => {
    it('应该更新账本LLM设置并返回响应', async () => {
      const settingDto: CreateAccountLLMSettingDto = {
        provider: 'openai',
        model: 'gpt-4',
      };

      const result = await accountBookService.updateAccountBookLLMSetting(mockAccountBookId, mockUserId, settingDto);

      expect(mockAccountBookRepository.findById).toHaveBeenCalledWith(mockAccountBookId);
      expect(mockAccountLLMSettingRepository.upsert).toHaveBeenCalledWith(mockAccountBookId, settingDto);
      expect(result).toEqual({
        id: 'setting-123',
        accountBookId: mockAccountBookId,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        apiKey: undefined,
        temperature: 0.3,
        maxTokens: 1000,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
      });
    });
  });
});
