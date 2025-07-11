# 百度智能云语音识别极速版API详解

## 概述

百度智能云语音识别极速版是基于深度学习技术的语音转文字服务，具有识别准确率高、速度快、支持多种音频格式等特点。本文档详细介绍极速版API的使用方法、参数配置和最佳实践。

## 1. API基本信息

### 1.1 服务地址
```
https://vop.baidu.com/pro_api
```

### 1.2 支持的音频格式
- **音频格式：** mp3, wav, pcm, flac, aac, m4a
- **音频时长：** 最长60秒
- **文件大小：** 最大60MB
- **采样率：** 支持8000Hz或16000Hz
- **声道数：** 仅支持单声道（mono）

### 1.3 语言模型支持

#### 普通话模型
| dev_pid | 模型描述 | 应用场景 |
|---------|----------|----------|
| 1537 | 普通话(支持简单英文) | 通用场景，默认模型 |
| 80001 | 极速版ASR_PRO（普通话专业版） | 高精度要求场景 |
| 1936 | 普通话远场/长语音识别 | 远距离录音、会议场景 |

#### 其他语言模型
| dev_pid | 模型描述 | 说明 |
|---------|----------|------|
| 1737 | 英语 | 英语专用模型 |
| 1637 | 粤语 | 粤语专用模型 |
| 1837 | 四川话 | 四川话方言模型 |

## 2. 认证方式

### 2.1 OAuth 2.0认证
百度语音识别API使用OAuth 2.0标准进行认证，需要先获取access_token。

#### 步骤1：获取访问令牌
```bash
curl -i -k 'https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=【您的API Key】&client_secret=【您的Secret Key】'
```

#### 步骤2：解析响应获取token
```json
{
    "access_token": "24.460da4889caad24cccdb1fea17221975.2592000.1491995545.282335-1234567",
    "expires_in": 2592000
}
```

### 2.2 令牌管理最佳实践

```python
import time
import requests
from threading import Lock

class BaiduTokenManager:
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.expires_time = 0
        self.lock = Lock()
    
    def get_access_token(self):
        """线程安全的token获取"""
        with self.lock:
            # 检查token是否还有效（提前5分钟过期）
            if self.access_token and time.time() < (self.expires_time - 300):
                return self.access_token
            
            # 获取新token
            url = 'https://aip.baidubce.com/oauth/2.0/token'
            params = {
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret
            }
            
            response = requests.get(url, params=params)
            result = response.json()
            
            if 'access_token' in result:
                self.access_token = result['access_token']
                self.expires_time = time.time() + result['expires_in']
                return self.access_token
            else:
                raise Exception(f"获取access_token失败: {result}")
```

## 3. API调用方式

### 3.1 请求格式

**HTTP方法：** POST
**Content-Type：** application/json; charset=utf-8
**请求URL：** `https://vop.baidu.com/pro_api`

### 3.2 请求参数

#### 核心参数
| 参数名 | 必填 | 类型 | 说明 |
|--------|------|------|------|
| format | 是 | string | 音频格式，如wav、mp3、pcm等 |
| rate | 是 | int | 采样率，支持8000或16000 |
| channel | 是 | int | 声道数，固定为1（单声道） |
| cuid | 是 | string | 用户唯一标识，自定义字符串 |
| token | 是 | string | OAuth 2.0访问令牌 |
| speech | 是 | string | base64编码的音频数据 |
| len | 是 | int | 音频文件字节数（原始音频长度） |
| dev_pid | 是 | int | 语言模型ID |

#### 可选参数
| 参数名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| lan | string | zh | 语言选择，zh表示中文 |

### 3.3 完整请求示例

