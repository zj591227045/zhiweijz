# 百度智能云API调用方式文档

本目录包含百度智能云各种AI服务API的详细调用方式文档，基于官方API文档整理而成。

## 📁 文档结构

### 🔐 鉴权方式详解
- [鉴权方式详解.md](./鉴权方式详解.md) - 完整的鉴权方式说明
  - OAuth 2.0 标准流程
  - AK/SK 签名算法
  - Token 管理最佳实践
  - 安全配置指南

### 🎤 语音识别服务
- [语音识别极速版API详解.md](./语音识别极速版API详解.md) - 高速语音转文字服务
  - 支持多种音频格式 (mp3, wav, pcm, flac, aac, m4a)
  - 多语言模型支持 (普通话、英语、粤语、四川话)
  - 500ms内快速响应，适合实时场景
  - 完整的错误处理和重试策略

- [短语音识别标准版API详解.md](./短语音识别标准版API详解.md) - 高精度语音转文字服务
  - 更高的识别准确率，适合对精度要求高的场景
  - 支持60秒以内短音频识别
  - 完善的音频预处理和质量优化
  - 批量处理和性能监控最佳实践

## 🚀 快速开始

### 1. 获取API凭证
1. 在 [百度智能云控制台](https://console.bce.baidu.com/) 创建应用
2. 获取 Client ID 和 Client Secret
3. 根据需要开通相应的AI服务

### 2. 基础调用示例

#### Python示例
```python
import requests
import json
import base64

# 1. 获取访问令牌
def get_access_token(client_id, client_secret):
    url = 'https://aip.baidubce.com/oauth/2.0/token'
    params = {
        'grant_type': 'client_credentials',
        'client_id': client_id,
        'client_secret': client_secret
    }
    response = requests.get(url, params=params)
    return response.json()['access_token']

# 2. 调用语音识别API
def speech_recognition(audio_file_path, access_token):
    # 读取音频文件并转换为base64
    with open(audio_file_path, 'rb') as f:
        audio_data = f.read()
    audio_base64 = base64.b64encode(audio_data).decode('utf-8')
    
    # 构造请求数据
    request_data = {
        "format": "wav",
        "rate": 16000,
        "channel": 1,
        "cuid": "unique_user_id",
        "token": access_token,
        "speech": audio_base64,
        "len": len(audio_data),
        "dev_pid": 1537  # 普通话模型
    }
    
    # 发送请求
    headers = {'Content-Type': 'application/json'}
    response = requests.post(
        'https://vop.baidu.com/server_api',
        data=json.dumps(request_data),
        headers=headers
    )
    
    return response.json()

# 使用示例
client_id = "your_client_id"
client_secret = "your_client_secret"

token = get_access_token(client_id, client_secret)
result = speech_recognition("test.wav", token)
print("识别结果:", result)
```

#### Node.js示例
```javascript
const axios = require('axios');
const fs = require('fs');

// 获取访问令牌
async function getAccessToken(clientId, clientSecret) {
    const url = 'https://aip.baidubce.com/oauth/2.0/token';
    const params = {
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret
    };
    
    const response = await axios.get(url, { params });
    return response.data.access_token;
}

// 语音识别
async function speechRecognition(audioFilePath, accessToken) {
    // 读取音频文件并转换为base64
    const audioData = fs.readFileSync(audioFilePath);
    const audioBase64 = audioData.toString('base64');
    
    // 构造请求数据
    const requestData = {
        format: "wav",
        rate: 16000,
        channel: 1,
        cuid: "unique_user_id",
        token: accessToken,
        speech: audioBase64,
        len: audioData.length,
        dev_pid: 1537
    };
    
    // 发送请求
    const response = await axios.post(
        'https://vop.baidu.com/server_api',
        requestData,
        {
            headers: { 'Content-Type': 'application/json' }
        }
    );
    
    return response.data;
}

// 使用示例
async function main() {
    const clientId = "your_client_id";
    const clientSecret = "your_client_secret";
    
    const token = await getAccessToken(clientId, clientSecret);
    const result = await speechRecognition("test.wav", token);
    console.log("识别结果:", result);
}

main().catch(console.error);
```

## 📋 支持的服务列表

### 🎯 当前已整理
- ✅ **OAuth 2.0 鉴权** - 标准认证流程
- ✅ **语音识别极速版** - 60秒内音频转文字

### 🚧 计划整理
- 🔄 **实时语音识别** - 流式音频处理
- 🔄 **语音合成** - 文字转语音
- 🔄 **人脸识别** - 人脸检测与识别
- 🔄 **文字识别OCR** - 图片文字提取
- 🔄 **自然语言处理** - 文本分析与理解

## 🔧 工具和库

### 官方SDK
- [Python SDK](https://github.com/Baidu-AIP/python-sdk)
- [Java SDK](https://github.com/Baidu-AIP/java-sdk)
- [PHP SDK](https://github.com/Baidu-AIP/php-sdk)
- [C# SDK](https://github.com/Baidu-AIP/csharp-sdk)
- [Node.js SDK](https://github.com/Baidu-AIP/nodejs-sdk)
- [C++ SDK](https://github.com/Baidu-AIP/cpp-sdk)

### 开发工具
- [API在线调试](https://ai.baidu.com/ai-doc/REFERENCE/4k3dwjhhu) - 在线测试API调用
- [SDK下载中心](https://ai.baidu.com/sdk) - 各语言SDK下载
- [错误码查询](https://ai.baidu.com/ai-doc/REFERENCE/Ck3dwjgmt) - 错误码说明文档

## 📞 技术支持

### 官方资源
- 📖 [官方文档](https://ai.baidu.com/ai-doc/)
- 🔧 [开发者控制台](https://console.bce.baidu.com/)
- 💬 [开发者论坛](https://ai.baidu.com/forum/)
- 📧 技术支持邮箱：ai-support@baidu.com

### 社区支持
- QQ群：588369236 (百度语音技术交流)
- 微信群：关注"百度AI"公众号获取入群方式

## ⚠️ 重要提示

### 安全注意事项
1. **密钥保护**: 不要在代码中硬编码API Key和Secret Key
2. **Token管理**: access_token有效期30天，建议缓存使用
3. **HTTPS传输**: 所有API调用必须使用HTTPS协议
4. **请求限制**: 注意QPS和日调用量限制

### 使用限制
- **音频文件**: 最大60MB，时长不超过60秒
- **并发限制**: 根据套餐类型有不同的QPS限制
- **格式支持**: 详见各API文档的具体说明

## 📊 更新日志

### 2025-01-24
- ✅ 初始化文档结构
- ✅ 完成OAuth 2.0鉴权方式文档
- ✅ 完成语音识别极速版API文档
- ✅ 添加完整的代码示例和最佳实践

### 后续计划
- 🔄 添加更多AI服务API文档
- 🔄 完善错误处理和故障排除指南
- 🔄 增加性能优化建议
- 🔄 提供更多语言的示例代码

---

> 📝 **说明**: 本文档基于百度智能云官方API文档整理，如有疑问请参考[官方最新文档](https://ai.baidu.com/ai-doc/)或联系技术支持。 