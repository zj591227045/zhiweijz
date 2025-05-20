# 多LLM提供商支持文档

## 1. 概述

"只为记账"应用支持多种LLM提供商，允许用户根据自己的需求选择不同的LLM服务。本文档详细介绍了多LLM提供商支持的实现方式和使用方法。

## 2. 支持的LLM提供商

### 2.1 硅基流动 (SiliconFlow)

- **默认提供商**
- **基础URL**: https://api.siliconflow.cn/v1
- **支持的模型**:
  - Qwen/Qwen3-32B (推荐)
  - Qwen/Qwen2.5-32B-Instruct
  - Qwen/Qwen3-14B
  - Qwen/Qwen3-30B-A3B

### 2.2 OpenAI

- **基础URL**: https://api.openai.com/v1
- **支持的模型**:
  - gpt-4
  - gpt-4-turbo
  - gpt-3.5-turbo

### 2.3 自定义提供商

- 用户可以配置自定义的OpenAI兼容API提供商
- 需要提供基础URL和API密钥

## 3. LLM提供商服务架构

### 3.1 核心接口

```typescript
interface LLMSettings {
  provider: string;
  model: string;
  apiKey: string;
  temperature: number;
  maxTokens: number;
  baseUrl?: string;
}

interface LLMProvider {
  generateText(prompt: string, options?: any): Promise<string>;
}
```

### 3.2 提供商注册

```typescript
private registerProviders() {
  // 注册OpenAI提供商
  this.providers.set('openai', new OpenAIProvider());
  
  // 注册硅基流动提供商
  this.providers.set('siliconflow', new SiliconFlowProvider());
}
```

### 3.3 提供商工厂

```typescript
private getProvider(providerName: string): LLMProvider {
  const provider = this.providers.get(providerName.toLowerCase());
  if (!provider) {
    console.warn(`未找到提供商 ${providerName}，使用默认提供商`);
    return this.providers.get('siliconflow')!;
  }
  return provider;
}
```

## 4. 数据模型

### 4.1 UserLLMSetting 模型

```prisma
model UserLLMSetting {
  id          String        @id @default(uuid())
  userId      String        @map("user_id")
  provider    String        @default("openai")
  model       String        @default("gpt-3.5-turbo")
  apiKey      String?       @map("api_key")
  temperature Float         @default(0.3)
  maxTokens   Int           @default(1000) @map("max_tokens")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  name        String        @default("默认LLM设置")
  description String?
  baseUrl     String?       @map("base_url")
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  accountBooks AccountBook[]

  @@map("user_llm_settings")
}
```

### 4.2 AccountBook 模型扩展

```prisma
model AccountBook {
  // 其他字段...
  userLLMSettingId String?           @map("user_llm_setting_id")
  userLLMSetting   UserLLMSetting?   @relation(fields: [userLLMSettingId], references: [id])
  // 其他关系...
}
```

## 5. LLM设置管理

### 5.1 获取LLM设置

```typescript
public async getLLMSettings(
  userId: string,
  accountId?: string
): Promise<LLMSettings> {
  try {
    // 如果提供了账本信息，优先使用账本绑定的UserLLMSetting
    if (accountId) {
      try {
        // 查找账本
        const accountBook = await this.prisma.accountBook.findUnique({
          where: { id: accountId }
        });
        
        // 如果账本存在
        if (accountBook) {
          // 查找关联的UserLLMSetting
          // 由于Prisma客户端可能还没有更新，我们使用原始查询
          const userLLMSettings = await this.prisma.$queryRaw`
            SELECT u.* FROM "user_llm_settings" u
            JOIN "account_books" a ON a."user_llm_setting_id" = u.id
            WHERE a.id = ${accountId}
          `;
          
          // 使用第一个找到的设置
          const userLLMSetting = Array.isArray(userLLMSettings) && userLLMSettings.length > 0 ? userLLMSettings[0] : null;
          
          if (userLLMSetting) {
            console.log(`账本 ${accountId} 使用绑定的LLM设置: ${userLLMSetting.id}`);
            return {
              provider: userLLMSetting.provider || this.defaultSettings.provider,
              model: userLLMSetting.model || this.defaultSettings.model,
              apiKey: userLLMSetting.api_key || process.env[`${(userLLMSetting.provider || this.defaultSettings.provider).toUpperCase()}_API_KEY`] || '',
              temperature: userLLMSetting.temperature || this.defaultSettings.temperature,
              maxTokens: userLLMSetting.max_tokens || this.defaultSettings.maxTokens,
              baseUrl: userLLMSetting.base_url
            };
          }
        }
      } catch (error) {
        console.error('获取账本LLM设置错误:', error);
      }
    }

    // 如果没有账本设置或未提供账本信息，使用用户的默认LLM设置
    try {
      // 查找用户的默认LLM设置
      const userLLMSettings = await this.prisma.$queryRaw`
        SELECT * FROM "user_llm_settings"
        WHERE "user_id" = ${userId}
        LIMIT 1
      `;
      
      const userLLMSetting = Array.isArray(userLLMSettings) && userLLMSettings.length > 0 ? userLLMSettings[0] : null;
      
      if (userLLMSetting) {
        console.log(`用户 ${userId} 使用UserLLMSetting: ${userLLMSetting.id}`);
        return {
          provider: userLLMSetting.provider || this.defaultSettings.provider,
          model: userLLMSetting.model || this.defaultSettings.model,
          apiKey: userLLMSetting.api_key || process.env[`${(userLLMSetting.provider || this.defaultSettings.provider).toUpperCase()}_API_KEY`] || '',
          temperature: userLLMSetting.temperature || this.defaultSettings.temperature,
          maxTokens: userLLMSetting.max_tokens || this.defaultSettings.maxTokens,
          baseUrl: userLLMSetting.base_url
        };
      }
    } catch (error) {
      console.error('获取用户LLM设置错误:', error);
    }

    // 如果没有用户设置，使用默认设置
    console.log(`使用默认LLM设置`);
    return {
      ...this.defaultSettings,
      apiKey: process.env.SILICONFLOW_API_KEY || ''
    };
  } catch (error) {
    console.error('获取LLM设置错误:', error);
    return {
      ...this.defaultSettings,
      apiKey: process.env.SILICONFLOW_API_KEY || ''
    };
  }
}
```

