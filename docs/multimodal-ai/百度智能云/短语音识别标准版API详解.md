# 百度智能云短语音识别标准版API详解

## 概述

百度智能云短语音识别标准版是针对60秒以内的短音频进行语音转文字的云端服务。相比极速版，标准版具有更高的识别准确率，但识别速度相对较慢。本文档详细介绍标准版API的调用规范、参数配置和最佳实践。

## 1. API基本信息

### 1.1 服务地址
```
https://vop.baidu.com/server_api
```

### 1.2 请求方式
- **方法**: POST
- **Content-Type**: application/json; charset=utf-8
- **编码格式**: UTF-8

### 1.3 支持的音频格式
- **音频格式**: wav, pcm, mp3, flac, aac, m4a, amr
- **音频时长**: 最长60秒
- **文件大小**: 最大60MB
- **采样率**: 支持8000Hz或16000Hz
- **声道数**: 仅支持单声道（mono）

### 1.4 语言模型支持

#### 普通话模型
| dev_pid | 模型描述 | 采样率 | 应用场景 |
|---------|----------|---------|----------|
| 1537 | 普通话(支持简单英文) | 16k | 通用场景，默认模型 |
| 1737 | 英语 | 16k | 英语专用模型 |
| 1637 | 粤语 | 16k | 粤语专用模型 |
| 1837 | 四川话 | 16k | 四川话方言模型 |
| 1936 | 普通话远场 | 16k | 远距离录音、会议场景 |

## 2. 认证方式

### 2.1 OAuth 2.0认证
百度语音识别API使用OAuth 2.0标准进行认证，需要先获取access_token。

#### 步骤1：获取访问令牌
```bash
curl -i -k 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=【您的API Key】&client_secret=【您的Secret Key】'
```

**返回示例：**
```json
{
    "access_token": "24.460da4889caad24cccdb1fea17221975.2592000.1491995545.282335-1234567",
    "expires_in": 2592000
}
```

#### 步骤2：保存访问令牌
- access_token有效期为30天
- 建议在过期前重新获取
- 可以设置自动刷新机制

## 3. API调用方式

### 3.1 请求URL
```
POST https://vop.baidu.com/server_api
```

### 3.2 请求Header
```
Content-Type: application/json; charset=utf-8
```

### 3.3 请求参数

#### 必选参数
| 参数名 | 类型 | 说明 |
|--------|------|------|
| format | string | 音频格式，支持wav、pcm、mp3、flac、aac、m4a、amr |
| rate | int | 采样率，支持8000或16000 |
| channel | int | 声道数，仅支持1（单声道） |
| cuid | string | 用户唯一标识，推荐使用UUID |
| token | string | 开放平台获取到的开发者access_token |
| speech | string | 真实的语音数据，进行base64编码，要求base64编码和urlencode后大小不超过60MB |
| len | int | 原始语音长度，单位字节 |

#### 可选参数
| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| dev_pid | int | 1537 | 语言模型，1537=普通话搜索模型，1536=普通话输入法模型 |
| lan | string | zh | 语言选择，zh=中文，en=英文，ct=粤语 |

### 3.4 请求示例

#### 基础请求示例
```bash
curl -i -k 'https://vop.baidu.com/server_api' \
-H 'Content-Type: application/json; charset=utf-8' \
-d '{
    "format": "wav",
    "rate": 16000,
    "channel": 1,
    "cuid": "baidu_workshop",
    "token": "【您的access_token】",
    "speech": "【base64编码的音频数据】",
    "len": 4096
}'
```

#### Python请求示例
```python
import requests
import json
import base64

def speech_recognition(audio_file_path, access_token):
    # 读取音频文件
    with open(audio_file_path, 'rb') as f:
        audio_data = f.read()
    
    # Base64编码
    speech = base64.b64encode(audio_data).decode('utf-8')
    
    # 请求参数
    params = {
        "format": "wav",
        "rate": 16000,
        "channel": 1,
        "cuid": "baidu_workshop",
        "token": access_token,
        "speech": speech,
        "len": len(audio_data)
    }
    
    # 发送请求
    headers = {'Content-Type': 'application/json; charset=utf-8'}
    response = requests.post(
        'https://vop.baidu.com/server_api',
        headers=headers,
        data=json.dumps(params)
    )
    
    return response.json()
```

#### Node.js请求示例
```javascript
const fs = require('fs');
const axios = require('axios');

async function speechRecognition(audioFilePath, accessToken) {
    // 读取音频文件
    const audioData = fs.readFileSync(audioFilePath);
    
    // Base64编码
    const speech = audioData.toString('base64');
    
    // 请求参数
    const params = {
        format: 'wav',
        rate: 16000,
        channel: 1,
        cuid: 'baidu_workshop',
        token: accessToken,
        speech: speech,
        len: audioData.length
    };
    
    // 发送请求
    try {
        const response = await axios.post(
            'https://vop.baidu.com/server_api',
            params,
            {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error('请求失败:', error.message);
        throw error;
    }
}
```

## 4. 响应格式

