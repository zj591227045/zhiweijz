import jwt from 'jsonwebtoken';

/**
 * 生成测试用的JWT令牌
 */
export function generateTestToken(userId: string): string {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(
    {
      id: userId,
      email: 'test@example.com',
    },
    secret,
    { expiresIn: '1h' }
  );
}

/**
 * 验证JWT令牌
 */
export function verifyTestToken(token: string): any {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.verify(token, secret);
}