```python
import base64
import json
import requests
import uuid

class BaiduSpeechRecognizer:
    def __init__(self, token_manager):
        self.token_manager = token_manager
    
    def recognize_audio_file(self, audio_file_path, audio_format="wav", model="default", language="zh"):
        """识别音频文件"""
        
        # 读取音频文件
        with open(audio_file_path, 'rb') as f:
            audio_data = f.read()
        
        # 转换为base64
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # 获取访问令牌
        access_token = self.token_manager.get_access_token()
        
        # 构建请求数据
        request_data = {
            "format": audio_format,
            "rate": 16000,  # 采样率
            "channel": 1,   # 单声道
            "cuid": str(uuid.uuid4()),  # 用户唯一标识
            "token": access_token,
            "speech": audio_base64,
            "len": len(audio_data),
            "dev_pid": self._get_dev_pid(model, language)
        }
        
        # 发送请求
        headers = {'Content-Type': 'application/json; charset=utf-8'}
        response = requests.post(
            'https://vop.baidu.com/pro_api',
            data=json.dumps(request_data),
            headers=headers,
            timeout=60
        )
        
        return response.json()
    
    def recognize_audio_data(self, audio_data, audio_format="wav", model="default", language="zh"):
        """识别音频数据"""
        
        # 转换为base64
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # 获取访问令牌
        access_token = self.token_manager.get_access_token()
        
        # 构建请求数据 - 按照百度云API规范
        request_data = {
            "format": audio_format,
            "rate": 16000,  # 采样率，支持 8000 或 16000
            "channel": 1,   # 声道数，仅支持单声道
            "cuid": str(uuid.uuid4()),  # 用户唯一标识
            "token": access_token,
            "speech": audio_base64,
            "len": len(audio_data),
            "dev_pid": self._get_dev_pid(model, language)
        }
        
        # 调用百度云语音识别API
        headers = {'Content-Type': 'application/json; charset=utf-8'}
        response = requests.post(
            'https://vop.baidu.com/pro_api',
            data=json.dumps(request_data),
            headers=headers,
            timeout=60
        )
        
        return response.json()
    
    def _get_dev_pid(self, model, language):
        """获取设备ID (用于选择语言和模型)
        百度云语音识别支持的dev_pid参数说明：
        """
        # 根据百度云官方文档的dev_pid定义：
        
        # 普通话模型
        if not language or language.includes('zh') or language.includes('cn'):
            if model == 'pro':
                return 80001  # 极速版ASR_PRO（普通话专业版）
            elif model == 'longform':
                return 1936   # 普通话远场/长语音识别
            else:
                return 1537   # 普通话(支持简单的英文识别)
        
        # 英语模型
        if language == 'en' or language == 'en-US':
            return 1737  # 英语
        
        # 粤语模型
        if language == 'yue' or language == 'zh-HK' or language == 'zh-TW':
            return 1637  # 粤语
        
        # 四川话
        if language == 'zh-SC':
            return 1837  # 四川话
        
        # 默认返回普通话
        return 1537
```

## 4. 响应格式

### 4.1 成功响应
```json
{
    "err_no": 0,
    "err_msg": "success.",
    "corpus_no": "15984125",
    "sn": "481D633F-73BA-726F-49EF-8659ACCC2F3D",
    "result": ["北京科技馆"]
}
```

### 4.2 响应字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| err_no | int | 错误码，0表示成功 |
| err_msg | string | 错误信息 |
| corpus_no | string | 语料编号，用于标识语料 |
| sn | string | 语音数据唯一标识 |
| result | array | 识别结果数组，通常只有一个元素 |

### 4.3 错误响应示例
```json
{
    "err_no": 3301,
    "err_msg": "audio quality problem",
    "sn": "481D633F-73BA-726F-49EF-8659ACCC2F3D"
}
```

## 5. 错误码处理

### 5.1 常见错误码

