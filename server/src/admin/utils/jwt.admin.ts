import jwt from 'jsonwebtoken';
import config from '../../config/config';

/**
 * 管理员JWT载荷接口
 */
export interface AdminTokenPayload {
  id: string;
  username: string;
  role: string;
}

/**
 * 生成管理员JWT令牌
 * @param payload 令牌载荷
 * @returns JWT令牌
 */
export function generateAdminToken(payload: AdminTokenPayload): string {
  const options: any = {
    expiresIn: config.jwt.adminExpiresIn || '24h', // 管理员token有效期较短
    issuer: 'zhiweijz-admin',
    audience: 'admin',
  };

  return jwt.sign(payload, config.jwt.adminSecret || config.jwt.secret, options);
}

/**
 * 验证管理员JWT令牌
 * @param token JWT令牌
 * @returns 解码后的载荷
 */
export function verifyAdminToken(token: string): AdminTokenPayload {
  try {
    const decoded = jwt.verify(token, config.jwt.adminSecret || config.jwt.secret, {
      issuer: 'zhiweijz-admin',
      audience: 'admin',
    }) as AdminTokenPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('令牌已过期');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('无效的令牌');
    } else {
      throw new Error('令牌验证失败');
    }
  }
}

/**
 * 解码管理员JWT令牌（不验证签名）
 * @param token JWT令牌
 * @returns 解码后的载荷
 */
export function decodeAdminToken(token: string): AdminTokenPayload | null {
  try {
    return jwt.decode(token) as AdminTokenPayload;
  } catch (error) {
    return null;
  }
}
