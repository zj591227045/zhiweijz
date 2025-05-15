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
  createdAt: Date;
  updatedAt: Date;
}

// 将用户实体转换为响应DTO
export function toUserResponseDto(user: User): UserResponseDto {
  const { id, email, name, createdAt, updatedAt } = user;
  return { id, email, name, createdAt, updatedAt };
}
