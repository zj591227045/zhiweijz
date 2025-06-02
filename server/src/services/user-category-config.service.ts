import { UserCategoryConfigRepository } from '../repositories/user-category-config.repository';
import {
  CreateUserCategoryConfigDto,
  UpdateUserCategoryConfigDto,
  UserCategoryConfigResponseDto,
  toUserCategoryConfigResponseDto
} from '../models/user-category-config.model';

export class UserCategoryConfigService {
  private userCategoryConfigRepository: UserCategoryConfigRepository;

  constructor() {
    this.userCategoryConfigRepository = new UserCategoryConfigRepository();
  }

  /**
   * 创建用户分类配置
   */
  async createUserCategoryConfig(configData: CreateUserCategoryConfigDto): Promise<UserCategoryConfigResponseDto> {
    const config = await this.userCategoryConfigRepository.create(configData);
    return toUserCategoryConfigResponseDto(config);
  }

  /**
   * 批量创建用户分类配置
   */
  async createUserCategoryConfigs(configsData: CreateUserCategoryConfigDto[]): Promise<number> {
    return this.userCategoryConfigRepository.createMany(configsData);
  }

  /**
   * 获取用户分类配置
   */
  async getUserCategoryConfigById(id: string): Promise<UserCategoryConfigResponseDto> {
    const config = await this.userCategoryConfigRepository.findById(id);
    if (!config) {
      throw new Error('用户分类配置不存在');
    }
    return toUserCategoryConfigResponseDto(config);
  }

  /**
   * 获取用户的所有分类配置
   */
  async getUserCategoryConfigs(userId: string): Promise<UserCategoryConfigResponseDto[]> {
    const configs = await this.userCategoryConfigRepository.findByUserId(userId);
    return configs.map(toUserCategoryConfigResponseDto);
  }

  /**
   * 更新用户分类配置
   */
  async updateUserCategoryConfig(
    id: string,
    configData: UpdateUserCategoryConfigDto
  ): Promise<UserCategoryConfigResponseDto> {
    const config = await this.userCategoryConfigRepository.update(id, configData);
    return toUserCategoryConfigResponseDto(config);
  }

  /**
   * 根据用户ID和分类ID更新用户分类配置
   */
  async updateUserCategoryConfigByUserIdAndCategoryId(
    userId: string,
    categoryId: string,
    configData: UpdateUserCategoryConfigDto
  ): Promise<UserCategoryConfigResponseDto> {
    const config = await this.userCategoryConfigRepository.updateByUserIdAndCategoryId(
      userId,
      categoryId,
      configData
    );
    return toUserCategoryConfigResponseDto(config);
  }

  /**
   * 删除用户分类配置
   */
  async deleteUserCategoryConfig(id: string): Promise<void> {
    await this.userCategoryConfigRepository.delete(id);
  }


}
