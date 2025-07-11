# WebM音频格式兼容性解决方案

## 问题描述

现代浏览器（特别是Chrome）在使用MediaRecorder API录音时，默认输出格式为webm，但百度云语音识别服务不支持webm格式。

**百度云支持的音频格式：**
- mp3, wav, pcm, flac, aac, m4a

**浏览器录音默认格式：**
- Chrome/Edge: webm
- Safari: 可能是wav或其他格式

## 解决方案

### 方案一：前端音频格式转换（推荐）

在前端将webm转换为wav格式后再上传：

```typescript
// 音频格式转换工具函数
export async function convertWebmToWav(webmBlob: Blob): Promise<Blob> {
  try {
    // 创建AudioContext
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // 读取webm音频数据
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // 转换为WAV格式
    const wavBuffer = audioBufferToWav(audioBuffer);
    return new Blob([wavBuffer], { type: 'audio/wav' });
  } catch (error) {
    console.error('音频转换失败:', error);
    throw new Error('音频格式转换失败');
  }
}

// AudioBuffer转WAV的实现
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const length = buffer.length;
  const numberOfChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2; // 16-bit
  
  // WAV文件头部
  const headerLength = 44;
  const dataLength = length * numberOfChannels * bytesPerSample;
  const bufferLength = headerLength + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV文件头
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM格式
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true);
  view.setUint16(32, numberOfChannels * bytesPerSample, true);
  view.setUint16(34, 16, true); // 16-bit
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  // 音频数据
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
      view.setInt16(offset, sample * 0x7FFF, true);
      offset += 2;
    }
  }
  
  return arrayBuffer;
}
```

### 方案二：浏览器录音时指定格式

尝试在录音时指定支持的格式：

```typescript
// 尝试使用不同的音频格式
const supportedTypes = [
  'audio/wav',
  'audio/mp3',
  'audio/mp4',
  'audio/webm'
];

let selectedType = 'audio/webm'; // 默认
for (const type of supportedTypes) {
  if (MediaRecorder.isTypeSupported(type)) {
    selectedType = type;
    if (type !== 'audio/webm') {
      break; // 优先使用非webm格式
    }
  }
}

const mediaRecorder = new MediaRecorder(stream, {
  mimeType: selectedType
});
```

### 方案三：混合方案（最佳实践）

结合格式检测和自动转换：

```typescript
// 录音完成后的处理函数
async function handleRecordingComplete(blob: Blob): Promise<Blob> {
  // 检查格式
  if (blob.type.includes('webm')) {
    console.log('检测到webm格式，正在转换为wav...');
    return await convertWebmToWav(blob);
  }
  
  // 如果已经是支持的格式，直接返回
  return blob;
}

// 在语音识别组件中使用
const processAudio = async (audioBlob: Blob) => {
  try {
    // 自动处理格式转换
    const processedBlob = await handleRecordingComplete(audioBlob);
    
    // 上传到服务器
    const formData = new FormData();
    formData.append('audio', processedBlob, 'recording.wav');
    
    // 调用语音识别API
    const response = await fetch('/api/ai/smart-accounting/speech', {
      method: 'POST',
      body: formData,
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('语音识别失败:', error);
    throw error;
  }
};
```

## 当前实现状态

### 后端修改

1. **百度云服务已更新** (`/server/src/services/speech-recognition-baidu.service.ts`)：
   - 添加webm格式检测
   - 提供友好的错误信息
   - 明确指导用户使用支持的格式

2. **错误信息优化**：
   ```
   百度云语音识别不支持webm格式。建议使用wav、mp3、flac、aac、m4a格式。
   如果您使用的是浏览器录音，请在前端将webm转换为wav格式后再上传。
   ```

### 前端需要实现

1. **音频格式转换库**：实现webm到wav的转换
2. **录音组件优化**：在录音完成后自动转换格式
3. **用户提示**：当检测到不支持格式时给出明确指导

## 推荐实施步骤

1. **立即可用**：当前后端已提供友好错误信息
2. **短期解决**：在前端实现音频格式转换
3. **长期优化**：考虑支持更多语音识别提供商

## 技术注意事项

1. **音频质量**：转换过程可能影响音质，建议使用16kHz单声道
2. **文件大小**：wav格式文件较大，注意网络传输效率
3. **浏览器兼容性**：Web Audio API在所有现代浏览器中都有良好支持
4. **性能考虑**：音频转换在前端进行，避免服务器负载

## 测试验证

可以通过以下方式测试：

1. 使用Chrome浏览器录音（产生webm格式）
2. 查看后端返回的错误信息是否友好
3. 实现前端转换后验证是否能正常识别

## 相关文件

- `/server/src/services/speech-recognition-baidu.service.ts` - 百度云语音识别服务
- `/apps/web/src/components/enhanced-smart-accounting-dialog.tsx` - 前端录音组件
- `/docs/multimodal-ai/百度智能云/语音识别极速版API详解.md` - 百度云API文档