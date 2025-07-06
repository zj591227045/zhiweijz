import { AccountLLMSetting } from '@prisma/client';
import prisma from '../config/database';
import {
  CreateAccountLLMSettingDto,
  UpdateAccountLLMSettingDto,
} from '../models/account-llm-setting.model';

export class AccountLLMSettingRepository {
  /**
   * 创建或更新账本LLM设置
   */
  async upsert(
    accountBookId: string,
    settingData: CreateAccountLLMSettingDto,
  ): Promise<AccountLLMSetting> {
    // 先查找是否已存在设置
    const existingSetting = await this.findByAccountBookId(accountBookId);

    if (existingSetting) {
      // 如果存在，则更新
      return prisma.accountLLMSetting.update({
        where: { id: existingSetting.id },
        data: {
          provider: settingData.provider,
          model: settingData.model,
          apiKey: settingData.apiKey,
          temperature: settingData.temperature,
          maxTokens: settingData.maxTokens,
        },
      });
    } else {
      // 如果不存在，则创建
      return prisma.accountLLMSetting.create({
        data: {
          accountBookId,
          provider: settingData.provider,
          model: settingData.model,
          apiKey: settingData.apiKey,
          temperature: settingData.temperature ?? 0.3,
          maxTokens: settingData.maxTokens ?? 1000,
        },
      });
    }
  }

  /**
   * 根据账本ID查找LLM设置
   */
  async findByAccountBookId(accountBookId: string): Promise<AccountLLMSetting | null> {
    return prisma.accountLLMSetting.findFirst({
      where: { accountBookId },
    });
  }

  /**
   * 更新账本LLM设置
   */
  async update(id: string, settingData: UpdateAccountLLMSettingDto): Promise<AccountLLMSetting> {
    return prisma.accountLLMSetting.update({
      where: { id },
      data: {
        provider: settingData.provider,
        model: settingData.model,
        apiKey: settingData.apiKey,
        temperature: settingData.temperature,
        maxTokens: settingData.maxTokens,
      },
    });
  }

  /**
   * 删除账本LLM设置
   */
  async delete(id: string): Promise<void> {
    await prisma.accountLLMSetting.delete({
      where: { id },
    });
  }
}
