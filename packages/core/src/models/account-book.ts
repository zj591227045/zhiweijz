/**
 * 账本相关类型
 */
export enum AccountBookType {
  PERSONAL = "PERSONAL",
  FAMILY = "FAMILY",
}

export interface AccountBook {
  id: string;
  name: string;
  description?: string;
  type: AccountBookType;
  familyId?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  userLLMSettingId?: string; // 账本绑定的LLM服务ID
  aiService?: {
    enabled: boolean;
    provider?: string;
    model?: string;
    apiKey?: string;
    customPrompt?: string;
    language?: string;
  };
}

/**
 * 账本创建和更新类型
 */
export interface CreateAccountBookData {
  name: string;
  description?: string;
  type?: AccountBookType;
  familyId?: string;
  isDefault?: boolean;
}

export interface UpdateAccountBookData {
  name?: string;
  description?: string;
  isDefault?: boolean;
  userLLMSettingId?: string;
}
