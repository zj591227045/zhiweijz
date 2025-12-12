import { logger } from '../../utils/logger';
import { PrismaClient, admin_role } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * 初始化默认管理员账号
 */
async function initDefaultAdmin() {
  try {
    logger.info('正在初始化默认管理员账号...');

    const defaultUsername = 'admin';
    const defaultPassword = 'zhiweijz2025';
    const defaultEmail = 'admin@zhiweijz.com';

    // 检查是否已存在管理员账号
    const existingAdmin = await prisma.admin.findUnique({
      where: { username: defaultUsername },
    });

    if (existingAdmin) {
      logger.info('默认管理员账号已存在，跳过初始化');
      return;
    }

    // 生成密码哈希
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    // 创建默认管理员账号
    const admin = await prisma.admin.create({
      data: {
        username: defaultUsername,
        passwordHash,
        email: defaultEmail,
        role: admin_role.SUPER_ADMIN,
      },
    });

    logger.info('默认管理员账号创建成功：');
    logger.info(`- 用户名：${admin.username}`);
    logger.info(`- 密码：${defaultPassword}`);
    logger.info(`- 邮箱：${admin.email}`);
    logger.info(`- 角色：${admin.role}`);
    logger.info('');
    logger.info('⚠️  请在生产环境中及时修改默认密码！');
  } catch (error) {
    logger.error('初始化默认管理员账号失败：', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本，则执行初始化
if (require.main === module) {
  initDefaultAdmin()
    .then(() => {
      logger.info('初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('初始化失败：', error);
      process.exit(1);
    });
}

export { initDefaultAdmin };
