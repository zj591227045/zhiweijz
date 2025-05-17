import { User } from '@prisma/client';

// 用户创建DTO
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
}

// 用户更新DTO
export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  avatar?: string;
  bio?: string;
  birthDate?: Date;
}

// 用户登录DTO
export interface LoginUserDto {
  email: string;
  password: string;
}

// 用户响应DTO（不包含密码）
export interface UserResponseDto {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  bio?: string;
  birthDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// 将用户实体转换为响应DTO
export function toUserResponseDto(user: User): UserResponseDto {
  const { id, email, name, createdAt, updatedAt } = user;
  // 使用类型断言来处理可能不存在的字段
  const userWithExtras = user as User & {
    avatar?: string;
    bio?: string;
    birthDate?: Date;
  };

  return {
    id,
    email,
    name,
    avatar: userWithExtras.avatar,
    bio: userWithExtras.bio,
    birthDate: userWithExtras.birthDate,
    createdAt,
    updatedAt
  };
}

// 用户资料DTO
export interface UserProfileDto {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  birthDate?: Date;
  createdAt: Date;
}

// 更新用户资料DTO
export interface UpdateProfileDto {
  username?: string;
  bio?: string;
  birthDate?: Date;
}
