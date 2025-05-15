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
