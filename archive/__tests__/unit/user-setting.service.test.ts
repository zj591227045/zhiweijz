import { UserSettingService } from '../../../server/src/services/user-setting.service';
import { UserSettingRepository } from '../../../server/src/repositories/user-setting.repository';
import { UserSettingKey } from '../../../server/src/models/user-setting.model';

// 模拟依赖
jest.mock('../../src/repositories/user-setting.repository');

describe('UserSettingService', () => {
  let userSettingService: UserSettingService;
  let mockUserSettingRepository: jest.Mocked<UserSettingRepository>;

  beforeEach(() => {
    // 清除所有模拟
    jest.clearAllMocks();
    
    // 设置模拟
    mockUserSettingRepository = new UserSettingRepository() as jest.Mocked<UserSettingRepository>;
    
    // 创建服务实例
    userSettingService = new UserSettingService();
    
    // 替换私有属性
    (userSettingService as any).userSettingRepository = mockUserSettingRepository;
  });

  describe('getUserSettings', () => {
    it('should return all settings for a user', async () => {
      // 准备
      const userId = 'user-id';
      const settings = [
        {
          id: 'setting1-id',
          userId,
          key: UserSettingKey.THEME,
          value: 'dark',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'setting2-id',
          userId,
          key: UserSettingKey.LANGUAGE,
          value: 'zh-CN',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      // 模拟行为
      mockUserSettingRepository.findAllByUserId.mockResolvedValue(settings);
      
      // 执行
      const result = await userSettingService.getUserSettings(userId);
      
      // 验证
      expect(mockUserSettingRepository.findAllByUserId).toHaveBeenCalledWith(userId);
      expect(result).toHaveLength(2);
      expect(result[0].key).toBe(UserSettingKey.THEME);
      expect(result[1].key).toBe(UserSettingKey.LANGUAGE);
    });
  });

  describe('getUserSetting', () => {
    it('should return a specific setting for a user', async () => {
      // 准备
      const userId = 'user-id';
      const key = UserSettingKey.THEME;
      const setting = {
        id: 'setting-id',
        userId,
        key,
        value: 'dark',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // 模拟行为
      mockUserSettingRepository.findByUserIdAndKey.mockResolvedValue(setting);
      
      // 执行
      const result = await userSettingService.getUserSetting(userId, key);
      
      // 验证
      expect(mockUserSettingRepository.findByUserIdAndKey).toHaveBeenCalledWith(userId, key);
      expect(result).not.toBeNull();
      expect(result?.key).toBe(key);
      expect(result?.value).toBe('dark');
    });

    it('should return null for non-existing setting', async () => {
      // 准备
      const userId = 'user-id';
      const key = UserSettingKey.THEME;
      
      // 模拟行为
      mockUserSettingRepository.findByUserIdAndKey.mockResolvedValue(null);
      
      // 执行
      const result = await userSettingService.getUserSetting(userId, key);
      
      // 验证
      expect(mockUserSettingRepository.findByUserIdAndKey).toHaveBeenCalledWith(userId, key);
      expect(result).toBeNull();
    });
  });

  describe('createOrUpdateUserSetting', () => {
    it('should create or update a setting', async () => {
      // 准备
      const userId = 'user-id';
      const settingData = {
        key: UserSettingKey.THEME,
        value: 'dark',
      };
      const setting = {
        id: 'setting-id',
        userId,
        key: settingData.key,
        value: settingData.value,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // 模拟行为
      mockUserSettingRepository.create.mockResolvedValue(setting);
      
      // 执行
      const result = await userSettingService.createOrUpdateUserSetting(userId, settingData);
      
      // 验证
      expect(mockUserSettingRepository.create).toHaveBeenCalledWith(userId, settingData);
      expect(result.key).toBe(settingData.key);
      expect(result.value).toBe(settingData.value);
    });

    it('should throw error for invalid setting key', async () => {
      // 准备
      const userId = 'user-id';
      const settingData = {
        key: 'invalid-key',
        value: 'some-value',
      };
      
      // 执行和验证
      await expect(userSettingService.createOrUpdateUserSetting(userId, settingData as any)).rejects.toThrow('无效的设置键');
      expect(mockUserSettingRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('initializeDefaultSettings', () => {
    it('should initialize default settings for a user', async () => {
      // 准备
      const userId = 'user-id';
      
      // 模拟行为
      mockUserSettingRepository.batchUpsert.mockResolvedValue(10);
      
      // 执行
      const result = await userSettingService.initializeDefaultSettings(userId);
      
      // 验证
      expect(mockUserSettingRepository.batchUpsert).toHaveBeenCalledWith(userId, expect.any(Array));
      expect(result).toBe(10);
    });
  });
});
