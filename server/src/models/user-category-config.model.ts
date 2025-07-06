import { UserCategoryConfig } from '@prisma/client';

/**
 * 用户分类配置创建DTO
 */
export interface CreateUserCategoryConfigDto {
  userId: string;
  categoryId: string;
  isHidden?: boolean;
  displayOrder?: number;
}

/**
 * 用户分类配置更新DTO
 */
export interface UpdateUserCategoryConfigDto {
  isHidden?: boolean;
  displayOrder?: number;
}

/**
 * 用户分类配置响应DTO
 */
export interface UserCategoryConfigResponseDto {
  id: string;
  userId: string;
  categoryId: string;
  isHidden: boolean;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 将用户分类配置实体转换为响应DTO
 */
export function toUserCategoryConfigResponseDto(
  config: UserCategoryConfig,
): UserCategoryConfigResponseDto {
  return {
    id: config.id,
    userId: config.userId,
    categoryId: config.categoryId,
    isHidden: config.isHidden,
    displayOrder: config.displayOrder,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt,
  };
}