| 错误码 | 错误信息 | 处理建议 |
|--------|----------|----------|
| 0 | success | 识别成功 |
| 3300 | 输入参数不正确 | 检查请求参数格式和内容 |
| 3301 | 音频质量过差 | 提高音频质量，减少噪音 |
| 3302 | 鉴权失败 | 检查token是否有效 |
| 3303 | 语音服务器后端问题 | 稍后重试 |
| 3304 | 用户的请求QPS超限 | 降低请求频率 |
| 3305 | 用户的日pv（日请求量）超限 | 检查配额或升级套餐 |
| 3307 | 语音包过大 | 压缩音频文件大小 |
| 3308 | 音频时长过长 | 将音频切分为60秒以内的片段 |
| 3309 | 音频文件过大 | 压缩音频文件，确保小于60MB |
| 3310 | 音频文件下载失败 | 检查音频文件是否可访问 |

### 5.2 错误处理策略

```python
class ErrorHandler:
    # 可重试的错误码
    RETRYABLE_ERRORS = [3303, 3310]
    # 需要重新获取token的错误码  
    TOKEN_ERRORS = [3302]
    # 音频质量问题错误码
    AUDIO_QUALITY_ERRORS = [3301, 3307, 3308, 3309]
    
    @classmethod
    def should_retry(cls, err_no):
        """判断是否应该重试"""
        return err_no in cls.RETRYABLE_ERRORS
    
    @classmethod
    def need_refresh_token(cls, err_no):
        """判断是否需要刷新token"""
        return err_no in cls.TOKEN_ERRORS
    
    @classmethod
    def is_audio_problem(cls, err_no):
        """判断是否为音频质量问题"""
        return err_no in cls.AUDIO_QUALITY_ERRORS

def safe_recognize_with_retry(recognizer, audio_data, max_retries=3):
    """带重试机制的安全识别"""
    for attempt in range(max_retries + 1):
        try:
            result = recognizer.recognize_audio_data(audio_data)
            
            if result.get('err_no') == 0:
                return result
            
            err_no = result.get('err_no')
            
            # 检查是否需要刷新token
            if ErrorHandler.need_refresh_token(err_no):
                recognizer.token_manager.refresh_token()
                if attempt < max_retries:
                    continue
            
            # 检查是否可以重试
            if ErrorHandler.should_retry(err_no) and attempt < max_retries:
                time.sleep(2 ** attempt)  # 指数退避
                continue
            
            # 音频质量问题，不重试
            if ErrorHandler.is_audio_problem(err_no):
                raise AudioQualityError(f"音频质量问题: {result.get('err_msg')}")
            
            # 其他错误
            raise APIError(f"API调用失败: {result}")
            
        except requests.RequestException as e:
            if attempt < max_retries:
                time.sleep(2 ** attempt)
                continue
            raise NetworkError(f"网络请求失败: {str(e)}")
    
    raise Exception("重试次数用尽")
```

## 6. 性能优化

### 6.1 音频预处理

```python
import wave
import audioop
import io

class AudioPreprocessor:
    @staticmethod
    def convert_to_16k_mono_wav(audio_data, source_format="mp3"):
        """将音频转换为16kHz单声道WAV格式"""
        try:
            # 使用ffmpeg或类似工具进行格式转换
            # 这里使用伪代码表示
            converted_audio = convert_audio_format(
                audio_data, 
                target_format="wav",
                sample_rate=16000,
                channels=1
            )
            return converted_audio
        except Exception as e:
            raise AudioConversionError(f"音频转换失败: {str(e)}")
    
    @staticmethod
    def validate_audio_quality(audio_data):
        """验证音频质量"""
        # 检查文件大小
        if len(audio_data) > 60 * 1024 * 1024:  # 60MB
            raise AudioQualityError("音频文件过大")
        
        # 检查是否为空文件
        if len(audio_data) == 0:
            raise AudioQualityError("音频文件为空")
        
        return True
    
    @staticmethod
    def extract_audio_info(audio_data, format="wav"):
        """提取音频信息"""
        if format.lower() == "wav":
            try:
                audio_io = io.BytesIO(audio_data)
                with wave.open(audio_io, 'rb') as wav_file:
                    return {
                        "channels": wav_file.getnchannels(),
                        "sample_rate": wav_file.getframerate(),
                        "duration": wav_file.getnframes() / wav_file.getframerate(),
                        "sample_width": wav_file.getsampwidth()
                    }
            except Exception as e:
                raise AudioQualityError(f"无法解析WAV文件: {str(e)}")
        
        return None
```

