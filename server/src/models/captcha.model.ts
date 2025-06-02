export interface CaptchaVerifyRequest {
  token: string;
  action: 'login' | 'register';
}

export interface CaptchaVerifyResponse {
  success: boolean;
  message?: string;
}

export interface CaptchaTokenData {
  timestamp: number;
  position: number;
  target: number;
  duration: number;
}

export interface LoginAttemptRecord {
  email: string;
  attempts: number;
  lastAttempt: Date;
  requiresCaptcha: boolean;
}
