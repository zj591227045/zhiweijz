/**
 * 初始化用户设置脚本
 * 
 * 此脚本用于为所有现有用户初始化默认设置，包括默认账本ID
 * 
 * 使用方法：
 * npx ts-node server/scripts/initialize-user-settings.ts
 */

import { PrismaClient } from '@prisma/client';
import { UserSettingKey } from '../src/models/user-setting.model';

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('开始初始化用户设置...');

    // 获取所有用户
    const users = await prisma.user.findMany();
    console.log(`找到 ${users.length} 个用户`);

    for (const user of users) {
      console.log(`处理用户: ${user.name} (${user.id})`);

      // 查找用户的默认账本
      const defaultAccountBook = await prisma.accountBook.findFirst({
        where: {
          userId: user.id,
          isDefault: true,
        },
      });

      if (defaultAccountBook) {
        console.log(`找到默认账本: ${defaultAccountBook.name} (${defaultAccountBook.id})`);

        // 检查是否已有默认账本设置
        const existingSetting = await prisma.userSetting.findUnique({
          where: {
            userId_key: {
              userId: user.id,
              key: UserSettingKey.DEFAULT_ACCOUNT_BOOK_ID,
            },
          },
        });

        if (existingSetting) {
          console.log(`用户已有默认账本设置: ${existingSetting.value}`);
        } else {
          // 创建默认账本设置
          await prisma.userSetting.create({
            data: {
              userId: user.id,
              key: UserSettingKey.DEFAULT_ACCOUNT_BOOK_ID,
              value: defaultAccountBook.id,
            },
          });
          console.log(`已为用户创建默认账本设置: ${defaultAccountBook.id}`);
        }
      } else {
        console.log(`用户没有默认账本，跳过设置`);
      }

      // 初始化其他默认设置
      const defaultSettings = [
        { key: UserSettingKey.THEME, value: 'light' },
        { key: UserSettingKey.LANGUAGE, value: 'zh-CN' },
        { key: UserSettingKey.CURRENCY, value: 'CNY' },
        { key: UserSettingKey.NOTIFICATIONS_ENABLED, value: 'true' },
        { key: UserSettingKey.BUDGET_ALERT_THRESHOLD, value: '80' },
        { key: UserSettingKey.DISPLAY_MODE, value: 'list' },
        { key: UserSettingKey.DEFAULT_VIEW, value: 'month' },
        { key: UserSettingKey.DATE_FORMAT, value: 'YYYY-MM-DD' },
        { key: UserSettingKey.TIME_FORMAT, value: 'HH:mm' },
        { key: UserSettingKey.HOME_PAGE, value: 'dashboard' },
      ];

      for (const setting of defaultSettings) {
        // 检查设置是否已存在
        const existingSetting = await prisma.userSetting.findUnique({
          where: {
            userId_key: {
              userId: user.id,
              key: setting.key,
            },
          },
        });

        if (!existingSetting) {
          // 创建设置
          await prisma.userSetting.create({
            data: {
              userId: user.id,
              key: setting.key,
              value: setting.value,
            },
          });
          console.log(`已为用户创建设置: ${setting.key} = ${setting.value}`);
        }
      }

      console.log(`用户 ${user.name} 设置初始化完成`);
      console.log('-----------------------------------');
    }

    console.log('所有用户设置初始化完成');
  } catch (error) {
    console.error('初始化用户设置时发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
