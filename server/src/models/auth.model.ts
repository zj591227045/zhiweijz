// 登录请求DTO
export interface LoginRequestDto {
  email: string;
  password: string;
}

// 注册请求DTO
export interface RegisterRequestDto {
  email: string;
  password: string;
  name: string;
}

// 登录响应DTO
export interface LoginResponseDto {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
    bio?: string;
    birthDate?: Date;
    createdAt: Date;
  };
}

// 密码重置请求DTO
export interface ResetPasswordRequestDto {
  email: string;
}

// 密码更新请求DTO
export interface UpdatePasswordRequestDto {
  token: string;
  password: string;
}
