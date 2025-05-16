// 脚本：为指定用户生成JWT令牌
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

// 手动设置JWT配置
const JWT_SECRET = 'your-secret-key'; // 这应该与服务器中的配置相同
const JWT_EXPIRES_IN = '7d';

const prisma = new PrismaClient();

// 要生成令牌的用户邮箱
const targetEmail = process.argv[2] || '591227045@qq.com';

// 生成JWT令牌
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

async function main() {
  try {
    console.log(`开始为用户 ${targetEmail} 生成JWT令牌...`);

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: targetEmail },
    });

    if (!user) {
      console.error(`错误: 未找到邮箱为 ${targetEmail} 的用户`);
      return;
    }

    console.log(`找到用户: ID=${user.id}, 名称=${user.name}`);

    // 生成令牌
    const token = generateToken({
      id: user.id,
      email: user.email,
    });

    console.log('\n生成的JWT令牌:');
    console.log(token);

    console.log('\n可以使用以下命令测试API:');
    console.log(`node scripts/test-api-with-token.js "${token}"`);

  } catch (error) {
    console.error('生成令牌过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