### 6.2 批量处理优化

```python
import asyncio
import aiohttp
from concurrent.futures import ThreadPoolExecutor
import queue
import threading

class BatchSpeechRecognizer:
    def __init__(self, token_manager, max_concurrent=5):
        self.token_manager = token_manager
        self.max_concurrent = max_concurrent
        self.session = None
    
    async def recognize_batch_async(self, audio_files):
        """异步批量识别"""
        async with aiohttp.ClientSession() as session:
            self.session = session
            
            semaphore = asyncio.Semaphore(self.max_concurrent)
            tasks = []
            
            for audio_file in audio_files:
                task = self._recognize_single_async(semaphore, audio_file)
                tasks.append(task)
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            return results
    
    async def _recognize_single_async(self, semaphore, audio_file):
        """单个音频异步识别"""
        async with semaphore:
            try:
                # 读取和处理音频文件
                with open(audio_file, 'rb') as f:
                    audio_data = f.read()
                
                # 调用识别API
                result = await self._call_api_async(audio_data)
                return {"file": audio_file, "result": result, "success": True}
                
            except Exception as e:
                return {"file": audio_file, "error": str(e), "success": False}
    
    async def _call_api_async(self, audio_data):
        """异步调用API"""
        # 准备请求数据
        request_data = self._prepare_request_data(audio_data)
        
        # 发送异步请求
        async with self.session.post(
            'https://vop.baidu.com/pro_api',
            json=request_data,
            headers={'Content-Type': 'application/json; charset=utf-8'},
            timeout=aiohttp.ClientTimeout(total=60)
        ) as response:
            result = await response.json()
            return result
```

### 6.3 连接池管理

```python
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry

class OptimizedSpeechRecognizer:
    def __init__(self, token_manager):
        self.token_manager = token_manager
        self.session = self._create_session()
    
    def _create_session(self):
        """创建优化的HTTP会话"""
        session = requests.Session()
        
        # 配置重试策略
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        # 配置连接池
        adapter = HTTPAdapter(
            pool_connections=10,
            pool_maxsize=20,
            max_retries=retry_strategy
        )
        
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        # 设置默认超时
        session.timeout = 60
        
        return session
    
    def recognize_with_session(self, audio_data):
        """使用会话连接池进行识别"""
        request_data = self._prepare_request_data(audio_data)
        
        response = self.session.post(
            'https://vop.baidu.com/pro_api',
            json=request_data,
            headers={'Content-Type': 'application/json; charset=utf-8'}
        )
        
        return response.json()
    
    def __del__(self):
        """清理资源"""
        if hasattr(self, 'session'):
            self.session.close()
```

## 7. 使用示例

### 7.1 基本使用示例

```python
# 初始化
token_manager = BaiduTokenManager("your_client_id", "your_client_secret")
recognizer = BaiduSpeechRecognizer(token_manager)

# 识别音频文件
try:
    result = recognizer.recognize_audio_file("test.wav")
    if result.get('err_no') == 0:
        print("识别结果:", result['result'][0])
    else:
        print("识别失败:", result.get('err_msg'))
except Exception as e:
    print("发生错误:", str(e))
```

### 7.2 高级配置示例

```python
# 使用专业模型识别
result = recognizer.recognize_audio_file(
    "meeting_record.wav", 
    model="pro",        # 使用专业版模型
    language="zh"       # 中文识别
)

# 使用长语音模型
result = recognizer.recognize_audio_file(
    "long_speech.wav",
    model="longform",   # 长语音模型
    language="zh"
)

# 英语识别
result = recognizer.recognize_audio_file(
    "english_speech.wav",
    language="en"       # 英语识别
)
```

