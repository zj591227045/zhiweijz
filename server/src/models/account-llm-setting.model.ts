import { AccountLLMSetting } from '@prisma/client';

/**
 * 账本LLM设置创建DTO
 */
export interface CreateAccountLLMSettingDto {
  provider: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 账本LLM设置更新DTO
 */
export interface UpdateAccountLLMSettingDto {
  provider?: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * 账本LLM设置响应DTO
 */
export interface AccountLLMSettingResponseDto {
  id: string;
  accountBookId: string;
  provider: string;
  model: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 将账本LLM设置实体转换为响应DTO
 */
export function toAccountLLMSettingResponseDto(
  setting: AccountLLMSetting,
): AccountLLMSettingResponseDto {
  const {
    id,
    accountBookId,
    provider,
    model,
    apiKey,
    temperature,
    maxTokens,
    createdAt,
    updatedAt,
  } = setting;

  return {
    id,
    accountBookId,
    provider,
    model,
    apiKey: apiKey || undefined,
    temperature,
    maxTokens,
    createdAt,
    updatedAt,
  };
}
