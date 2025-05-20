import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function createTestUser() {
  const prisma = new PrismaClient();

  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: 'test@example.com' }
    });

    if (existingUser) {
      console.log('测试用户已存在:', existingUser.id);
      return;
    }

    // 创建用户
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: hashedPassword,
        name: '测试用户',
      }
    });

    console.log('测试用户已创建:', user.id);

    // 创建默认账本
    const accountBook = await prisma.accountBook.create({
      data: {
        name: '默认账本',
        description: '测试用户的默认账本',
        isDefault: true,
        type: 'PERSONAL',
        userId: user.id
      }
    });

    console.log('默认账本已创建:', accountBook.id);

    // 创建默认分类
    const categories = [
      { name: '餐饮', type: 'EXPENSE', icon: 'utensils', color: '#FF5722', isDefault: true },
      { name: '购物', type: 'EXPENSE', icon: 'shopping-cart', color: '#E91E63', isDefault: true },
      { name: '交通', type: 'EXPENSE', icon: 'car', color: '#2196F3', isDefault: true },
      { name: '娱乐', type: 'EXPENSE', icon: 'film', color: '#9C27B0', isDefault: true },
      { name: '日用', type: 'EXPENSE', icon: 'home', color: '#4CAF50', isDefault: true },
      { name: '其他', type: 'EXPENSE', icon: 'ellipsis-h', color: '#607D8B', isDefault: true },
      { name: '工资', type: 'INCOME', icon: 'money-bill', color: '#4CAF50', isDefault: true },
      { name: '奖金', type: 'INCOME', icon: 'gift', color: '#FF9800', isDefault: true },
      { name: '其他收入', type: 'INCOME', icon: 'plus', color: '#607D8B', isDefault: true },
    ];

    for (const category of categories) {
      await prisma.category.create({
        data: {
          ...category,
          userId: user.id
        }
      });
    }

    console.log('默认分类已创建');

    // 创建LLM设置
    await prisma.userSetting.create({
      data: {
        userId: user.id,
        key: 'llm_settings',
        value: JSON.stringify({
          provider: 'siliconflow',
          model: 'Qwen/Qwen3-32B',
          apiKey: 'sk-limqgsnsbmlwuxltjfmshpkfungijbliynwmmcknjupedyme',
          temperature: 0.3,
          maxTokens: 1000
        })
      }
    });

    console.log('LLM设置已创建');

  } catch (error) {
    console.error('创建测试用户时出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser().catch(console.error);
