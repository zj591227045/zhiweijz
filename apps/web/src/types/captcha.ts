export interface CaptchaVerifyRequest {
  token: string;
  action: 'login' | 'register';
}

export interface CaptchaVerifyResponse {
  success: boolean;
  message?: string;
}

export interface LoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: number;
  requiresCaptcha: boolean;
}