### 7.3 完整应用示例

```python
import os
import logging
from pathlib import Path

class SpeechRecognitionApp:
    def __init__(self, client_id, client_secret):
        # 设置日志
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # 初始化组件
        self.token_manager = BaiduTokenManager(client_id, client_secret)
        self.recognizer = OptimizedSpeechRecognizer(self.token_manager)
        self.preprocessor = AudioPreprocessor()
    
    def recognize_file(self, file_path, model="default"):
        """识别单个文件"""
        try:
            # 验证文件存在
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"文件不存在: {file_path}")
            
            # 读取音频文件
            with open(file_path, 'rb') as f:
                audio_data = f.read()
            
            # 音频质量检查
            self.preprocessor.validate_audio_quality(audio_data)
            
            # 执行识别
            result = safe_recognize_with_retry(self.recognizer, audio_data)
            
            if result.get('err_no') == 0:
                return {
                    "success": True,
                    "text": result['result'][0],
                    "corpus_no": result.get('corpus_no'),
                    "file": file_path
                }
            else:
                return {
                    "success": False,
                    "error": result.get('err_msg'),
                    "error_code": result.get('err_no'),
                    "file": file_path
                }
                
        except Exception as e:
            self.logger.error(f"识别文件失败 {file_path}: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "file": file_path
            }
    
    def recognize_directory(self, directory_path, model="default"):
        """批量识别目录中的音频文件"""
        directory = Path(directory_path)
        if not directory.exists():
            raise FileNotFoundError(f"目录不存在: {directory_path}")
        
        # 支持的音频格式
        audio_extensions = {'.wav', '.mp3', '.flac', '.aac', '.m4a', '.pcm'}
        
        # 查找音频文件
        audio_files = []
        for ext in audio_extensions:
            audio_files.extend(directory.glob(f"*{ext}"))
        
        if not audio_files:
            self.logger.warning(f"目录中未找到音频文件: {directory_path}")
            return []
        
        self.logger.info(f"找到 {len(audio_files)} 个音频文件")
        
        # 批量处理
        results = []
        for i, file_path in enumerate(audio_files):
            self.logger.info(f"处理文件 {i+1}/{len(audio_files)}: {file_path.name}")
            result = self.recognize_file(str(file_path), model)
            results.append(result)
        
        return results

# 使用示例
if __name__ == "__main__":
    app = SpeechRecognitionApp(
        client_id="your_client_id",
        client_secret="your_client_secret"
    )
    
    # 识别单个文件
    result = app.recognize_file("test.wav", model="pro")
    print("识别结果:", result)
    
    # 批量识别
    results = app.recognize_directory("./audio_files/", model="default")
    for result in results:
        if result['success']:
            print(f"文件: {result['file']}")
            print(f"识别结果: {result['text']}")
        else:
            print(f"识别失败: {result['file']} - {result['error']}")
```

## 8. 最佳实践总结

### 8.1 性能优化建议
1. **音频预处理：** 转换为16kHz单声道WAV格式
2. **连接复用：** 使用会话连接池减少连接开销
3. **异步处理：** 批量处理时使用异步调用
4. **智能重试：** 实现指数退避重试策略
5. **缓存管理：** 合理缓存access_token

### 8.2 质量保证建议
1. **音频质量：** 确保音频清晰，噪音较少
2. **格式规范：** 使用推荐的音频格式和参数
3. **错误处理：** 完善的错误分类和处理机制
4. **日志监控：** 记录详细的调用日志便于排查问题

### 8.3 安全性建议
1. **密钥保护：** 使用环境变量存储敏感信息
2. **访问控制：** 限制API调用来源和频率
3. **数据加密：** 传输过程使用HTTPS加密
4. **审计日志：** 记录所有API调用行为

通过遵循这些最佳实践，可以确保百度智能云语音识别极速版API的高效、稳定和安全使用。 