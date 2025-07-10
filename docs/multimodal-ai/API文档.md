# 多模态AI功能API文档

## 概述

多模态AI功能为只为记账平台提供了语音识别和图片识别能力，支持用户通过语音和图片进行智能记账。本文档详细介绍了相关API接口的使用方法。

## 基础信息

- **基础URL**: `http://localhost:3000/api/ai`
- **认证方式**: Bearer Token
- **支持格式**: JSON, multipart/form-data

## API接口

### 1. 获取多模态AI状态

获取当前多模态AI功能的配置状态和支持的格式。

**请求**
```
GET /api/ai/multimodal/status
```

**请求头**
```
Authorization: Bearer {token}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "speech": {
      "enabled": true,
      "provider": "siliconflow",
      "model": "FunAudioLLM/SenseVoiceSmall",
      "supportedFormats": ["mp3", "wav", "m4a", "flac", "aac"],
      "maxFileSize": 10485760
    },
    "vision": {
      "enabled": true,
      "provider": "siliconflow", 
      "model": "Qwen/Qwen2.5-VL-72B-Instruct",
      "supportedFormats": ["jpg", "jpeg", "png", "webp", "bmp", "gif"],
      "maxFileSize": 10485760
    },
    "general": {
      "enabled": true,
      "dailyLimit": 100,
      "userLimit": 10
    },
    "smartAccounting": {
      "speechEnabled": true,
      "visionEnabled": true
    }
  }
}
```

### 2. 语音转文本

将音频文件转换为文本。

**请求**
```
POST /api/ai/speech-to-text
```

**请求头**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求参数**
- `audio` (file): 音频文件
- `language` (string, 可选): 语言代码，如 "zh", "en"
- `format` (string, 可选): 音频格式

**响应示例**
```json
{
  "success": true,
  "data": {
    "text": "昨天在沃尔玛买了日用品，花了128.5元",
    "confidence": 0.95,
    "duration": 3.2,
    "language": "zh"
  },
  "usage": {
    "duration": 1500
  }
}
```

### 3. 图片识别

识别图片内容并转换为文本描述。

**请求**
```
POST /api/ai/image-recognition
```

**请求头**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求参数**
- `image` (file): 图片文件
- `prompt` (string, 可选): 识别提示词
- `detailLevel` (string, 可选): 细节级别 ("low", "high", "auto")

**响应示例**
```json
{
  "success": true,
  "data": {
    "text": "这是一张超市购物小票，显示购买了牛奶、面包等商品，总金额为45.8元",
    "confidence": 0.92
  },
  "usage": {
    "duration": 2300
  }
}
```

### 4. 智能记账 - 语音识别

结合语音识别和智能记账功能，直接从语音生成记账信息。

**请求**
```
POST /api/ai/smart-accounting/speech
```

**请求头**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求参数**
- `audio` (file): 音频文件
- `accountBookId` (string): 账本ID

**响应示例**
```json
{
  "success": true,
  "data": {
    "text": "昨天在沃尔玛买了日用品，花了128.5元",
    "confidence": 0.95,
    "type": "speech"
  },
  "usage": {
    "duration": 1800
  }
}
```

### 5. 智能记账 - 图片识别

结合图片识别和智能记账功能，直接从图片生成记账信息。

**请求**
```
POST /api/ai/smart-accounting/vision
```

**请求头**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**请求参数**
- `image` (file): 图片文件
- `accountBookId` (string): 账本ID

**响应示例**
```json
{
  "success": true,
  "data": {
    "text": "超市购物小票，购买牛奶面包等商品，总金额45.8元",
    "confidence": 0.92,
    "type": "vision"
  },
  "usage": {
    "duration": 2500
  }
}
```

### 6. 测试连接

测试多模态AI服务的连接状态。

**请求**
```
POST /api/ai/multimodal/test
```

**请求头**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**请求参数**
```json
{
  "type": "speech" // 或 "vision"
}
```

**响应示例**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "type": "speech"
  }
}
```

## 错误处理

### 错误响应格式

```json
{
  "success": false,
  "error": "错误描述",
  "usage": {
    "duration": 1000
  }
}
```

### 常见错误码

| HTTP状态码 | 错误类型 | 描述 |
|-----------|---------|------|
| 400 | 请求错误 | 请求参数不正确 |
| 401 | 认证失败 | 未提供有效的认证令牌 |
| 403 | 权限不足 | 用户无权访问该资源 |
| 413 | 文件过大 | 上传的文件超过大小限制 |
| 429 | 频率限制 | API调用频率超过限制 |
| 500 | 服务器错误 | 内部服务器错误 |

### 错误类型说明

- **FILE_TOO_LARGE**: 文件大小超过限制
- **UNSUPPORTED_FORMAT**: 不支持的文件格式
- **QUOTA_EXCEEDED**: API调用次数超过限制
- **RECOGNITION_FAILED**: 识别失败
- **PROCESSING_ERROR**: 处理过程中发生错误

## 使用限制

### 文件大小限制

- **音频文件**: 最大 10MB
- **图片文件**: 最大 10MB

### 支持的文件格式

**音频格式**:
- mp3, wav, m4a, flac, aac

**图片格式**:
- jpg, jpeg, png, webp, bmp, gif

### 调用频率限制

- **每日总调用次数**: 100次（可配置）
- **每用户每日调用次数**: 10次（可配置）
- **并发请求数**: 5个

## 最佳实践

### 1. 文件优化

- 压缩音频和图片文件以减少上传时间
- 使用推荐的文件格式以获得最佳识别效果
- 确保音频清晰，图片清楚可读

### 2. 错误处理

- 实现重试机制处理临时性错误
- 为用户提供清晰的错误提示
- 记录错误日志便于问题排查

### 3. 性能优化

- 使用适当的超时设置
- 实现客户端缓存减少重复请求
- 监控API使用情况避免超出限制

## 示例代码

### JavaScript/TypeScript

```typescript
// 语音识别示例
const speechToText = async (audioFile: File) => {
  const formData = new FormData();
  formData.append('audio', audioFile);
  
  const response = await fetch('/api/ai/speech-to-text', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  const result = await response.json();
  return result;
};

// 图片识别示例
const imageRecognition = async (imageFile: File) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  
  const response = await fetch('/api/ai/image-recognition', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  const result = await response.json();
  return result;
};
```

## 更新日志

### v1.0.0 (2025-01-10)
- 初始版本发布
- 支持语音转文本功能
- 支持图片识别功能
- 集成智能记账工作流
- 支持多平台兼容性
