'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useDashboardStore } from '@/store/dashboard-store';
import {
  detectPlatform,
  detectMediaCapabilities,
  getOptimalRecordingConfig,
  isMediaRecordingSupported,
  isFileSelectionSupported,
  PlatformType,
  MediaCapabilities,
} from '@/utils/multimodal-platform-utils';
import {
  ensureMicrophonePermission,
  showPermissionGuide,
  checkMicrophonePermissionStatus
} from '@/utils/microphone-permissions';
import { 
  parseError,
  showError,
  showSuccess,
  showInfo,
  showWarning,
  createError,
  MultimodalErrorType,
  isRetryableError,
} from '@/utils/multimodal-error-handler';
import { SmartAccountingProgressManager } from '@/components/transactions/smart-accounting-dialog';
import { 
  processAudioForSpeechRecognition,
  getBestAudioFormat,
  detectAudioFormat,
  needsConversion,
  convertAudioToWav
} from '@/lib/audio-conversion';
import { 
  MicrophoneIcon, 
  EyeIcon, 
  PhotoIcon,
  StopIcon,
  ArrowPathIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import '@/styles/smart-accounting-dialog.css';

interface EnhancedSmartAccountingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  accountBookId?: string;
}

interface MultimodalAIStatus {
  speech: {
    enabled: boolean;
    provider: string;
    model: string;
    supportedFormats: string[];
    maxFileSize: number;
  };
  vision: {
    enabled: boolean;
    provider: string;
    model: string;
    supportedFormats: string[];
    maxFileSize: number;
  };
  general: {
    enabled: boolean;
    dailyLimit: number;
    userLimit: number;
  };
  smartAccounting: {
    speechEnabled: boolean;
    visionEnabled: boolean;
  };
}