### 4.1 成功响应
```json
{
    "err_no": 0,
    "err_msg": "success.",
    "corpus_no": "15984125203285346378",
    "sn": "481D633F-73BA-726F-49EF-8659ACCC2F3D",
    "result": ["北京天气"]
}
```

### 4.2 响应参数说明
| 字段名 | 类型 | 说明 |
|--------|------|------|
| err_no | int | 错误码，0表示成功 |
| err_msg | string | 错误信息 |
| corpus_no | string | 语音数据库标识 |
| sn | string | 语音数据唯一标识，用于问题排查 |
| result | array | 识别结果数组，通常包含一个最优结果 |

## 5. 错误码说明

### 5.1 常见错误码
| 错误码 | 错误信息 | 说明 | 解决方案 |
|--------|----------|------|----------|
| 0 | success | 识别成功 | 无需处理 |
| 3300 | 输入参数不正确 | 请求参数有误 | 检查请求参数格式和内容 |
| 3301 | 音频质量过差 | 音频无法识别 | 提高音频质量，减少噪音 |
| 3302 | 鉴权失败 | access_token无效 | 重新获取access_token |
| 3303 | 语音服务器后端问题 | 服务端异常 | 稍后重试 |
| 3304 | 用户的请求QPS超限 | 请求频率过高 | 控制请求频率 |
| 3305 | 用户的日pv（日请求量）超限 | 日请求量超限 | 升级服务或等待次日 |
| 3307 | 语音数据过长 | 音频时长超过60秒 | 切分音频或使用长语音识别 |
| 3308 | 音频数据异常 | 音频格式不支持 | 转换为支持的音频格式 |
| 3309 | 音频数据大小异常 | 音频文件过大 | 压缩音频或降低采样率 |
| 3310 | 音频数据格式异常 | 音频编码格式不支持 | 使用支持的音频格式 |

## 6. 最佳实践

### 6.1 音频质量优化
```python
# 音频预处理示例
import librosa
import soundfile as sf

def preprocess_audio(input_file, output_file, target_sr=16000):
    """
    音频预处理：降噪、标准化采样率
    """
    # 加载音频
    audio, sr = librosa.load(input_file, sr=None)
    
    # 重采样到目标采样率
    if sr != target_sr:
        audio = librosa.resample(audio, orig_sr=sr, target_sr=target_sr)
    
    # 音频标准化
    audio = librosa.util.normalize(audio)
    
    # 保存处理后的音频
    sf.write(output_file, audio, target_sr)
    
    return output_file
```

### 6.2 令牌管理
```python
import time
import json
from datetime import datetime, timedelta

class TokenManager:
    def __init__(self, api_key, secret_key):
        self.api_key = api_key
        self.secret_key = secret_key
        self.access_token = None
        self.expires_at = None
    
    def get_access_token(self):
        """获取有效的access_token"""
        if self.access_token and self.expires_at and datetime.now() < self.expires_at:
            return self.access_token
        
        # 重新获取token
        self._refresh_token()
        return self.access_token
    
    def _refresh_token(self):
        """刷新access_token"""
        import requests
        
        url = 'https://aip.baidubce.com/oauth/2.0/token'
        params = {
            'grant_type': 'client_credentials',
            'client_id': self.api_key,
            'client_secret': self.secret_key
        }
        
        response = requests.get(url, params=params)
        result = response.json()
        
        if 'access_token' in result:
            self.access_token = result['access_token']
            # 提前5分钟过期，避免边界问题
            expires_in = result.get('expires_in', 2592000) - 300
            self.expires_at = datetime.now() + timedelta(seconds=expires_in)
        else:
            raise Exception(f"获取access_token失败: {result}")
```

### 6.3 错误处理和重试
```python
import time
from functools import wraps

def retry_on_error(max_retries=3, delay=1):
    """错误重试装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    result = func(*args, **kwargs)
                    
                    # 检查业务错误码
                    if isinstance(result, dict) and result.get('err_no') != 0:
                        err_no = result.get('err_no')
                        err_msg = result.get('err_msg', 'Unknown error')
                        
                        # 可重试的错误
                        if err_no in [3303, 3304]:  # 服务端问题或QPS超限
                            if attempt < max_retries - 1:
                                print(f"遇到可重试错误 {err_no}: {err_msg}, 等待 {delay} 秒后重试...")
                                time.sleep(delay * (attempt + 1))
                                continue
                        
                        # 不可重试的错误直接抛出
                        raise Exception(f"识别失败 {err_no}: {err_msg}")
                    
                    return result
                    
                except Exception as e:
                    if attempt < max_retries - 1:
                        print(f"请求失败: {e}, 等待 {delay} 秒后重试...")
                        time.sleep(delay * (attempt + 1))
                        continue
                    else:
                        raise e
                        
            return None
        return wrapper
    return decorator

@retry_on_error(max_retries=3, delay=2)
def robust_speech_recognition(audio_file, token_manager):
    """带重试机制的语音识别"""
    token = token_manager.get_access_token()
    return speech_recognition(audio_file, token)
```

