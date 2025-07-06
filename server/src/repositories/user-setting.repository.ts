import { PrismaClient, UserSetting } from '@prisma/client';
import { CreateUserSettingDto, UpdateUserSettingDto } from '../models/user-setting.model';

const prisma = new PrismaClient();

export class UserSettingRepository {
  /**
   * 创建用户设置
   */
  async create(userId: string, settingData: CreateUserSettingDto): Promise<UserSetting> {
    return prisma.userSetting.upsert({
      where: {
        userId_key: {
          userId,
          key: settingData.key,
        },
      },
      update: {
        value: settingData.value,
      },
      create: {
        userId,
        key: settingData.key,
        value: settingData.value,
      },
    });
  }

  /**
   * 批量创建或更新用户设置
   */
  async batchUpsert(userId: string, settings: CreateUserSettingDto[]): Promise<number> {
    const operations = settings.map((setting) =>
      prisma.userSetting.upsert({
        where: {
          userId_key: {
            userId,
            key: setting.key,
          },
        },
        update: {
          value: setting.value,
        },
        create: {
          userId,
          key: setting.key,
          value: setting.value,
        },
      }),
    );

    const results = await Promise.all(operations);
    return results.length;
  }

  /**
   * 根据用户ID和键查找设置
   */
  async findByUserIdAndKey(userId: string, key: string): Promise<UserSetting | null> {
    return prisma.userSetting.findUnique({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    });
  }

  /**
   * 根据用户ID查找所有设置
   */
  async findAllByUserId(userId: string): Promise<UserSetting[]> {
    return prisma.userSetting.findMany({
      where: {
        userId,
      },
      orderBy: {
        key: 'asc',
      },
    });
  }

  /**
   * 更新用户设置
   */
  async update(
    userId: string,
    key: string,
    settingData: UpdateUserSettingDto,
  ): Promise<UserSetting> {
    return prisma.userSetting.update({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
      data: {
        value: settingData.value,
      },
    });
  }

  /**
   * 删除用户设置
   */
  async delete(userId: string, key: string): Promise<UserSetting> {
    return prisma.userSetting.delete({
      where: {
        userId_key: {
          userId,
          key,
        },
      },
    });
  }

  /**
   * 删除用户的所有设置
   */
  async deleteAllByUserId(userId: string): Promise<number> {
    const result = await prisma.userSetting.deleteMany({
      where: {
        userId,
      },
    });

    return result.count;
  }
}