### 5.2 创建用户LLM设置

```typescript
public async createUserLLMSetting(
  userId: string,
  settings: {
    name: string;
    provider: string;
    model: string;
    apiKey?: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
    description?: string;
  }
): Promise<string> {
  try {
    // 使用原始SQL插入记录
    await this.prisma.$executeRaw`
      INSERT INTO "user_llm_settings" (
        "id", "user_id", "provider", "model", "api_key", "temperature", "max_tokens", 
        "created_at", "updated_at", "name", "description", "base_url"
      ) VALUES (
        gen_random_uuid(), ${userId}, ${settings.provider}, ${settings.model}, 
        ${settings.apiKey || null}, ${settings.temperature || 0.7}, ${settings.maxTokens || 1000},
        NOW(), NOW(), ${settings.name}, ${settings.description || null}, ${settings.baseUrl || null}
      )
    `;
    
    // 获取插入的ID
    const insertedId = await this.prisma.$queryRaw`
      SELECT "id" FROM "user_llm_settings"
      WHERE "user_id" = ${userId}
      ORDER BY "created_at" DESC
      LIMIT 1
    `;
    
    const id = Array.isArray(insertedId) && insertedId.length > 0 ? insertedId[0].id : null;
    
    if (!id) {
      throw new Error('创建用户LLM设置失败');
    }
    
    console.log(`为用户 ${userId} 创建了LLM设置: ${id}`);
    return id;
  } catch (error) {
    console.error('创建用户LLM设置错误:', error);
    throw error;
  }
}
```

### 5.3 更新账本LLM设置

```typescript
public async updateAccountLLMSettings(
  accountId: string,
  userLLMSettingId: string
): Promise<void> {
  try {
    // 检查账本是否存在
    const accountBook = await this.prisma.accountBook.findUnique({
      where: { id: accountId }
    });

    if (!accountBook) {
      throw new Error(`账本不存在: ${accountId}`);
    }

    // 检查用户LLM设置是否存在
    const userLLMSettings = await this.prisma.$queryRaw`
      SELECT * FROM "user_llm_settings"
      WHERE "id" = ${userLLMSettingId}
    `;

    const userLLMSetting = Array.isArray(userLLMSettings) && userLLMSettings.length > 0 ? userLLMSettings[0] : null;

    if (!userLLMSetting) {
      throw new Error(`用户LLM设置不存在: ${userLLMSettingId}`);
    }

    // 更新账本的userLLMSettingId
    await this.prisma.$executeRaw`
      UPDATE "account_books"
      SET "user_llm_setting_id" = ${userLLMSettingId}
      WHERE "id" = ${accountId}
    `;

    console.log(`账本 ${accountId} 已绑定到LLM设置 ${userLLMSettingId}`);
  } catch (error) {
    console.error('更新账本LLM设置错误:', error);
    throw error;
  }
}
```

## 6. 使用场景

### 6.1 个人账本场景

1. 用户A创建个人LLM设置，使用自己的OpenAI API密钥
2. 用户A将个人账本绑定到该LLM设置
3. 用户A使用智能记账功能，系统使用绑定的LLM设置处理请求

### 6.2 家庭账本场景

1. 用户B创建家庭LLM设置，使用硅基流动API密钥
2. 用户B将家庭账本绑定到该LLM设置
3. 家庭成员C使用智能记账功能，系统使用家庭账本绑定的LLM设置处理请求

## 7. 安全考虑

1. **API密钥安全**: API密钥存储在数据库中，返回给前端时会进行脱敏处理
2. **访问控制**: 用户只能访问自己的LLM设置和有权限的账本
3. **数据隔离**: 不同用户的LLM设置相互隔离，确保数据安全

## 8. 最佳实践

1. **使用环境变量**: 尽量使用环境变量存储API密钥，而不是直接存储在数据库中
2. **选择合适的模型**: 根据需求选择合适的模型，平衡性能和成本
3. **设置合理的参数**: 根据需求设置合理的温度和最大令牌数
4. **监控API使用**: 监控API使用情况，避免超出配额
