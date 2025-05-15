import { UserSettingRepository } from '../repositories/user-setting.repository';
import { 
  CreateUserSettingDto, 
  UpdateUserSettingDto, 
  BatchUpdateUserSettingsDto,
  UserSettingResponseDto, 
  toUserSettingResponseDto,
  UserSettingKey
} from '../models/user-setting.model';

export class UserSettingService {
  private userSettingRepository: UserSettingRepository;

  constructor() {
    this.userSettingRepository = new UserSettingRepository();
  }

  /**
   * 获取用户的所有设置
   */
  async getUserSettings(userId: string): Promise<UserSettingResponseDto[]> {
    const settings = await this.userSettingRepository.findAllByUserId(userId);
    return settings.map(toUserSettingResponseDto);
  }

  /**
   * 获取用户的特定设置
   */
  async getUserSetting(userId: string, key: string): Promise<UserSettingResponseDto | null> {
    const setting = await this.userSettingRepository.findByUserIdAndKey(userId, key);
    if (!setting) {
      return null;
    }
    return toUserSettingResponseDto(setting);
  }

  /**
   * 创建或更新用户设置
   */
  async createOrUpdateUserSetting(userId: string, settingData: CreateUserSettingDto): Promise<UserSettingResponseDto> {
    // 验证设置键是否有效
    this.validateSettingKey(settingData.key);
    
    const setting = await this.userSettingRepository.create(userId, settingData);
    return toUserSettingResponseDto(setting);
  }

  /**
   * 批量创建或更新用户设置
   */
  async batchCreateOrUpdateUserSettings(userId: string, data: BatchUpdateUserSettingsDto): Promise<number> {
    // 验证所有设置键是否有效
    data.settings.forEach(setting => this.validateSettingKey(setting.key));
    
    return this.userSettingRepository.batchUpsert(userId, data.settings);
  }

  /**
   * 更新用户设置
   */
  async updateUserSetting(userId: string, key: string, settingData: UpdateUserSettingDto): Promise<UserSettingResponseDto> {
    // 验证设置键是否有效
    this.validateSettingKey(key);
    
    // 检查设置是否存在
    const existingSetting = await this.userSettingRepository.findByUserIdAndKey(userId, key);
    if (!existingSetting) {
      throw new Error(`设置 ${key} 不存在`);
    }
    
    const updatedSetting = await this.userSettingRepository.update(userId, key, settingData);
    return toUserSettingResponseDto(updatedSetting);
  }

  /**
   * 删除用户设置
   */
  async deleteUserSetting(userId: string, key: string): Promise<void> {
    // 验证设置键是否有效
    this.validateSettingKey(key);
    
    // 检查设置是否存在
    const existingSetting = await this.userSettingRepository.findByUserIdAndKey(userId, key);
    if (!existingSetting) {
      throw new Error(`设置 ${key} 不存在`);
    }
    
    await this.userSettingRepository.delete(userId, key);
  }

  /**
   * 初始化用户默认设置
   */
  async initializeDefaultSettings(userId: string): Promise<number> {
    const defaultSettings: CreateUserSettingDto[] = [
      { key: UserSettingKey.THEME, value: 'light' },
      { key: UserSettingKey.LANGUAGE, value: 'zh-CN' },
      { key: UserSettingKey.CURRENCY, value: 'CNY' },
      { key: UserSettingKey.NOTIFICATIONS_ENABLED, value: 'true' },
      { key: UserSettingKey.BUDGET_ALERT_THRESHOLD, value: '80' },
      { key: UserSettingKey.DISPLAY_MODE, value: 'list' },
      { key: UserSettingKey.DEFAULT_VIEW, value: 'month' },
      { key: UserSettingKey.DATE_FORMAT, value: 'YYYY-MM-DD' },
      { key: UserSettingKey.TIME_FORMAT, value: 'HH:mm' },
      { key: UserSettingKey.HOME_PAGE, value: 'dashboard' },
    ];
    
    return this.userSettingRepository.batchUpsert(userId, defaultSettings);
  }

  /**
   * 验证设置键是否有效
   */
  private validateSettingKey(key: string): void {
    const validKeys = Object.values(UserSettingKey);
    if (!validKeys.includes(key as UserSettingKey)) {
      throw new Error(`无效的设置键: ${key}`);
    }
  }
}
