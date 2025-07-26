# SiliconFlow ECONNRESET 错误修复

## 问题描述

在快捷指令上传图片识别并进行LLM文字记账时，调用 SiliconFlow 的 Qwen2.5-32B-Instruct 模型出现 ECONNRESET 错误，但通过其他途径调用该模型正常。

## 错误分析

通过分析错误日志和代码，发现问题的根本原因：

1. **缺少超时设置**: SiliconFlow 提供商的 `generateChatWithUsage` 方法中，axios 请求没有设置超时时间
2. **网络连接不稳定**: 在网络不稳定时，请求可能会长时间挂起，最终被服务器端断开连接
3. **错误处理不完善**: 缺少针对 ECONNRESET 等网络错误的详细处理和重试机制

## 修复方案

### 1. 添加超时设置

为 SiliconFlow 提供商的 axios 请求添加 60 秒超时：

```typescript
// server/src/ai/llm/siliconflow-provider.ts
const response = await axios.post(`${this.baseUrl}/chat/completions`, requestData, {
  headers: {
    Authorization: `Bearer ${options.apiKey}`,
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60秒超时，与其他提供商保持一致
});
```

### 2. 增强错误处理

为所有 SiliconFlow 方法添加详细的网络错误检测：

```typescript
} catch (error) {
  console.error(`[SiliconFlow] 使用模型 ${options.model} 生成聊天响应时出错:`, error);

  // 检查是否是网络连接错误
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNRESET') {
      console.error(`[SiliconFlow] 网络连接被重置，模型: ${options.model}`);
    } else if (error.code === 'ECONNABORTED') {
      console.error(`[SiliconFlow] 请求超时，模型: ${options.model}`);
    } else if (error.response?.status === 429) {
      console.error(`[SiliconFlow] API调用频率限制，模型: ${options.model}`);
    }
  }
  // ... 模型故障转移逻辑
}
```

### 3. 前端重试机制

为快捷指令处理添加重试机制：

```typescript
// apps/web/src/lib/shortcuts-deep-link-handler.ts
let retryCount = 0;
const maxRetries = 2;

while (retryCount <= maxRetries) {
  try {
    const response = await apiClient.post(endpoint, data, { timeout: 60000 });
    break; // 成功则跳出循环
  } catch (error: any) {
    retryCount++;
    
    // 检查是否是网络连接错误且还有重试次数
    if (retryCount <= maxRetries && (
      error.code === 'ECONNRESET' || 
      error.code === 'ECONNABORTED' ||
      error.message?.includes('socket hang up') ||
      error.message?.includes('timeout')
    )) {
      console.log(`网络错误，${2000 * retryCount}ms后重试...`);
      await new Promise(resolve => setTimeout(resolve, 2000 * retryCount));
      continue;
    }
    
    throw error;
  }
}
```

### 4. 服务端错误响应优化

为 AI 控制器添加更友好的错误响应：

```typescript
// server/src/controllers/ai-controller.ts
if ('error' in result) {
  // 检查是否是网络连接错误
  if (result.error.includes('ECONNRESET') || result.error.includes('socket hang up')) {
    return res.status(503).json({
      error: 'AI服务暂时不可用，请稍后重试',
      type: 'SERVICE_UNAVAILABLE',
    });
  }
  // ... 其他错误处理
}
```

## 修复文件列表

1. `server/src/ai/llm/siliconflow-provider.ts` - 添加超时设置和错误处理
2. `apps/web/src/lib/shortcuts-deep-link-handler.ts` - 添加重试机制
3. `server/src/controllers/ai-controller.ts` - 优化错误响应
4. `server/src/ai/llm/llm-provider-service.ts` - 增强错误日志

## 预期效果

1. **减少 ECONNRESET 错误**: 通过设置合理的超时时间，避免请求长时间挂起
2. **提高成功率**: 通过重试机制，在网络不稳定时自动重试
3. **更好的用户体验**: 提供更友好的错误提示，而不是技术性错误信息
4. **更好的监控**: 通过详细的错误日志，便于问题排查

## 测试建议

1. 在网络不稳定的环境下测试快捷指令图片识别功能
2. 模拟网络中断场景，验证重试机制是否正常工作
3. 检查错误日志是否提供足够的诊断信息
4. 验证其他 LLM 调用途径是否仍然正常工作
