import {
  CaptchaTokenData,
  CaptchaVerifyRequest,
  CaptchaVerifyResponse,
} from '../models/captcha.model';

export class CaptchaService {
  /**
   * 验证滑动拼图验证码
   */
  async verifySlidingPuzzle(
    token: string,
    action: 'login' | 'register',
  ): Promise<CaptchaVerifyResponse> {
    try {
      // 解码token
      const decodedData = this.decodeToken(token);
      if (!decodedData) {
        return {
          success: false,
          message: '验证码格式无效',
        };
      }

      // 验证时间戳（5分钟内有效）
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5分钟
      if (now - decodedData.timestamp > maxAge) {
        return {
          success: false,
          message: '验证码已过期',
        };
      }

      // 验证位置精度（允许20像素误差，更宽松）
      const tolerance = 20;
      const positionDiff = Math.abs(decodedData.position - decodedData.target);
      if (positionDiff > tolerance) {
        return {
          success: false,
          message: '验证失败，请重试',
        };
      }

      // 验证操作时间（防止机器人，更宽松的时间范围0.3-15秒）
      if (decodedData.duration < 300 || decodedData.duration > 15000) {
        return {
          success: false,
          message: '操作时间异常',
        };
      }

      // 验证成功
      return {
        success: true,
        message: '验证成功',
      };
    } catch (error) {
      console.error('验证码验证失败:', error);
      return {
        success: false,
        message: '验证失败',
      };
    }
  }

  /**
   * 解码验证码token
   */
  private decodeToken(token: string): CaptchaTokenData | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const data = JSON.parse(decoded);

      // 验证数据结构
      if (
        typeof data.timestamp === 'number' &&
        typeof data.position === 'number' &&
        typeof data.target === 'number' &&
        typeof data.duration === 'number'
      ) {
        return data as CaptchaTokenData;
      }

      return null;
    } catch (error) {
      console.error('解码验证码token失败:', error);
      return null;
    }
  }

  /**
   * 生成验证码token（用于测试）
   */
  generateTestToken(position: number, target: number, duration: number): string {
    const data: CaptchaTokenData = {
      timestamp: Date.now(),
      position,
      target,
      duration,
    };

    return Buffer.from(JSON.stringify(data)).toString('base64');
  }
}