export default function EnhancedSmartAccountingDialog({
  isOpen,
  onClose,
  accountBookId,
}: EnhancedSmartAccountingDialogProps) {
  const router = useRouter();
  const { refreshDashboardData } = useDashboardStore();
  
  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // 多模态功能状态
  const [multimodalStatus, setMultimodalStatus] = useState<MultimodalAIStatus | null>(null);
  const [platform, setPlatform] = useState<PlatformType>(PlatformType.UNKNOWN);
  const [mediaCapabilities, setMediaCapabilities] = useState<MediaCapabilities | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingMultimodal, setIsProcessingMultimodal] = useState(false);
  const [recordingCancelled, setRecordingCancelled] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const [isButtonTouched, setIsButtonTouched] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingCancelledRef = useRef(false);
  const audioChunksRef = useRef<Blob[]>([]);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // 新增：独立的分析状态
  const isAnalyzingRef = useRef(false); // 新增：用于立即检查的ref

  // 更新动画时间用于声波效果
  useEffect(() => {
    let animationFrame: number;
    
    if (isAnalyzing) { // 改为使用isAnalyzing状态
      const updateAnimation = () => {
        setAnimationTime(Date.now());
        animationFrame = requestAnimationFrame(updateAnimation);
      };
      animationFrame = requestAnimationFrame(updateAnimation);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isAnalyzing]); // 依赖改为isAnalyzing

  // 音频分析器设置
  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      
      // 简化设置，确保兼容性
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.1;
      analyser.minDecibels = -100;
      analyser.maxDecibels = 0;
      
      source.connect(analyser);
      
      audioAnalyserRef.current = analyser;
      audioDataRef.current = new Uint8Array(analyser.frequencyBinCount);
      
      // 使用ref立即设置状态，然后更新React状态
      isAnalyzingRef.current = true;
      setIsAnalyzing(true);
      
      // 立即开始分析音频
      analyzeAudio();
      
    } catch (error) {
      console.error('设置音频分析器失败:', error);
    }
  };

  // 分析音频数据
  const analyzeAudio = () => {
    if (!audioAnalyserRef.current || !audioDataRef.current || !isAnalyzingRef.current) {
      return;
    }
    
    audioAnalyserRef.current.getByteFrequencyData(audioDataRef.current);
    
    // 优化的音频强度计算 - 提高敏感度和动态范围
    let sum = 0;
    let max = 0;
    let count = 0;
    
    // 计算所有频率段的平均值和最大值
    for (let i = 0; i < audioDataRef.current.length; i++) {
      const value = audioDataRef.current[i];
      sum += value;
      max = Math.max(max, value);
      if (value > 0) count++;
    }
    
    const average = sum / audioDataRef.current.length;
    
    // 提高敏感度：增加权重，提高增益
    let level = Math.max(average, max * 0.7);
    level = (level / 255) * 100 * 1.2;
    
    // 降低最小阈值，允许更小的声音被检测
    if (level < 1) level = 0;
    
    // 减少平滑处理，让变化更敏感
    const currentLevel = audioLevel;
    const smoothedLevel = currentLevel * 0.7 + level * 0.3;
    
    setAudioLevel(smoothedLevel);
    
    if (isAnalyzingRef.current) {
      animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }
  };

  // 清理音频分析器
  const cleanupAudioAnalyser = () => {
    // 停止分析（使用ref和state都更新）
    isAnalyzingRef.current = false;
    setIsAnalyzing(false);
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    audioAnalyserRef.current = null;
    audioDataRef.current = null;
    setAudioLevel(0);
  };

  // 新增状态：滑动手势检测
  const [gestureType, setGestureType] = useState<'none' | 'cancel' | 'fill-text'>('none');
  const [showGestureHint, setShowGestureHint] = useState(false);
  const gestureTypeRef = useRef<'none' | 'cancel' | 'fill-text'>('none');

  // 初始化多模态状态
  const loadMultimodalStatus = async () => {
    try {
      const response = await apiClient.get('/ai/multimodal/status');
      if (response?.success && response?.data) {
        setMultimodalStatus(response.data);
      }
    } catch (error) {
      console.error('获取多模态AI状态失败:', error);
    }
  };

  // 开始录音（长按开始）
  const startRecording = async () => {
    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    try {
      if (!isMediaRecordingSupported()) {
        showError(createError(
          MultimodalErrorType.PLATFORM_NOT_SUPPORTED,
          '当前设备不支持录音功能'
        ));
        return;
      }

      // 首先请求麦克风权限
      console.log('🎤 开始请求麦克风权限...');
      const permissionResult = await ensureMicrophonePermission();
      
      if (!permissionResult.granted) {
        console.error('🎤 麦克风权限被拒绝:', permissionResult.error);
        
        // 检查当前环境
        const isAndroid = typeof window !== 'undefined' && 
                         (window as any).Capacitor?.getPlatform?.() === 'android';
        
        if (permissionResult.canRetry) {
          showError(createError(
            MultimodalErrorType.PERMISSION_DENIED,
            permissionResult.error || '麦克风权限被拒绝'
          ));
          
          // 如果是Android环境，显示详细的权限指导
          if (isAndroid) {
            setTimeout(() => {
              showPermissionGuide(true);
            }, 2000);
          }
        } else {
          showError(createError(
            MultimodalErrorType.PLATFORM_NOT_SUPPORTED,
            permissionResult.error || '麦克风功能不可用'
          ));
        }
        return;
      }

      console.log('🎤 麦克风权限获取成功，开始录音...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 设置音频分析器
      setupAudioAnalyser(stream);
      
      const chunks: Blob[] = [];
      audioChunksRef.current = chunks;
      
      // 获取最佳音频格式
      const bestFormat = getBestAudioFormat();
      console.log('🎤 [StartRecording] 使用音频格式:', bestFormat);
      
      const recorder = new MediaRecorder(stream, {
        mimeType: bestFormat
      });

      // 添加超时保护
      const recordingTimeout = setTimeout(() => {
        console.log('🎤 [StartRecording] 录音超时，自动停止');
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 60000); // 60秒超时

      recorder.ondataavailable = (event) => {
        console.log('🎤 [MediaRecorder] 数据可用:', event.data.size);
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        console.log('🎤 [MediaRecorder] 录音停止事件触发');
        clearTimeout(recordingTimeout);
        
        // 清理音频分析器
        cleanupAudioAnalyser();
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => {
          console.log('🎤 [MediaRecorder] 停止音频轨道:', track.label);
          track.stop();
        });

        // 确保UI状态更新
        setIsRecording(false);
        setMediaRecorder(null);
        setIsButtonTouched(false);

        // 使用 ref 来检查取消状态，避免闭包问题
        const currentChunks = audioChunksRef.current;
        const currentGestureType = gestureTypeRef.current;
        console.log('🎤 [MediaRecorder] 检查状态:', {
          recordingCancelled: recordingCancelledRef.current,
          chunksLength: currentChunks?.length || 0,
          gestureType: currentGestureType
        });
        
        if (!recordingCancelledRef.current && currentChunks && currentChunks.length > 0) {
          console.log('🎤 [MediaRecorder] 开始语音识别，音频块数:', currentChunks.length, '手势类型:', currentGestureType);
          // 使用第一个音频块的类型作为blob类型，而不是硬编码webm
          const audioBlob = new Blob(currentChunks, { type: currentChunks[0]?.type || 'audio/webm' });
          handleSpeechRecognition(audioBlob, currentGestureType);
        } else {
          console.log('🎤 [MediaRecorder] 跳过语音识别，取消状态:', recordingCancelledRef.current, '音频块数:', currentChunks?.length || 0);
        }
        
        // 在处理完成后重置手势状态
        setTimeout(() => {
          gestureTypeRef.current = 'none';
        }, 100);
      };

      recorder.onerror = (event) => {
        console.error('🎤 [MediaRecorder] 录音错误:', event);
        clearTimeout(recordingTimeout);
        
        // 清理资源
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
        setMediaRecorder(null);
        
        showError(createError(
          MultimodalErrorType.RECORDING_FAILED,
          '录音过程中发生错误'
        ));
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
      setRecordingCancelled(false);
      recordingCancelledRef.current = false;
      
      // 重置手势状态
      setGestureType('none');
      gestureTypeRef.current = 'none';
      setShowGestureHint(false);

      console.log('🎤 [StartRecording] 录音已启动，状态:', recorder.state);
      showInfo('正在录音，松开停止，向上滑动取消');
    } catch (error) {
      console.error('启动录音失败:', error);
      
      // 确保状态重置
      setIsRecording(false);
      setMediaRecorder(null);
      
      showError(error);
    }
  };

  // 停止录音（松开手指）
  const stopRecording = (gestureType: 'none' | 'cancel' | 'fill-text' = 'none') => {
    console.log('🎤 [StopRecording] 调用停止录音，当前状态:', {
      mediaRecorder: mediaRecorder?.state,
      isRecording,
      recordingCancelled,
      gestureType
    });
    
    // 确保手势类型同步到 ref
    gestureTypeRef.current = gestureType;
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🎤 [StopRecording] 正在停止MediaRecorder...');
      mediaRecorder.stop();
    }
    
    // 立即更新UI状态
    setIsRecording(false);
    setMediaRecorder(null);
    setIsButtonTouched(false);
    setTouchStartPos(null);
    
    // 注意：不在这里清理音频分析器，让它在MediaRecorder.onstop中清理
    
    console.log('🎤 [StopRecording] 录音状态已重置');
  };

  // 取消录音
  const cancelRecording = () => {
    console.log('🎤 [CancelRecording] 取消录音');
    setRecordingCancelled(true);
    recordingCancelledRef.current = true;
    
    // 清空音频块数据，确保不会被处理
    audioChunksRef.current = [];
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🎤 [CancelRecording] 停止MediaRecorder...');
      mediaRecorder.stop();
    }
    
    // 立即更新UI状态
    setIsRecording(false);
    setMediaRecorder(null);
    setIsButtonTouched(false);
    setTouchStartPos(null);
    
    // 注意：不在这里清理音频分析器，让它在MediaRecorder.onstop中清理
    
    showInfo('录音已取消');
    
    console.log('🎤 [CancelRecording] 录音已取消，状态已重置');
  };

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('🎤 [TouchStart] 触摸开始');
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsButtonTouched(true);
    startRecording();
  };

  // 处理触摸移动（检测是否要取消）
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos || !isRecording) return;

    const touch = e.touches[0];
    const deltaY = touchStartPos.y - touch.clientY;
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);

    //console.log('🎤 [TouchMove] 触摸移动:', { deltaY, deltaX });

    // 检测手势类型
    if (Math.abs(deltaY) > 30 && deltaX < 50) { // 垂直滑动，水平偏移不超过50px
      if (deltaY > 50) {
        // 向上滑动 - 取消录音
        if (gestureTypeRef.current !== 'cancel') {
          setGestureType('cancel');
          gestureTypeRef.current = 'cancel';
          setShowGestureHint(true);
          console.log('🎤 [TouchMove] 检测到取消手势');
        }
      } else if (deltaY < -50) {
        // 向下滑动 - 填入文本框
        if (gestureTypeRef.current !== 'fill-text') {
          setGestureType('fill-text');
          gestureTypeRef.current = 'fill-text';
          setShowGestureHint(true);
          console.log('🎤 [TouchMove] 检测到填入文本手势');
        }
      }
    } else if (Math.abs(deltaY) < 30) {
      // 没有明显的垂直滑动
      if (gestureTypeRef.current !== 'none') {
        setGestureType('none');
        gestureTypeRef.current = 'none';
        setShowGestureHint(false);
      }
    }
  };

  // 处理触摸结束
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('🎤 [TouchEnd] 触摸结束，当前状态:', { isRecording, recordingCancelled, gestureType });
    
    setIsButtonTouched(false);
    
    if (isRecording && !recordingCancelled) {
      if (gestureType === 'cancel') {
        // 上滑取消录音
        console.log('🎤 [TouchEnd] 执行取消录音');
        cancelRecording();
      } else {
        // 松开停止录音，根据手势类型决定后续操作
        console.log('🎤 [TouchEnd] 正常结束录音，手势类型:', gestureType);
        stopRecording(gestureType);
      }
    } else {
      console.log('🎤 [TouchEnd] 录音已取消或未在录音状态');
    }

    // 重置手势状态
    setGestureType('none');
    // 注意：不要立即重置 gestureTypeRef.current，因为 MediaRecorder.onstop 可能还没有执行
    // gestureTypeRef.current 将在 MediaRecorder.onstop 事件处理完成后重置
    setShowGestureHint(false);
  };

  // 处理鼠标事件（桌面端）
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🎤 [MouseDown] 鼠标按下');
    setTouchStartPos({ x: e.clientX, y: e.clientY });
    setIsButtonTouched(true);
    startRecording();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!touchStartPos || !isRecording) return;

    const deltaY = touchStartPos.y - e.clientY;
    const deltaX = Math.abs(e.clientX - touchStartPos.x);

    console.log('🎤 [MouseMove] 鼠标移动:', { deltaY, deltaX });

    // 检测手势类型（与触摸相同）
    if (Math.abs(deltaY) > 30 && deltaX < 50) { // 垂直移动，水平偏移不超过50px
      if (deltaY > 50) {
        // 向上移动 - 取消录音
        if (gestureTypeRef.current !== 'cancel') {
          setGestureType('cancel');
          gestureTypeRef.current = 'cancel';
          setShowGestureHint(true);
          console.log('🎤 [MouseMove] 检测到取消手势');
        }
      } else if (deltaY < -50) {
        // 向下移动 - 填入文本框
        if (gestureTypeRef.current !== 'fill-text') {
          setGestureType('fill-text');
          gestureTypeRef.current = 'fill-text';
          setShowGestureHint(true);
          console.log('🎤 [MouseMove] 检测到填入文本手势');
        }
      }
    } else if (Math.abs(deltaY) < 30) {
      // 没有明显的垂直移动
      if (gestureTypeRef.current !== 'none') {
        setGestureType('none');
        gestureTypeRef.current = 'none';
        setShowGestureHint(false);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🎤 [MouseUp] 鼠标释放，当前状态:', { isRecording, recordingCancelled, gestureType });
    
    setIsButtonTouched(false);
    
    if (isRecording && !recordingCancelled) {
      if (gestureType === 'cancel') {
        // 上移取消录音
        console.log('🎤 [MouseUp] 执行取消录音');
        cancelRecording();
      } else {
        // 松开停止录音，根据手势类型决定后续操作
        console.log('🎤 [MouseUp] 正常结束录音，手势类型:', gestureType);
        stopRecording(gestureType);
      }
    } else {
      console.log('🎤 [MouseUp] 录音已取消或未在录音状态');
    }

    // 重置手势状态
    setGestureType('none');
    // 注意：不要立即重置 gestureTypeRef.current，因为 MediaRecorder.onstop 可能还没有执行
    // gestureTypeRef.current 将在 MediaRecorder.onstop 事件处理完成后重置
    setShowGestureHint(false);
  };

  // 处理语音识别
  const handleSpeechRecognition = async (audioBlob: Blob, gestureType: 'none' | 'cancel' | 'fill-text') => {
    console.log('🎤 [SpeechRecognition] 开始处理语音识别，手势类型:', gestureType);
    
    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    setIsProcessingMultimodal(true);

    try {
      // 检测音频格式并自动转换
      const audioFormat = detectAudioFormat(audioBlob);
      console.log('🎤 [SpeechRecognition] 检测到音频格式:', audioFormat, '大小:', audioBlob.size);
      
      let processedAudio = audioBlob;
      let fileName = `recording.${audioFormat}`;
      
      // 如果需要转换格式
      if (needsConversion(audioFormat)) {
        console.log('🎤 [SpeechRecognition] 需要转换音频格式');
        //showInfo('正在处理音频格式...');
        
        try {
          const conversionResult = await processAudioForSpeechRecognition(audioBlob);
          processedAudio = conversionResult.blob;
          fileName = `recording.${conversionResult.format}`;
          
          console.log('🎤 [SpeechRecognition] 音频转换完成:', {
            原始大小: audioBlob.size,
            转换后大小: conversionResult.size,
            转换时间: `${conversionResult.duration}ms`,
            格式: `${audioFormat} → ${conversionResult.format}`
          });
          
          //showSuccess(`音频已转换为${conversionResult.format.toUpperCase()}格式`);
        } catch (conversionError) {
          console.error('🎤 [SpeechRecognition] 音频转换失败:', conversionError);
          showError(`音频格式转换失败: ${conversionError instanceof Error ? conversionError.message : '未知错误'}`);
          return;
        }
      } else {
        console.log('🎤 [SpeechRecognition] 音频格式已支持，无需转换');
      }

      const formData = new FormData();
      formData.append('audio', processedAudio, fileName);
      formData.append('accountBookId', accountBookId);

      const response = await apiClient.post('/ai/smart-accounting/speech', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      if (response && response.data && response.data.text) {
        const recognizedText = response.data.text;
        
        // 根据手势类型执行不同操作
        if (gestureType === 'cancel') {
          // 取消录音的情况下，不应该到这里，这里只是保护性代码
          console.log('🎤 [SpeechRecognition] 录音已取消，跳过处理');
          return;
        } else if (gestureType === 'fill-text') {
          // 下滑手势：仅填入文本框，不自动调用记账
          console.log('🎤 [SpeechRecognition] 下滑手势：仅填入文本框');
          setDescription(recognizedText);
          //showSuccess('语音已转换为文字');
          // 注意：这里不调用任何记账逻辑
        } else {
          // 正常松开手势：直接调用记账
          console.log('🎤 [SpeechRecognition] 正常松开手势：直接记账');
          
          // 生成唯一进度ID
          const progressId = `voice-direct-add-${Date.now()}`;
          
          // 获取智能记账进度管理器实例
          const progressManager = SmartAccountingProgressManager.getInstance();
          
          // 显示进度通知并立即关闭模态框
          progressManager.showProgress(progressId, '正在启动智能记账...');
          onClose(); // 立即关闭模态框
          
          // 设置识别的文本到描述框（为了保持一致性）
          setDescription(recognizedText);
          
          // 调用直接添加记账API
          try {
            const response = await apiClient.post(
              `/ai/account/${accountBookId}/smart-accounting/direct`,
              { description: recognizedText },
              { timeout: 60000 }
            );

            if (response && response.id) {
              progressManager.showProgress(progressId, '记账成功', 'success');

              // 刷新仪表盘数据
              if (accountBookId) {
                try {
                  await refreshDashboardData(accountBookId);
                } catch (refreshError) {
                  console.error('刷新仪表盘数据失败:', refreshError);
                }
              }

              // 清空描述
              setDescription('');
            } else {
              progressManager.showProgress(progressId, '记账失败，请手动填写', 'error');
            }
          } catch (error: any) {
            console.error('语音直接记账失败:', error);
            
            let errorMessage = '记账失败，请重试';
            
            if (error.response) {
              const errorData = error.response.data;
              if (error.response.status === 429 && errorData?.type === 'TOKEN_LIMIT_EXCEEDED') {
                errorMessage = `${errorData.error || 'Token使用量已达限额，请稍后再试'}`;
              } else if (errorData?.info && errorData.info.includes('记账无关')) {
                errorMessage = '您的描述似乎与记账无关，请尝试描述具体的消费或收入情况';
              } else {
                errorMessage = `记账失败: ${errorData?.error || errorData?.message || '服务器错误'}`;
              }
            } else if (error.request) {
              errorMessage = '网络连接异常，请检查网络后重试';
            }
            
            progressManager.showProgress(progressId, errorMessage, 'error');
          }
        }
      } else {
        showError(createError(
          MultimodalErrorType.RECOGNITION_FAILED,
          '语音识别失败，请重试'
        ));
      }
    } catch (error: any) {
      console.error('语音识别失败:', error);
      showError(error);
    } finally {
      setIsProcessingMultimodal(false);
    }
  };

  // 处理图片记账
  const handleImageRecording = () => {
    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    if (!isFileSelectionSupported()) {
      showError(createError(
        MultimodalErrorType.PLATFORM_NOT_SUPPORTED,
        '当前设备不支持文件选择功能'
      ));
      return;
    }

    fileInputRef.current?.click();
  };

  // 处理图片选择
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件格式
    if (!file.type.startsWith('image/')) {
      showError(createError(
        MultimodalErrorType.INVALID_FILE_FORMAT,
        '请选择图片文件'
      ));
      return;
    }

    handleImageRecognition(file);
  };

  // 处理图片识别
  const handleImageRecognition = async (imageFile: File) => {
    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    setIsProcessingMultimodal(true);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('accountBookId', accountBookId);

      const response = await apiClient.post('/ai/smart-accounting/vision', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      if (response && response.data && response.data.text) {
        const recognizedText = response.data.text;
        setDescription(recognizedText);
        showSuccess('图片识别成功');

        // 自动调用智能记账
        await handleSmartAccountingWithText(recognizedText);
      } else {
        showError(createError(
          MultimodalErrorType.RECOGNITION_FAILED,
          '图片识别失败，请重试'
        ));
      }
    } catch (error: any) {
      console.error('图片识别失败:', error);
      showError(error);
    } finally {
      setIsProcessingMultimodal(false);
      // 清除文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 使用识别的文本进行智能记账
  const handleSmartAccountingWithText = async (text: string) => {
    try {
      setIsProcessing(true);
      setProcessingStep('正在分析记账信息...');

      const response = await apiClient.post(
        `/ai/account/${accountBookId}/smart-accounting`,
        { description: text },
        { timeout: 60000 }
      );

      if (response) {
        // 将结果存储到sessionStorage，供添加交易页面使用
        sessionStorage.setItem('smartAccountingResult', JSON.stringify(response));
        showSuccess('智能识别成功');
        onClose();
        router.push('/transactions/new');
      } else {
        showError(createError(
          MultimodalErrorType.PROCESSING_ERROR,
          '智能识别失败，请手动填写'
        ));
      }
    } catch (error: any) {
      console.error('智能记账失败:', error);

      if (error.response?.data?.info && error.response.data.info.includes('记账无关')) {
        showInfo('您的描述似乎与记账无关，请尝试描述具体的消费或收入情况');
      } else {
        showError(error);
      }
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
    }
  };

  // 智能记账
  const handleSmartAccounting = async () => {
    if (!description.trim()) {
      toast.error('请输入描述');
      return;
    }

    await handleSmartAccountingWithText(description.trim());
  };

  // 处理直接添加记账
  const handleDirectAdd = async () => {
    if (!description.trim()) {
      toast.error('请输入描述');
      return;
    }

    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    // 生成唯一进度ID
    const progressId = `direct-add-${Date.now()}`;
    
    // 获取智能记账进度管理器实例
    const progressManager = SmartAccountingProgressManager.getInstance();
    
    // 显示进度通知并立即关闭模态框
    progressManager.showProgress(progressId, '正在启动智能记账...');
    onClose(); // 立即关闭模态框

    try {
      // 调用直接添加记账API
      const response = await apiClient.post(
        `/ai/account/${accountBookId}/smart-accounting/direct`,
        { description },
        { timeout: 60000 }
      );

      if (response && response.id) {
        progressManager.showProgress(progressId, '记账成功', 'success');

        // 刷新仪表盘数据
        if (accountBookId) {
          try {
            await refreshDashboardData(accountBookId);
          } catch (refreshError) {
            console.error('刷新仪表盘数据失败:', refreshError);
          }
        }

        setDescription('');
      } else {
        progressManager.showProgress(progressId, '记账失败，请手动填写', 'error');
      }
    } catch (error: any) {
      console.error('直接添加记账失败:', error);

      let errorMessage = '记账失败，请重试';

      if (error.response) {
        const errorData = error.response.data;

        if (error.response.status === 429 && errorData?.type === 'TOKEN_LIMIT_EXCEEDED') {
          errorMessage = `${errorData.error || 'Token使用量已达限额，请稍后再试'}`;
        } else if (errorData?.info && errorData.info.includes('记账无关')) {
          errorMessage = '您的描述似乎与记账无关，请尝试描述具体的消费或收入情况';
        } else {
          errorMessage = `记账失败: ${errorData?.error || errorData?.message || '服务器错误'}`;
        }
      } else if (error.request) {
        errorMessage = '网络连接异常，请检查网络后重试';
      }

      progressManager.showProgress(progressId, errorMessage, 'error');
    }
  };

  // 手动记账
  const handleManualAccounting = () => {
    onClose();
    router.push('/transactions/new');
  };

  // 清除图片选择
  const clearImageSelection = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      // 初始化多模态状态
      loadMultimodalStatus();
      
      // 保存当前滚动位置
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;
      
      // 禁用背景页面滚动 - 更强的方式
      const originalStyle = window.getComputedStyle(document.body);
      const originalOverflow = originalStyle.overflow;
      const originalPosition = originalStyle.position;
      const originalTop = originalStyle.top;
      const originalLeft = originalStyle.left;
      const originalWidth = originalStyle.width;
      const originalHeight = originalStyle.height;
      
      // 应用更强的滚动禁用样式
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = `-${scrollX}px`;
      document.body.style.width = '100vw';
      document.body.style.height = '100vh';
      
      // 添加 CSS 类以确保样式优先级
      document.body.classList.add('modal-open');
      document.documentElement.classList.add('modal-open');
      
      // 同时禁用 html 元素的滚动
      const htmlElement = document.documentElement;
      const htmlOriginalOverflow = htmlElement.style.overflow;
      htmlElement.style.overflow = 'hidden';
      
      // 阻止所有滚动事件
      const preventScroll = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      const preventTouchMove = (e: TouchEvent) => {
        // 只阻止非模态框内的触摸移动
        const modalElement = document.querySelector('.smart-accounting-dialog');
        if (modalElement && !modalElement.contains(e.target as Node)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      const preventWheel = (e: WheelEvent) => {
        // 只阻止非模态框内的滚轮事件
        const modalElement = document.querySelector('.smart-accounting-dialog');
        if (modalElement && !modalElement.contains(e.target as Node)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      };
      
      // 添加事件监听器
      document.addEventListener('scroll', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventTouchMove, { passive: false });
      document.addEventListener('wheel', preventWheel, { passive: false });
      window.addEventListener('scroll', preventScroll, { passive: false });
      
      return () => {
        // 移除事件监听器
        document.removeEventListener('scroll', preventScroll);
        document.removeEventListener('touchmove', preventTouchMove);
        document.removeEventListener('wheel', preventWheel);
        window.removeEventListener('scroll', preventScroll);
        
        // 移除 CSS 类
        document.body.classList.remove('modal-open');
        document.documentElement.classList.remove('modal-open');
        
        // 恢复背景页面滚动
        document.body.style.overflow = originalOverflow;
        document.body.style.position = originalPosition;
        document.body.style.top = originalTop;
        document.body.style.left = originalLeft;
        document.body.style.width = originalWidth;
        document.body.style.height = originalHeight;
        
        // 恢复 html 元素
        htmlElement.style.overflow = htmlOriginalOverflow;
        
        // 恢复滚动位置
        window.scrollTo(scrollX, scrollY);
      };
    }
    
    // 组件卸载时清理资源
    return () => {
      if (isRecording) {
        cleanupAudioAnalyser();
      }
    };
  }, [isOpen, isRecording]);

  if (!isOpen) return null;

  // 处理点击空白处关闭弹窗
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="smart-accounting-dialog-overlay" 
      onClick={handleOverlayClick}
    >
      <div className="smart-accounting-dialog" style={{ position: 'relative' }}>
        <div className="smart-accounting-dialog-header">
          <h3 className="smart-accounting-dialog-title">智能记账</h3>
          <button className="smart-accounting-dialog-close" onClick={onClose}>
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {isProcessing ? (
          <div className="smart-accounting-processing">
            <div className="smart-accounting-loading">
              <div className="spinner"></div>
            </div>
            <p className="smart-accounting-processing-text">{processingStep || '正在处理...'}</p>
          </div>
        ) : (
          <>
            <div className="smart-accounting-dialog-content">
              <p className="smart-accounting-dialog-subtitle">输入一句话，自动识别记账信息</p>

              {/* 文本输入 */}
              <div className="smart-accounting-input-wrapper">
                <textarea
                  className="smart-accounting-textarea"
                  placeholder="例如：昨天在沃尔玛买了日用品，花了128.5元"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  autoFocus
                />
              </div>

              {/* 录音状态提示 - 动态声波效果 */}
              {isRecording && (
                <div className="recording-indicator">
                  <div className="sound-wave-container">
                    <div className="microphone-icon">
                      <i className="fas fa-microphone"></i>
                    </div>
                    <div className="sound-waves">
                      {[...Array(7)].map((_, i) => {
                        // 基础高度
                        const baseHeight = 15;
                        const maxHeight = 60;
                        
                        // 检测阈值
                        const hasAudio = audioLevel > 1;
                        
                        // 提高音量映射敏感度
                        const volumeMultiplier = hasAudio ? 
                          Math.pow(audioLevel / 100, 0.5) * (maxHeight - baseHeight) : 0;
                        
                        // 增加波形动画幅度
                        let waveOffset = 0;
                        if (hasAudio) {
                          const frequency = 0.007 + i * 0.003;
                          const phase = i * Math.PI / 3; 
                          const amplitude = Math.max(1, audioLevel * 0.12);
                          waveOffset = Math.sin(animationTime * frequency + phase) * amplitude;
                        }
                        
                        // 最终高度计算
                        const finalHeight = baseHeight + volumeMultiplier + waveOffset;
                        
                        // 优化颜色阈值，让变化更明显
                        let color = '#6b7280'; // 静默时的灰色
                        if (audioLevel > 30) color = '#ef4444'; // 红色 - 高音量
                        else if (audioLevel > 20) color = '#f59e0b'; // 橙色 - 中高音量  
                        else if (audioLevel > 10) color = '#22c55e'; // 绿色 - 中音量
                        else if (audioLevel > 5) color = '#3b82f6'; // 蓝色 - 低音量
                        else if (audioLevel > 1) color = '#8b5cf6'; // 紫色 - 极低音量
                        
                        // 提高透明度变化敏感度
                        const opacity = hasAudio ? 
                          Math.max(0.7, Math.min(1, 0.7 + audioLevel / 100 * 0.3)) : 0.4;
                        const scale = hasAudio ? 
                          0.9 + (audioLevel / 100) * 0.1 : 0.8;
                        
                        return (
                          <div
                            key={i}
                            className="wave-bar"
                            style={{
                              height: `${finalHeight}px`,
                              backgroundColor: color,
                              opacity: opacity,
                              transform: `scaleY(${scale})`,
                              boxShadow: audioLevel > 15 ? `0 0 6px ${color}60` : 'none',
                              transition: hasAudio ? 'none' : 'all 0.3s ease'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <p className="title">
                    正在录音...
                  </p>
                  {showGestureHint && (
                    <p className="hint gesture-hint">
                      {gestureType === 'cancel' ? '松开取消录音' : 
                       gestureType === 'fill-text' ? '松开填入文本框' : 
                       '松开转换文字并记账'}
                    </p>
                  )}
                  {!showGestureHint && (
                    <p className="default-hint">
                      上滑取消 • 下滑填入文本框 • 松开直接记账
                    </p>
                  )}
                </div>
              )}

              <div className="smart-accounting-buttons">
                <button
                  className="smart-accounting-button identify-button"
                  onClick={handleSmartAccounting}
                  disabled={isProcessing || !description.trim()}
                >
                  智能识别
                </button>

                <button
                  className="smart-accounting-button direct-button"
                  onClick={handleDirectAdd}
                  disabled={!description.trim()}
                >
                  直接添加
                </button>
              </div>

              <div className="smart-accounting-manual-wrapper">
                {/* 隐藏的文件输入 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />

                {/* 底部按钮组：相机 - 手动记账 - 麦克风 */}
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  alignItems: 'center'
                }}>
                  {/* 相机按钮 */}
                  <button
                    type="button"
                    onClick={handleImageRecording}
                    disabled={isProcessing || isProcessingMultimodal}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: 'var(--success-color, #22c55e)',
                      color: 'white',
                      fontSize: '18px',
                      cursor: (isProcessing || isProcessingMultimodal) ? 'not-allowed' : 'pointer',
                      opacity: (isProcessing || isProcessingMultimodal) ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                    title="图片记账"
                  >
                    {isProcessingMultimodal ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-camera"></i>
                    )}
                  </button>

                  {/* 手动记账按钮 */}
                  <button
                    className="smart-accounting-manual-button"
                    onClick={handleManualAccounting}
                    style={{ flex: 1 }}
                  >
                    手动记账
                  </button>

                  {/* 麦克风按钮 */}
                  <button
                    ref={micButtonRef}
                    type="button"
                    disabled={isProcessing || isProcessingMultimodal}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp} // 鼠标离开按钮区域时也停止录音
                    className={`mic-button ${isRecording ? 'recording' : ''} ${isButtonTouched ? 'touched' : ''}`}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: isRecording ? 'var(--error-color, #ef4444)' : 'var(--warning-color, #f59e0b)',
                      color: 'white',
                      fontSize: '18px',
                      cursor: (isProcessing || isProcessingMultimodal) ? 'not-allowed' : 'pointer',
                      opacity: (isProcessing || isProcessingMultimodal) ? 0.6 : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isRecording ? '0 4px 16px rgba(239, 68, 68, 0.4)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transform: isRecording ? 'scale(1.1)' : (isButtonTouched ? 'scale(1.05)' : 'scale(1)'),
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    title={isRecording ? '松开停止录音，向上滑动取消' : '长按开始语音记账'}
                  >
                    {/* 背景呼吸效果 */}
                    {isRecording && (
                      <div
                        className="breathing-effect"
                        style={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '100%',
                          height: '100%',
                          borderRadius: '12px',
                          background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                          animation: 'breathe 2s ease-in-out infinite'
                        }}
                      />
                    )}
                    
                    {/* 音频可视化 */}
                    {isRecording && (
                      <div
                        className="audio-visualizer"
                        style={{
                          position: 'absolute',
                          bottom: '2px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          width: '80%',
                          height: '4px',
                          backgroundColor: 'rgba(255,255,255,0.3)',
                          borderRadius: '2px',
                          overflow: 'hidden'
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.max(5, audioLevel)}%`,
                            height: '100%',
                            backgroundColor: 'white',
                            borderRadius: '2px',
                            transition: 'width 0.1s ease'
                          }}
                        />
                      </div>
                    )}
                    
                    {/* 图标 */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {isProcessingMultimodal ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : isRecording ? (
                        <i className="fas fa-stop"></i>
                      ) : (
                        <i className="fas fa-microphone"></i>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
