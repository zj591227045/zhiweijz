import { PrismaClient } from '@prisma/client';
import { CategoryService } from '../services/category.service';

const prisma = new PrismaClient();
const categoryService = new CategoryService();

/**
 * 为所有现有用户创建默认分类配置
 */
async function createUserCategoryConfigs() {
  try {
    console.log('开始为现有用户创建默认分类配置...');

    // 获取所有用户
    const users = await prisma.user.findMany();
    console.log(`找到 ${users.length} 个用户`);

    // 为每个用户创建默认分类配置
    for (const user of users) {
      console.log(`正在为用户 ${user.id} (${user.email}) 创建默认分类配置...`);

      try {
        const count = await categoryService.createUserDefaultCategories(user.id);
        console.log(`成功为用户 ${user.id} 创建了 ${count} 个默认分类配置`);
      } catch (error) {
        console.error(`为用户 ${user.id} 创建默认分类配置失败:`, error);
      }
    }

    console.log('所有用户的默认分类配置创建完成');
  } catch (error) {
    console.error('创建用户默认分类配置失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行脚本
createUserCategoryConfigs();
