# AI LLM API 重新整理总结

## 完成的工作

### 1. 统一API路径前缀

**问题**：AI相关API路径不统一，有些使用 `/api/ai/`，有些使用 `/ai/`

**解决方案**：将所有AI相关API统一为 `/api/ai/` 前缀

**修改的文件**：
- `server/src/routes/ai-routes.ts` - 更新路由注释，添加新的激活服务接口
- `apps/web/src/lib/api/ai-service.ts` - 修复API路径
- `apps/web/src/store/ai-services-store.ts` - 修复API路径
- `packages/core/src/store/create-llm-cache-store.ts` - 修复API路径
- `apps/web/src/lib/api/system-config.ts` - 添加 `/api/` 前缀

### 2. 完善切换逻辑

**问题**：`switchAIServiceType` 方法中自定义服务的切换逻辑不完整

**解决方案**：
- 在 `SystemConfigService` 中实现真正的服务切换逻辑
- 添加数据库操作方法来管理全局配置和账本绑定
- 支持账本级别的服务切换

**新增方法**：
- `updateGlobalAIConfigInDB()` - 更新全局AI配置到数据库
- `upsertSystemConfig()` - 插入或更新系统配置
- `validateUserLLMSetting()` - 验证用户LLM设置是否有效
- `clearAccountLLMBinding()` - 清除账本的LLM设置绑定
- `bindAccountToLLMSetting()` - 绑定账本到LLM设置

**修改的文件**：
- `server/src/services/system-config.service.ts`
- `server/src/controllers/system-config.controller.ts`

### 3. 新增获取当前激活服务的接口

**新接口**：`GET /api/ai/account/:accountId/active-service`

**功能**：获取账本当前激活的AI服务详细信息

**响应格式**：
```typescript
// 共用响应内容
{
  enabled: boolean;           // LLM状态：启用、禁用
  type: 'official' | 'custom' | null; // LLM类型：官方 or 自定义
  maxTokens: number;          // 1000
}

// 官方类型特有参数
{
  dailyTokenLimit: number;    // 50000
  usedTokens: number;         // 当前已用token数量
}

// 自定义类型特有参数
{
  provider: string;           // "siliconflow"
  model: string;              // "Qwen/Qwen3-8B"
  baseUrl: string;            // "https://api.siliconflow.cn/v1"
  name: string;               // 服务名称
  description: string;        // 服务描述
}
```

**实现逻辑**：
1. 首先检查是否启用了全局AI服务（官方服务）
2. 如果启用全局服务，返回官方服务信息和TOKEN使用量
3. 如果没有启用全局服务，检查账本是否绑定了自定义服务
4. 返回相应的服务信息

**修改的文件**：
- `server/src/routes/ai-routes.ts`
- `server/src/controllers/ai-controller.ts`

### 4. 修复前端API调用

**问题**：前端调用的API路径不统一

**解决方案**：
- 统一所有前端API调用路径为 `/api/ai/` 或 `/api/system-config/` 前缀
- 修复LLM设置列表获取接口调用
- 更新切换服务的API调用，支持accountId参数

**修改的文件**：
- `apps/web/src/lib/api/ai-service.ts`
- `apps/web/src/store/ai-services-store.ts`
- `packages/core/src/store/create-llm-cache-store.ts`
- `apps/web/src/lib/api/system-config.ts`
- `apps/web/src/store/global-ai-store.ts`

## API路径对照表

### AI相关API（统一前缀：/api/ai/）
| 功能 | 方法 | 路径 |
|------|------|------|
| 获取提供商列表 | GET | `/api/ai/providers` |
| 获取全局LLM配置 | GET | `/api/ai/global-llm-config` |
| 获取用户LLM设置 | GET | `/api/ai/llm-settings` |
| 获取用户LLM设置列表 | GET | `/api/ai/llm-settings/list` |
| 创建用户LLM设置 | POST | `/api/ai/llm-settings` |
| 获取用户LLM设置详情 | GET | `/api/ai/llm-settings/:id` |
| 更新用户LLM设置 | PUT | `/api/ai/llm-settings/:id` |
| 删除用户LLM设置 | DELETE | `/api/ai/llm-settings/:id` |
| 测试LLM连接 | POST | `/api/ai/llm-settings/test` |
| 获取账本LLM设置 | GET | `/api/ai/account/:accountId/llm-settings` |
| 更新账本LLM设置 | PUT | `/api/ai/account/:accountId/llm-settings` |
| **获取账本激活服务** | GET | `/api/ai/account/:accountId/active-service` |

### 系统配置API（统一前缀：/api/system-config/）
| 功能 | 方法 | 路径 |
|------|------|------|
| 获取全局AI配置 | GET | `/api/system-config/global-ai` |
| 更新全局AI配置 | PUT | `/api/system-config/global-ai` |
| 获取AI服务状态 | GET | `/api/system-config/ai-status` |
| 获取TOKEN使用量 | GET | `/api/system-config/token-usage` |
| 获取今日TOKEN使用量 | GET | `/api/system-config/token-usage/today` |
| 切换AI服务类型 | POST | `/api/system-config/ai-service/switch` |
| 测试AI服务连接 | POST | `/api/system-config/ai-service/test` |

## 切换逻辑说明

### 官方服务切换
1. 启用全局AI配置 (`enabled: true`)
2. 如果提供了accountId，清除账本的自定义LLM设置绑定
3. 返回成功消息

### 自定义服务切换
1. 验证serviceId是否有效（属于用户或家庭成员）
2. 禁用全局AI配置 (`enabled: false`)
3. 如果提供了accountId，绑定账本到指定的LLM设置
4. 返回成功消息

## 下一步建议

1. **前端界面更新**：更新AI服务管理界面，使用新的激活服务接口显示当前状态
2. **测试验证**：测试所有API路径是否正常工作
3. **文档更新**：更新API文档，反映新的路径和功能
4. **错误处理**：完善错误处理和用户提示
5. **权限验证**：确保家庭账本的权限验证逻辑正确
