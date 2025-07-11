/**
 * 浏览器端音频格式转换工具
 * 将webm格式转换为wav格式，避免后端处理
 */

export interface AudioConversionResult {
  blob: Blob;
  format: string;
  duration: number;
  size: number;
}

/**
 * 检测浏览器支持的录音格式并选择最佳格式
 */
export function getBestAudioFormat(): string {
  const supportedTypes = [
    'audio/wav',
    'audio/mp4',
    'audio/mp3',
    'audio/webm;codecs=opus',
    'audio/webm'
  ];

  for (const type of supportedTypes) {
    if (MediaRecorder.isTypeSupported(type)) {
      console.log('🎤 [AudioFormat] 支持的格式:', type);
      if (type.startsWith('audio/wav') || type.startsWith('audio/mp4') || type.startsWith('audio/mp3')) {
        return type; // 优先使用兼容性更好的格式
      }
    }
  }

  // 如果都不支持，回退到webm
  return 'audio/webm';
}

/**
 * 将AudioBuffer转换为WAV格式的ArrayBuffer
 */
function audioBufferToWav(buffer: AudioBuffer): ArrayBuffer {
  const numberOfChannels = Math.min(buffer.numberOfChannels, 2); // 最多支持立体声
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const bytesPerSample = 2; // 16-bit
  
  // 计算文件大小
  const headerLength = 44;
  const dataLength = length * numberOfChannels * bytesPerSample;
  const bufferLength = headerLength + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // 写入字符串辅助函数
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  // WAV文件头
  writeString(0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true); // 文件大小
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM格式块大小
  view.setUint16(20, 1, true); // PCM格式
  view.setUint16(22, numberOfChannels, true); // 声道数
  view.setUint32(24, sampleRate, true); // 采样率
  view.setUint32(28, sampleRate * numberOfChannels * bytesPerSample, true); // 字节率
  view.setUint16(32, numberOfChannels * bytesPerSample, true); // 块对齐
  view.setUint16(34, 16, true); // 采样位数
  writeString(36, 'data');
  view.setUint32(40, dataLength, true); // 数据大小
  
  // 写入音频数据
  let offset = 44;
  for (let i = 0; i < length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      // 获取音频样本并转换为16位整数
      const channelData = buffer.getChannelData(channel);
      const sample = Math.max(-1, Math.min(1, channelData[i])); // 限制范围
      view.setInt16(offset, sample * 0x7FFF, true); // 转换为16位
      offset += 2;
    }
  }
  
  return arrayBuffer;
}

/**
 * 将音频转换为wav格式（支持webm、m4a等格式）
 */
export async function convertAudioToWav(audioBlob: Blob): Promise<AudioConversionResult> {
  const startTime = Date.now();
  const format = detectAudioFormat(audioBlob);
  
  try {
    console.log('🎤 [AudioConversion] 开始转换音频到wav，原格式:', format, '文件大小:', audioBlob.size);
    
    // 创建AudioContext
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 16000 // 设置为16kHz，适合语音识别
    });
    
    // 读取音频数据
    const arrayBuffer = await audioBlob.arrayBuffer();
    console.log('🎤 [AudioConversion] 读取音频数据完成，大小:', arrayBuffer.byteLength);
    
    // 解码音频数据
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    console.log('🎤 [AudioConversion] 音频解码完成:', {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
      length: audioBuffer.length
    });
    
    // 如果需要，重新采样到16kHz单声道
    let processedBuffer = audioBuffer;
    if (audioBuffer.sampleRate !== 16000 || audioBuffer.numberOfChannels !== 1) {
      console.log('🎤 [AudioConversion] 需要重新采样/转换声道');
      processedBuffer = await resampleAudioBuffer(audioContext, audioBuffer, 16000, 1);
    }
    
    // 转换为WAV格式
    const wavArrayBuffer = audioBufferToWav(processedBuffer);
    const wavBlob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
    
    // 关闭AudioContext以释放资源
    await audioContext.close();
    
    const duration = Date.now() - startTime;
    const result: AudioConversionResult = {
      blob: wavBlob,
      format: 'wav',
      duration,
      size: wavBlob.size
    };
    
    console.log('🎤 [AudioConversion] 转换完成:', {
      originalFormat: format,
      originalSize: audioBlob.size,
      convertedSize: wavBlob.size,
      duration: `${duration}ms`,
      sizeChange: `${((wavBlob.size - audioBlob.size) / audioBlob.size * 100).toFixed(1)}%`
    });
    
    return result;
    
  } catch (error) {
    console.error('🎤 [AudioConversion] 转换失败:', error);
    throw new Error(`音频格式转换失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 重新采样AudioBuffer到指定采样率和声道数
 */
async function resampleAudioBuffer(
  audioContext: AudioContext, 
  audioBuffer: AudioBuffer, 
  targetSampleRate: number, 
  targetChannels: number
): Promise<AudioBuffer> {
  // 创建离线音频上下文进行重采样
  const offlineContext = new OfflineAudioContext(
    targetChannels, 
    Math.ceil(audioBuffer.duration * targetSampleRate), 
    targetSampleRate
  );
  
  // 创建音频源
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  
  // 如果需要转换声道数，添加声道合并器
  if (audioBuffer.numberOfChannels !== targetChannels) {
    const merger = offlineContext.createChannelMerger(targetChannels);
    const splitter = offlineContext.createChannelSplitter(audioBuffer.numberOfChannels);
    
    source.connect(splitter);
    
    // 如果是立体声转单声道，合并左右声道
    if (audioBuffer.numberOfChannels > 1 && targetChannels === 1) {
      const gainNode = offlineContext.createGain();
      gainNode.gain.value = 1 / audioBuffer.numberOfChannels; // 平均音量
      
      for (let i = 0; i < Math.min(audioBuffer.numberOfChannels, 2); i++) {
        splitter.connect(gainNode, i);
      }
      gainNode.connect(merger, 0, 0);
    } else {
      // 简单连接第一个声道
      splitter.connect(merger, 0, 0);
    }
    
    merger.connect(offlineContext.destination);
  } else {
    source.connect(offlineContext.destination);
  }
  
  source.start(0);
  
  return await offlineContext.startRendering();
}

/**
 * 检测音频格式
 */
export function detectAudioFormat(blob: Blob): string {
  const type = blob.type.toLowerCase();
  
  if (type.includes('wav')) return 'wav';
  if (type.includes('mp3')) return 'mp3';
  if (type.includes('mp4') || type.includes('m4a')) return 'm4a';
  if (type.includes('flac')) return 'flac';
  if (type.includes('aac')) return 'aac';
  if (type.includes('webm')) return 'webm';
  
  return 'unknown';
}

/**
 * 检查格式是否需要转换（基于百度云支持的格式）
 */
export function needsConversion(format: string): boolean {
  // 百度云实际稳定支持的格式比较有限，建议转换更多格式为wav
  const stableSupportedFormats = ['wav', 'mp3'];
  return !stableSupportedFormats.includes(format);
}

/**
 * 智能音频处理：自动检测格式并转换
 */
export async function processAudioForSpeechRecognition(audioBlob: Blob): Promise<AudioConversionResult> {
  const format = detectAudioFormat(audioBlob);
  console.log('🎤 [AudioProcess] 检测到音频格式:', format);
  
  if (!needsConversion(format)) {
    // 格式已经支持，直接返回
    return {
      blob: audioBlob,
      format,
      duration: 0,
      size: audioBlob.size
    };
  }
  
  // 需要转换，统一转换为wav格式
  console.log('🎤 [AudioProcess] 需要转换格式:', format, '→ wav');
  return await convertAudioToWav(audioBlob);
}