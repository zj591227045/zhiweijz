import jwt from 'jsonwebtoken';
import config from '../config/config';

/**
 * 生成JWT令牌
 * @param payload 令牌载荷
 * @returns JWT令牌
 */
export function generateToken(payload: any): string {
  const options: any = {
    expiresIn: config.jwt.expiresIn,
  };
  return jwt.sign(payload, config.jwt.secret, options);
}

/**
 * 验证JWT令牌
 * @param token JWT令牌
 * @returns 解码后的载荷
 */
export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new Error('无效的令牌');
  }
}

/**
 * 解码JWT令牌（不验证签名）
 * @param token JWT令牌
 * @returns 解码后的载荷
 */
export function decodeToken(token: string): any {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
}

/**
 * 检查token是否需要刷新
 * @param token JWT令牌
 * @returns 是否需要刷新
 */
export function shouldRefreshToken(token: string): boolean {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true; // 无效token，需要刷新
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresAt = decoded.exp;

    // 计算刷新阈值（默认2小时）
    const refreshThresholdSeconds = parseRefreshThreshold(config.jwt.refreshThreshold || '2h');

    // 如果距离过期时间小于阈值，则需要刷新
    return (expiresAt - now) < refreshThresholdSeconds;
  } catch (error) {
    return true; // 解析失败，需要刷新
  }
}

/**
 * 解析刷新阈值配置
 * @param threshold 阈值配置（如 '2h', '30m', '3600'）
 * @returns 秒数
 */
function parseRefreshThreshold(threshold: string | number): number {
  if (typeof threshold === 'number') {
    return threshold;
  }

  const str = threshold.toString();

  // 匹配时间格式：数字 + 单位
  const match = str.match(/^(\d+)([smhd]?)$/);
  if (!match) {
    return 7200; // 默认2小时
  }

  const value = parseInt(match[1], 10);
  const unit = match[2] || 's';

  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 3600;
    case 'd': return value * 86400;
    default: return value;
  }
}

/**
 * 获取token剩余有效时间（秒）
 * @param token JWT令牌
 * @returns 剩余秒数，-1表示已过期或无效
 */
export function getTokenRemainingTime(token: string): number {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return -1;
    }

    const now = Math.floor(Date.now() / 1000);
    const remaining = decoded.exp - now;

    return remaining > 0 ? remaining : -1;
  } catch (error) {
    return -1;
  }
}
