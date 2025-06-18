import { CategoryService } from '../../src/services/category.service';
import { CategoryRepository } from '../../src/repositories/category.repository';
import { TransactionType } from '@prisma/client';

// 模拟依赖
jest.mock('../../src/repositories/category.repository');

describe('CategoryService', () => {
  let categoryService: CategoryService;
  let mockCategoryRepository: jest.Mocked<CategoryRepository>;

  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();

    // 设置模拟
    mockCategoryRepository = new CategoryRepository() as jest.Mocked<CategoryRepository>;

    // 创建服务实例
    categoryService = new CategoryService();

    // 替换私有属性
    (categoryService as any).categoryRepository = mockCategoryRepository;
  });

  describe('initializeDefaultCategories', () => {
    it('should initialize default categories if they do not exist', async () => {
      // 准备
      mockCategoryRepository.defaultCategoriesExist.mockResolvedValue(false);
      mockCategoryRepository.createMany.mockResolvedValue(19); // 默认分类数量

      // 执行
      const result = await categoryService.initializeDefaultCategories();

      // 验证
      expect(mockCategoryRepository.defaultCategoriesExist).toHaveBeenCalled();
      expect(mockCategoryRepository.createMany).toHaveBeenCalledWith('system', expect.any(Array));
      expect(result).toBe(19);
    });

    it('should not initialize default categories if they already exist', async () => {
      // 准备
      mockCategoryRepository.defaultCategoriesExist.mockResolvedValue(true);

      // 执行
      const result = await categoryService.initializeDefaultCategories();

      // 验证
      expect(mockCategoryRepository.defaultCategoriesExist).toHaveBeenCalled();
      expect(mockCategoryRepository.createMany).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });

  describe('createCategory', () => {
    it('should create a new category', async () => {
      // 准备
      const userId = 'user-id';
      const categoryData = {
        name: 'Test Category',
        type: TransactionType.EXPENSE,
        icon: 'test-icon',
      };
      const category = {
        id: 'category-id',
        ...categoryData,
        userId,
        familyId: null,
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // 模拟行为
      mockCategoryRepository.create.mockResolvedValue(category);

      // 执行
      const result = await categoryService.createCategory(userId, categoryData);

      // 验证
      expect(mockCategoryRepository.create).toHaveBeenCalledWith(userId, categoryData);
      expect(result.name).toBe(categoryData.name);
      expect(result.type).toBe(categoryData.type);
    });
  });

  describe('getCategories', () => {
    it('should get user categories', async () => {
      // 准备
      const userId = 'user-id';
      const type = TransactionType.EXPENSE;
      const categories = [
        {
          id: 'category1-id',
          name: 'Category 1',
          type,
          icon: 'icon1',
          userId,
          familyId: null,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'category2-id',
          name: 'Category 2',
          type,
          icon: 'icon2',
          userId: null,
          familyId: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 模拟行为
      mockCategoryRepository.findByUserId.mockResolvedValue(categories);

      // 执行
      const result = await categoryService.getCategories(userId, type);

      // 验证
      expect(mockCategoryRepository.findByUserId).toHaveBeenCalledWith(userId, type);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Category 1');
      expect(result[1].name).toBe('Category 2');
    });

    it('should get family categories', async () => {
      // 准备
      const userId = 'user-id';
      const familyId = 'family-id';
      const type = TransactionType.EXPENSE;
      const categories = [
        {
          id: 'category1-id',
          name: 'Category 1',
          type,
          icon: 'icon1',
          userId: null,
          familyId,
          isDefault: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'category2-id',
          name: 'Category 2',
          type,
          icon: 'icon2',
          userId: null,
          familyId: null,
          isDefault: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // 模拟行为
      mockCategoryRepository.findByFamilyId.mockResolvedValue(categories);

      // 执行
      const result = await categoryService.getCategories(userId, type, familyId);

      // 验证
      expect(mockCategoryRepository.findByFamilyId).toHaveBeenCalledWith(familyId, type);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Category 1');
      expect(result[1].name).toBe('Category 2');
    });
  });
});