### 6.4 批量处理
```python
import asyncio
import aiohttp
import json
import base64
from concurrent.futures import ThreadPoolExecutor

class BatchSpeechRecognition:
    def __init__(self, token_manager, max_concurrent=5):
        self.token_manager = token_manager
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
    
    async def recognize_single(self, session, audio_file):
        """单个文件识别"""
        async with self.semaphore:
            try:
                # 读取音频文件
                with open(audio_file, 'rb') as f:
                    audio_data = f.read()
                
                # 准备请求数据
                speech = base64.b64encode(audio_data).decode('utf-8')
                params = {
                    "format": "wav",
                    "rate": 16000,
                    "channel": 1,
                    "cuid": "batch_recognition",
                    "token": self.token_manager.get_access_token(),
                    "speech": speech,
                    "len": len(audio_data)
                }
                
                # 发送请求
                headers = {'Content-Type': 'application/json; charset=utf-8'}
                async with session.post(
                    'https://vop.baidu.com/server_api',
                    headers=headers,
                    data=json.dumps(params)
                ) as response:
                    result = await response.json()
                    return {
                        'file': audio_file,
                        'result': result
                    }
                    
            except Exception as e:
                return {
                    'file': audio_file,
                    'error': str(e)
                }
    
    async def batch_recognize(self, audio_files):
        """批量识别"""
        async with aiohttp.ClientSession() as session:
            tasks = [self.recognize_single(session, audio_file) for audio_file in audio_files]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            return results

# 使用示例
async def main():
    token_manager = TokenManager("your_api_key", "your_secret_key")
    batch_recognizer = BatchSpeechRecognition(token_manager, max_concurrent=3)
    
    audio_files = ["audio1.wav", "audio2.wav", "audio3.wav"]
    results = await batch_recognizer.batch_recognize(audio_files)
    
    for result in results:
        if 'error' in result:
            print(f"识别失败: {result['file']} - {result['error']}")
        else:
            print(f"识别成功: {result['file']} - {result['result']}")

# 运行批量识别
# asyncio.run(main())
```

## 7. 性能监控

### 7.1 调用统计
```python
import time
from collections import defaultdict, deque
from threading import Lock

class APIMonitor:
    def __init__(self, window_size=100):
        self.window_size = window_size
        self.call_times = deque(maxlen=window_size)
        self.success_count = 0
        self.error_count = 0
        self.error_types = defaultdict(int)
        self.lock = Lock()
    
    def record_call(self, duration, success=True, error_code=None):
        """记录API调用"""
        with self.lock:
            self.call_times.append(duration)
            
            if success:
                self.success_count += 1
            else:
                self.error_count += 1
                if error_code:
                    self.error_types[error_code] += 1
    
    def get_stats(self):
        """获取统计信息"""
        with self.lock:
            if not self.call_times:
                return {}
            
            avg_time = sum(self.call_times) / len(self.call_times)
            max_time = max(self.call_times)
            min_time = min(self.call_times)
            
            total_calls = self.success_count + self.error_count
            success_rate = self.success_count / total_calls if total_calls > 0 else 0
            
            return {
                'total_calls': total_calls,
                'success_count': self.success_count,
                'error_count': self.error_count,
                'success_rate': success_rate,
                'avg_response_time': avg_time,
                'max_response_time': max_time,
                'min_response_time': min_time,
                'error_distribution': dict(self.error_types),
                'recent_calls': len(self.call_times)
            }

# 使用监控装饰器
monitor = APIMonitor()

def monitored_recognition(func):
    """添加监控的装饰器"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        start_time = time.time()
        try:
            result = func(*args, **kwargs)
            duration = time.time() - start_time
            
            # 检查业务成功
            success = isinstance(result, dict) and result.get('err_no') == 0
            error_code = result.get('err_no') if not success else None
            
            monitor.record_call(duration, success, error_code)
            return result
            
        except Exception as e:
            duration = time.time() - start_time
            monitor.record_call(duration, False, 'exception')
            raise e
            
    return wrapper

@monitored_recognition
def monitored_speech_recognition(audio_file, access_token):
    return speech_recognition(audio_file, access_token)
```

## 8. 与极速版的对比

| 特性 | 标准版 | 极速版 |
|------|--------|--------|
| 识别准确率 | 高 | 中等 |
| 识别速度 | 2-3秒 | 500ms以内 |
| 并发支持 | 较低 | 较高 |
| 价格 | 相对较低 | 相对较高 |
| 适用场景 | 对准确率要求高的场景 | 对实时性要求高的场景 |

## 9. 注意事项

1. **音频格式要求**：确保音频文件格式正确，采样率匹配
2. **文件大小限制**：音频文件不能超过60MB，时长不超过60秒
3. **token管理**：access_token有效期30天，建议提前刷新
4. **QPS限制**：注意控制请求频率，避免超限
5. **错误处理**：实现完善的错误处理和重试机制
6. **音频质量**：音频质量直接影响识别准确率，建议进行预处理

## 10. 技术支持

- **官方文档**: https://cloud.baidu.com/doc/SPEECH/s/Jlbxdezuf
- **开发者社区**: https://ai.baidu.com/forum
- **技术支持QQ群**: 588369236
- **客服电话**: 400-920-8999

---

*更新时间：2024年12月*
*文档版本：v1.0* 