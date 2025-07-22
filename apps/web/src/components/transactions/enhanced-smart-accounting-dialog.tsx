'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useDashboardStore } from '@/store/dashboard-store';
import { useAccountingPointsStore } from '@/store/accounting-points-store';
import { useSystemConfig } from '@/hooks/useSystemConfig';
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
  checkMicrophonePermissionStatus,
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
  convertAudioToWav,
} from '@/lib/audio-conversion';
import { platformFilePicker } from '@/lib/platform-file-picker';
import {
  MicrophoneIcon,
  EyeIcon,
  PhotoIcon,
  StopIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import {
  RecordingState,
  RecordingStateManager,
  createRecordingStateManager,
  canStartRecording,
  isRecording as isRecordingState,
  isProcessing,
  RecordingErrorType,
  RECORDING_STATE_LABELS,
  RECORDING_STATE_ICONS,
  RECORDING_STATE_COLORS,
} from '@/types/recording-state';
import { recordingHaptics, triggerHapticFeedback, HapticType } from '@/utils/haptic-feedback';
import { useModalBackHandler } from '@/hooks/use-mobile-back-handler';
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
  const { balance, fetchBalance } = useAccountingPointsStore();
  const { config, loading: configLoading } = useSystemConfig();

  const [description, setDescription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  // 多模态功能状态
  const [multimodalStatus, setMultimodalStatus] = useState<MultimodalAIStatus | null>(null);
  const [platform, setPlatform] = useState<PlatformType>(PlatformType.UNKNOWN);
  const [mediaCapabilities, setMediaCapabilities] = useState<MediaCapabilities | null>(null);
  // 新的录音状态管理
  const recordingStateManagerRef = useRef<RecordingStateManager>(createRecordingStateManager());
  const [recordingState, setRecordingState] = useState<RecordingState>(RecordingState.IDLE);
  const [recordingStateData, setRecordingStateData] = useState(
    recordingStateManagerRef.current.stateData,
  );

  // 保留的状态（用于兼容性）
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessingMultimodal, setIsProcessingMultimodal] = useState(false);
  const [touchStartPos, setTouchStartPos] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const micButtonRef = useRef<HTMLButtonElement>(null);
  const [isButtonTouched, setIsButtonTouched] = useState(false);
  const [cameraGestureType, setCameraGestureType] = useState<'none' | 'capture' | 'upload'>('none');
  const [isCameraButtonTouched, setIsCameraButtonTouched] = useState(false);
  const [cameraTouchStartPos, setCameraTouchStartPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [audioLevel, setAudioLevel] = useState(0);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioDataRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recordingCancelledRef = useRef(false);
  const audioChunksRef = useRef<Blob[]>([]);
  const [animationTime, setAnimationTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false); // 新增：独立的分析状态
  const isAnalyzingRef = useRef(false); // 新增：用于立即检查的ref
  const isRecordingRef = useRef(false); // 添加录音状态的ref

  // 移动端后退处理
  const { handleBack } = useModalBackHandler('smart-accounting-dialog', onClose);

  // 安全的震动反馈调用
  const safeHapticFeedback = (type: keyof typeof recordingHaptics) => {
    console.log('🔊 [SafeHaptic] 尝试执行震动反馈:', type);
    try {
      if (recordingHaptics && typeof recordingHaptics[type] === 'function') {
        console.log('🔊 [SafeHaptic] 震动反馈方法可用，开始执行');
        recordingHaptics[type]();
        console.log('🔊 [SafeHaptic] 震动反馈执行完成');
      } else {
        console.warn('🔊 [SafeHaptic] 震动反馈方法不可用:', type, {
          recordingHaptics: !!recordingHaptics,
          methodType: typeof recordingHaptics?.[type],
        });
      }
    } catch (error) {
      console.error('🔊 [SafeHaptic] 震动反馈执行失败:', error);
    }
  };

  // 录音状态管理器监听器
  useEffect(() => {
    const stateManager = recordingStateManagerRef.current;

    const unsubscribe = stateManager.onStateChange((stateData) => {
      console.log('🎤 [RecordingState] 状态变化:', stateData);
      setRecordingState(stateData.state);
      setRecordingStateData(stateData);

      // 更新音频电平
      if (stateData.audioLevel !== undefined) {
        setAudioLevel(stateData.audioLevel);
      }
    });

    return unsubscribe;
  }, []);

  // 更新动画时间用于声波效果
  useEffect(() => {
    let animationFrame: number;

    if (isAnalyzing) {
      // 改为使用isAnalyzing状态
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

  // 记账点检查工具函数
  const checkAccountingPoints = (type: 'text' | 'voice' | 'image'): boolean => {
    // 如果配置正在加载，不允许操作
    if (configLoading) {
      showError('系统配置加载中，请稍候重试');
      return false;
    }

    // 如果记账点系统未启用，直接允许使用
    if (!config.accountingPointsEnabled) {
      return true;
    }

    if (!balance) {
      showError('记账点余额获取失败，请刷新页面重试');
      return false;
    }

    const pointCosts = { text: 1, voice: 2, image: 3 };
    const required = pointCosts[type];
    const totalBalance = balance.totalBalance;

    if (totalBalance < required) {
      const typeNames = { text: '文字记账', voice: '语音记账', image: '图片记账' };
      showError(
        `记账点余额不足，${typeNames[type]}需要${required}点，当前余额${totalBalance}点。请进行签到获取记账点或开通捐赠会员。`,
      );
      return false;
    }

    return true;
  };

  // 检查按钮是否应该被禁用（基于记账点系统状态）
  const isButtonDisabled = (
    type: 'text' | 'voice' | 'image',
    additionalConditions = false,
  ): boolean => {
    // 如果配置正在加载，禁用按钮
    if (configLoading) {
      return true;
    }

    // 如果没有账本ID，禁用按钮
    if (!accountBookId) {
      return true;
    }

    if (!config.accountingPointsEnabled) {
      return additionalConditions; // 如果记账点系统未启用，只检查其他条件
    }

    const pointCosts = { text: 1, voice: 2, image: 3 };
    const required = pointCosts[type];
    const hasInsufficientBalance = !balance || balance.totalBalance < required;

    return additionalConditions || hasInsufficientBalance;
  };

  // 获取按钮的提示文本
  const getButtonTitle = (type: 'text' | 'voice' | 'image'): string => {
    // 如果配置正在加载
    if (configLoading) {
      return '系统配置加载中...';
    }

    // 如果没有账本ID
    if (!accountBookId) {
      return '请先选择账本';
    }

    if (!config.accountingPointsEnabled) {
      return ''; // 如果记账点系统未启用，不显示余额相关提示
    }

    const pointCosts = { text: 1, voice: 2, image: 3 };
    const required = pointCosts[type];
    const hasInsufficientBalance = !balance || balance.totalBalance < required;

    if (hasInsufficientBalance) {
      const typeNames = { text: '文字记账', voice: '语音记账', image: '图片记账' };
      return `记账点余额不足，${typeNames[type]}需要${required}点`;
    }

    return '';
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
    const stateManager = recordingStateManagerRef.current;

    // 检查是否可以开始录音
    if (!canStartRecording(stateManager.currentState)) {
      console.warn('🎤 [StartRecording] 当前状态不允许开始录音:', stateManager.currentState);
      return;
    }

    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    // 检查记账点余额
    if (!checkAccountingPoints('voice')) {
      return;
    }

    // 立即触发震动反馈和UI状态更新
    safeHapticFeedback('start');
    stateManager.transition(RecordingState.PREPARING);

    try {
      if (!isMediaRecordingSupported()) {
        stateManager.setError(RecordingErrorType.DEVICE_NOT_FOUND);
        showError(
          createError(MultimodalErrorType.PLATFORM_NOT_SUPPORTED, '当前设备不支持录音功能'),
        );
        return;
      }

      // 异步请求麦克风权限
      console.log('🎤 开始请求麦克风权限...');
      const permissionResult = await ensureMicrophonePermission();

      if (!permissionResult.granted) {
        console.error('🎤 麦克风权限被拒绝:', permissionResult.error);

        // 设置错误状态
        stateManager.setError(RecordingErrorType.PERMISSION_DENIED);
        safeHapticFeedback('error');

        // 检查当前环境
        const isAndroid =
          typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform?.() === 'android';

        if (permissionResult.canRetry) {
          showError(
            createError(
              MultimodalErrorType.PERMISSION_DENIED,
              permissionResult.error || '麦克风权限被拒绝',
            ),
          );

          // 如果是Android环境，显示详细的权限指导
          if (isAndroid) {
            setTimeout(() => {
              showPermissionGuide(true);
            }, 2000);
          }
        } else {
          showError(
            createError(
              MultimodalErrorType.PLATFORM_NOT_SUPPORTED,
              permissionResult.error || '麦克风功能不可用',
            ),
          );
        }

        // 延迟重置状态，让用户看到错误状态
        setTimeout(() => stateManager.reset(), 2000);
        return;
      }

      console.log('🎤 麦克风权限获取成功，开始初始化设备...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // 设置音频分析器
      setupAudioAnalyser(stream);

      const chunks: Blob[] = [];
      audioChunksRef.current = chunks;

      // 获取最佳音频格式
      const bestFormat = getBestAudioFormat();
      console.log('🎤 [StartRecording] 使用音频格式:', bestFormat);

      const recorder = new MediaRecorder(stream, {
        mimeType: bestFormat,
      });

      // 设备初始化完成，转换到录音状态
      stateManager.transition(RecordingState.RECORDING);
      safeHapticFeedback('start'); // 录音开始的震动反馈

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
        stream.getTracks().forEach((track) => {
          console.log('🎤 [MediaRecorder] 停止音频轨道:', track.label);
          track.stop();
        });

        // 更新状态管理器
        const currentChunks = audioChunksRef.current;
        const currentGestureType = gestureTypeRef.current;

        console.log('🎤 [MediaRecorder] 检查状态:', {
          recordingCancelled: recordingCancelledRef.current,
          chunksLength: currentChunks?.length || 0,
          gestureType: currentGestureType,
        });

        // 清理UI状态
        setMediaRecorder(null);
        setIsButtonTouched(false);

        if (recordingCancelledRef.current) {
          // 录音被取消
          stateManager.transition(RecordingState.CANCELLED);
          safeHapticFeedback('cancel');
          setTimeout(() => stateManager.reset(), 1500);
        } else if (currentChunks && currentChunks.length > 0) {
          // 录音完成，开始处理
          stateManager.transition(RecordingState.PROCESSING);
          safeHapticFeedback('stop');

          console.log(
            '🎤 [MediaRecorder] 开始语音识别，音频块数:',
            currentChunks.length,
            '手势类型:',
            currentGestureType,
          );
          const audioBlob = new Blob(currentChunks, {
            type: currentChunks[0]?.type || 'audio/webm',
          });
          handleSpeechRecognition(audioBlob, currentGestureType);
        } else {
          // 没有录音数据
          stateManager.setError(RecordingErrorType.RECORDING_FAILED);
          safeHapticFeedback('error');
          setTimeout(() => stateManager.reset(), 2000);
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
        stream.getTracks().forEach((track) => track.stop());
        setMediaRecorder(null);

        // 设置错误状态
        stateManager.setError(RecordingErrorType.RECORDING_FAILED);
        safeHapticFeedback('error');

        showError(createError(MultimodalErrorType.RECORDING_FAILED, '录音过程中发生错误'));

        // 延迟重置状态
        setTimeout(() => stateManager.reset(), 2000);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      isRecordingRef.current = true; // 同步更新ref
      recordingCancelledRef.current = false;

      // 重置手势状态
      setGestureType('none');
      gestureTypeRef.current = 'none';
      setShowGestureHint(true); // 显示提示，让用户知道当前状态

      console.log('🎤 [StartRecording] 录音已启动，状态:', recorder.state);
      showInfo('正在录音，松开停止，向上滑动取消');
    } catch (error) {
      console.error('启动录音失败:', error);

      // 设置错误状态
      stateManager.setError(RecordingErrorType.INITIALIZATION_FAILED);
      safeHapticFeedback('error');

      // 确保状态重置
      setMediaRecorder(null);

      showError(error);

      // 延迟重置状态
      setTimeout(() => stateManager.reset(), 2000);
    }
  };

  // 停止录音（松开手指）
  const stopRecording = (gestureType: 'none' | 'cancel' | 'fill-text' = 'none') => {
    console.log('🎤 [StopRecording] 调用停止录音，当前状态:', {
      mediaRecorder: mediaRecorder?.state,
      recordingState,
      recordingCancelled: recordingCancelledRef.current,
      gestureType,
    });

    // 确保手势类型同步到 ref
    gestureTypeRef.current = gestureType;

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🎤 [StopRecording] 正在停止MediaRecorder...');
      mediaRecorder.stop();
    }

    // 立即更新UI状态
    isRecordingRef.current = false; // 同步更新ref
    setMediaRecorder(null);
    setIsButtonTouched(false);
    setTouchStartPos(null);

    // 注意：不在这里清理音频分析器，让它在MediaRecorder.onstop中清理
    // 状态管理器会在MediaRecorder.onstop中处理状态转换

    console.log('🎤 [StopRecording] 录音状态已重置');
  };

  // 取消录音
  const cancelRecording = () => {
    console.log('🎤 [CancelRecording] 取消录音');
    recordingCancelledRef.current = true;

    // 清空音频块数据，确保不会被处理
    audioChunksRef.current = [];

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🎤 [CancelRecording] 停止MediaRecorder...');
      mediaRecorder.stop();
    }

    // 立即更新UI状态
    isRecordingRef.current = false; // 同步更新ref
    setMediaRecorder(null);
    setIsButtonTouched(false);
    setTouchStartPos(null);

    // 注意：不在这里清理音频分析器，让它在MediaRecorder.onstop中清理
    // 状态管理器会在MediaRecorder.onstop中处理取消状态

    showInfo('录音已取消');

    console.log('🎤 [CancelRecording] 录音已取消，状态已重置');
  };

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    // 不调用 preventDefault() 来避免 passive event listener 错误
    console.log('🎤 [TouchStart] 触摸开始');

    // 立即触发触觉反馈
    safeHapticFeedback('touch');

    const touch = e.touches[0];
    const startPos = { x: touch.clientX, y: touch.clientY };
    setTouchStartPos(startPos);
    setIsButtonTouched(true);
    setGestureType('none');
    setShowGestureHint(true); // 立即显示提示，让用户知道当前状态

    // 添加原生事件监听器来监听触摸移动
    const handleNativeTouchMove = (nativeEvent: TouchEvent) => {
      console.log('🎤 [NativeTouchMove] 原生触摸移动事件触发');

      if (!startPos || !isRecordingRef.current) {
        console.log('🎤 [NativeTouchMove] 早期返回:', {
          startPos: startPos ? 'exists' : 'null',
          isRecordingRef: isRecordingRef.current,
        });
        return;
      }

      const nativeTouch = nativeEvent.touches[0];
      const deltaY = startPos.y - nativeTouch.clientY;
      const deltaX = Math.abs(nativeTouch.clientX - startPos.x);

      console.log('🎤 [NativeTouchMove] 原生触摸移动:', {
        deltaY,
        deltaX,
        gestureType: gestureTypeRef.current,
      });

      // 检测手势类型 - 优化阈值，使检测更敏感且准确
      if (deltaX < 60) {
        // 水平偏移不超过60px
        if (deltaY > 15) {
          // 向上滑动 - 取消录音
          if (gestureTypeRef.current !== 'cancel') {
            setGestureType('cancel');
            gestureTypeRef.current = 'cancel';
            setShowGestureHint(true);
            console.log('🎤 [NativeTouchMove] 检测到取消手势');
          }
        } else if (deltaY < -15) {
          // 向下滑动 - 填入文本框
          if (gestureTypeRef.current !== 'fill-text') {
            setGestureType('fill-text');
            gestureTypeRef.current = 'fill-text';
            setShowGestureHint(true);
            console.log('🎤 [NativeTouchMove] 检测到填入文本手势');
          }
        } else if (Math.abs(deltaY) < 10) {
          // 没有明显的垂直滑动 - 直接记账
          if (gestureTypeRef.current !== 'none') {
            setGestureType('none');
            gestureTypeRef.current = 'none';
            setShowGestureHint(true);
            console.log('🎤 [NativeTouchMove] 重置为直接记账手势');
          }
        }
      }
    };

    const handleNativeTouchEnd = () => {
      console.log('🎤 [NativeTouchEnd] 原生触摸结束');
      // 移除事件监听器
      document.removeEventListener('touchmove', handleNativeTouchMove);
      document.removeEventListener('touchend', handleNativeTouchEnd);
    };

    // 添加原生事件监听器
    document.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    document.addEventListener('touchend', handleNativeTouchEnd, { passive: false });

    startRecording();
  };

  // 处理触摸移动（检测是否要取消）
  const handleTouchMove = (e: React.TouchEvent) => {
    console.log('🎤 [TouchMove] 触摸移动事件触发');

    if (!touchStartPos || !isRecordingState(recordingState)) {
      console.log('🎤 [TouchMove] 早期返回:', { touchStartPos, recordingState });
      return;
    }

    // 不调用 preventDefault() 来避免 passive event listener 错误
    const touch = e.touches[0];
    const deltaY = touchStartPos.y - touch.clientY;
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);

    console.log('🎤 [TouchMove] 触摸移动:', {
      deltaY,
      deltaX,
      gestureType: gestureTypeRef.current,
    });

    // 检测手势类型 - 优化阈值，使检测更敏感且准确
    if (deltaX < 60) {
      // 水平偏移不超过60px
      if (deltaY > 15) {
        // 向上滑动 - 取消录音
        if (gestureTypeRef.current !== 'cancel') {
          setGestureType('cancel');
          gestureTypeRef.current = 'cancel';
          setShowGestureHint(true);
          console.log('🎤 [TouchMove] 检测到取消手势');
        }
      } else if (deltaY < -15) {
        // 向下滑动 - 填入文本框
        if (gestureTypeRef.current !== 'fill-text') {
          setGestureType('fill-text');
          gestureTypeRef.current = 'fill-text';
          setShowGestureHint(true);
          console.log('🎤 [TouchMove] 检测到填入文本手势');
        }
      } else if (Math.abs(deltaY) < 10) {
        // 没有明显的垂直滑动 - 直接记账
        if (gestureTypeRef.current !== 'none') {
          setGestureType('none');
          gestureTypeRef.current = 'none';
          setShowGestureHint(true); // 显示提示以便用户知道当前状态
          console.log('🎤 [TouchMove] 重置为直接记账手势');
        }
      }
    }
  };

  // 处理触摸结束
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('🎤 [TouchEnd] 触摸结束，当前状态:', {
      recordingState,
      recordingCancelled: recordingCancelledRef.current,
      gestureType,
    });

    setIsButtonTouched(false);

    if (isRecordingState(recordingState) && !recordingCancelledRef.current) {
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

    // 立即触发触觉反馈
    safeHapticFeedback('touch');

    setTouchStartPos({ x: e.clientX, y: e.clientY });
    setIsButtonTouched(true);
    setGestureType('none');
    setShowGestureHint(true); // 立即显示提示
    startRecording();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!touchStartPos || !isRecordingState(recordingState)) return;

    const deltaY = touchStartPos.y - e.clientY;
    const deltaX = Math.abs(e.clientX - touchStartPos.x);

    console.log('🎤 [MouseMove] 鼠标移动:', { deltaY, deltaX });

    // 检测手势类型（与触摸相同）- 优化阈值，使检测更敏感且准确
    if (deltaX < 60) {
      // 水平偏移不超过60px
      if (deltaY > 15) {
        // 向上移动 - 取消录音
        if (gestureTypeRef.current !== 'cancel') {
          setGestureType('cancel');
          gestureTypeRef.current = 'cancel';
          setShowGestureHint(true);
          console.log('🎤 [MouseMove] 检测到取消手势');
        }
      } else if (deltaY < -15) {
        // 向下移动 - 填入文本框
        if (gestureTypeRef.current !== 'fill-text') {
          setGestureType('fill-text');
          gestureTypeRef.current = 'fill-text';
          setShowGestureHint(true);
          console.log('🎤 [MouseMove] 检测到填入文本手势');
        }
      } else if (Math.abs(deltaY) < 10) {
        // 没有明显的垂直移动
        if (gestureTypeRef.current !== 'none') {
          setGestureType('none');
          gestureTypeRef.current = 'none';
          setShowGestureHint(true);
        }
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🎤 [MouseUp] 鼠标释放，当前状态:', {
      recordingState,
      recordingCancelled: recordingCancelledRef.current,
      gestureType,
    });

    setIsButtonTouched(false);

    if (isRecordingState(recordingState) && !recordingCancelledRef.current) {
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
  const handleSpeechRecognition = async (
    audioBlob: Blob,
    gestureType: 'none' | 'cancel' | 'fill-text',
  ) => {
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
            格式: `${audioFormat} → ${conversionResult.format}`,
          });

          //showSuccess(`音频已转换为${conversionResult.format.toUpperCase()}格式`);
        } catch (conversionError) {
          console.error('🎤 [SpeechRecognition] 音频转换失败:', conversionError);
          showError(
            `音频格式转换失败: ${conversionError instanceof Error ? conversionError.message : '未知错误'}`,
          );
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
              { timeout: 60000 },
            );

            if (response && (response.id || (response.transactions && response.count > 0))) {
              const successMessage = response.id 
                ? '记账成功' 
                : `记账成功，已创建${response.count}条记录`;
              progressManager.showProgress(progressId, successMessage, 'success');

              // 更新录音状态为完成
              const stateManager = recordingStateManagerRef.current;
              stateManager.transition(RecordingState.COMPLETED);
              safeHapticFeedback('success');

              // 刷新仪表盘数据
              if (accountBookId) {
                try {
                  await refreshDashboardData(accountBookId);
                  // 刷新记账点余额
                  await fetchBalance();
                } catch (refreshError) {
                  console.error('刷新仪表盘数据失败:', refreshError);
                }
              }

              // 清空描述
              setDescription('');

              // 延迟重置状态
              setTimeout(() => stateManager.reset(), 2000);
            } else {
              progressManager.showProgress(progressId, '记账失败，请手动填写', 'error');

              // 设置错误状态
              const stateManager = recordingStateManagerRef.current;
              stateManager.setError(RecordingErrorType.PROCESSING_FAILED);
              safeHapticFeedback('error');
              setTimeout(() => stateManager.reset(), 2000);
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

            // 设置错误状态
            const stateManager = recordingStateManagerRef.current;
            stateManager.setError(RecordingErrorType.PROCESSING_FAILED);
            safeHapticFeedback('error');
            setTimeout(() => stateManager.reset(), 2000);
          }
        }
      } else {
        // 语音识别失败
        const stateManager = recordingStateManagerRef.current;
        stateManager.setError(RecordingErrorType.PROCESSING_FAILED);
        safeHapticFeedback('error');

        showError(createError(MultimodalErrorType.RECOGNITION_FAILED, '语音识别失败，请重试'));

        setTimeout(() => stateManager.reset(), 2000);
      }
    } catch (error: any) {
      console.error('语音识别失败:', error);

      // 设置错误状态
      const stateManager = recordingStateManagerRef.current;
      stateManager.setError(RecordingErrorType.PROCESSING_FAILED);
      safeHapticFeedback('error');

      showError(error);
      setTimeout(() => stateManager.reset(), 2000);
    } finally {
      setIsProcessingMultimodal(false);
    }
  };

  // 处理图片记账
  const handleImageRecording = async () => {
    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    // 检查记账点余额
    if (!checkAccountingPoints('image')) {
      return;
    }

    try {
      console.log('🖼️ [ImageRecording] 开始调用Capacitor相册...');

      // 使用 platformFilePicker 来选择相册图片
      const result = await platformFilePicker.pickFromGallery({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result && result.file) {
        console.log('🖼️ [ImageRecording] 相册选择成功:', result.source);
        safeHapticFeedback('success'); // 选择成功震动
        handleImageRecognition(result.file);
      } else {
        console.log('🖼️ [ImageRecording] 用户取消选择');
      }
    } catch (error) {
      console.error('🖼️ [ImageRecording] 相册选择失败:', error);

      let errorMessage = '相册功能不可用';
      if (error instanceof Error) {
        if (error.message.includes('权限')) {
          errorMessage = '需要相册权限才能选择图片，请在设置中允许访问相册';
        } else if (error.message.includes('不支持')) {
          errorMessage = '当前设备不支持相册功能';
        } else {
          errorMessage = error.message;
        }
      }

      safeHapticFeedback('error'); // 错误震动
      showError(createError(MultimodalErrorType.PLATFORM_NOT_SUPPORTED, errorMessage));
    }
  };

  // 相机拍照
  const handleCameraCapture = async () => {
    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    // 检查记账点余额
    if (!checkAccountingPoints('image')) {
      return;
    }

    try {
      console.log('📷 [CameraCapture] 开始调用Capacitor相机...');

      // 使用 platformFilePicker 来调用相机
      const result = await platformFilePicker.takePhoto({
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (result && result.file) {
        console.log('📷 [CameraCapture] 拍照成功:', result.source);
        safeHapticFeedback('success'); // 拍照成功震动
        handleImageRecognition(result.file);
      } else {
        console.log('📷 [CameraCapture] 用户取消拍照');
      }
    } catch (error) {
      console.error('📷 [CameraCapture] 拍照失败:', error);

      let errorMessage = '相机功能不可用';
      if (error instanceof Error) {
        if (error.message.includes('权限')) {
          errorMessage = '需要相机权限才能拍照，请在设置中允许访问相机';
        } else if (error.message.includes('不支持')) {
          errorMessage = '当前设备不支持相机功能';
        } else {
          errorMessage = error.message;
        }
      }

      safeHapticFeedback('error'); // 错误震动
      showError(createError(MultimodalErrorType.PLATFORM_NOT_SUPPORTED, errorMessage));
    }
  };

  // 相机按钮手势处理
  const handleCameraTouchStart = (e: React.TouchEvent) => {
    // 不调用 preventDefault() 来避免 passive event listener 错误
    e.stopPropagation();
    console.log('📷 [TouchStart] 相机按钮触摸开始');

    // 立即触发触觉反馈
    safeHapticFeedback('touch');

    const touch = e.touches[0];
    setCameraTouchStartPos({ x: touch.clientX, y: touch.clientY });
    setIsCameraButtonTouched(true);
    setCameraGestureType('none');
  };

  const handleCameraTouchMove = (e: React.TouchEvent) => {
    if (!cameraTouchStartPos || !isCameraButtonTouched) return;

    // 不调用 preventDefault() 来避免 passive event listener 错误
    const touch = e.touches[0];
    const deltaY = cameraTouchStartPos.y - touch.clientY;
    const deltaX = Math.abs(touch.clientX - cameraTouchStartPos.x);

    // 检测手势类型
    if (Math.abs(deltaY) > 30 && deltaX < 50) {
      // 垂直滑动，水平偏移不超过50px
      if (deltaY > 50) {
        // 向上滑动 - 拍照
        setCameraGestureType('capture');
      } else if (deltaY < -50) {
        // 向下滑动 - 上传
        setCameraGestureType('upload');
      }
    } else {
      setCameraGestureType('none');
    }
  };

  const handleCameraTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📷 [TouchEnd] 相机按钮触摸结束，手势类型:', cameraGestureType);

    setIsCameraButtonTouched(false);

    // 根据手势类型执行对应操作并提供震动反馈
    if (cameraGestureType === 'capture') {
      safeHapticFeedback('start'); // 拍照震动
      handleCameraCapture();
    } else if (cameraGestureType === 'upload') {
      safeHapticFeedback('start'); // 上传震动
      handleImageRecording();
    }
    // 如果是 'none'，则不执行任何操作（原地松开）

    // 重置状态
    setCameraTouchStartPos(null);
    setCameraGestureType('none');
  };

  // 鼠标事件处理（用于桌面端测试）
  const handleCameraMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📷 [MouseDown] 相机按钮鼠标按下');

    // 立即触发触觉反馈
    safeHapticFeedback('touch');

    setCameraTouchStartPos({ x: e.clientX, y: e.clientY });
    setIsCameraButtonTouched(true);
    setCameraGestureType('none');
  };

  const handleCameraMouseMove = (e: React.MouseEvent) => {
    if (!cameraTouchStartPos || !isCameraButtonTouched) return;
    e.preventDefault();

    const deltaY = cameraTouchStartPos.y - e.clientY;
    const deltaX = Math.abs(e.clientX - cameraTouchStartPos.x);

    // 检测手势类型
    if (Math.abs(deltaY) > 30 && deltaX < 50) {
      if (deltaY > 50) {
        setCameraGestureType('capture');
      } else if (deltaY < -50) {
        setCameraGestureType('upload');
      }
    } else {
      setCameraGestureType('none');
    }
  };

  const handleCameraMouseUp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('📷 [MouseUp] 相机按钮鼠标抬起，手势类型:', cameraGestureType);

    setIsCameraButtonTouched(false);

    // 根据手势类型执行对应操作并提供震动反馈
    if (cameraGestureType === 'capture') {
      safeHapticFeedback('start'); // 拍照震动
      handleCameraCapture();
    } else if (cameraGestureType === 'upload') {
      safeHapticFeedback('start'); // 上传震动
      handleImageRecording();
    }

    // 重置状态
    setCameraTouchStartPos(null);
    setCameraGestureType('none');
  };

  const handleCameraMouseLeave = () => {
    console.log('📷 [MouseLeave] 鼠标离开相机按钮');
    // 鼠标离开时重置所有状态
    setIsCameraButtonTouched(false);
    setCameraTouchStartPos(null);
    setCameraGestureType('none');
  };

  // 处理图片选择
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 验证文件格式
    if (!file.type.startsWith('image/')) {
      showError(createError(MultimodalErrorType.INVALID_FILE_FORMAT, '请选择图片文件'));
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
        console.log('🖼️ [ImageRecognition] 图片识别成功，开始直接记账');

        // 生成唯一进度ID
        const progressId = `image-direct-add-${Date.now()}`;

        // 获取智能记账进度管理器实例
        const progressManager = SmartAccountingProgressManager.getInstance();

        // 显示进度通知并立即关闭模态框
        progressManager.showProgress(progressId, '正在启动智能记账...');
        onClose(); // 立即关闭模态框

        // 设置识别的文本到描述框（为了保持一致性）
        setDescription(recognizedText);

        // 调用直接添加记账API（与语音记账相同的逻辑）
        try {
          const requestBody: any = { description: recognizedText };
          
          // 如果有文件信息，添加附件文件ID
          if (response.data?.fileInfo?.id) {
            requestBody.attachmentFileId = response.data.fileInfo.id;
            console.log('🖼️ [ImageRecognition] 添加附件文件ID:', response.data.fileInfo.id);
          }
          
          const directAddResponse = await apiClient.post(
            `/ai/account/${accountBookId}/smart-accounting/direct`,
            requestBody,
            { timeout: 60000 },
          );

          if (directAddResponse && (directAddResponse.id || (directAddResponse.transactions && directAddResponse.count > 0))) {
            const successMessage = directAddResponse.id 
              ? '记账成功' 
              : `记账成功，已创建${directAddResponse.count}条记录`;
            progressManager.showProgress(progressId, successMessage, 'success');

            // 刷新仪表盘数据
            if (accountBookId) {
              try {
                await refreshDashboardData(accountBookId);
                // 刷新记账点余额
                await fetchBalance();
              } catch (refreshError) {
                console.error('刷新仪表盘数据失败:', refreshError);
              }
            }

            // 清空描述
            setDescription('');
          } else {
            progressManager.showProgress(progressId, '记账失败，请手动填写', 'error');
          }
        } catch (directAddError: any) {
          console.error('图片记账直接添加失败:', directAddError);

          // 处理特定错误类型
          if (directAddError.response?.status === 402) {
            progressManager.showProgress(progressId, '记账点余额不足', 'error');
          } else if (
            directAddError.response?.data?.info &&
            directAddError.response.data.info.includes('记账无关')
          ) {
            progressManager.showProgress(progressId, '图片内容与记账无关，请重试', 'error');
          } else {
            progressManager.showProgress(progressId, '记账失败，请手动填写', 'error');
          }
        }
      } else {
        showError(createError(MultimodalErrorType.RECOGNITION_FAILED, '图片识别失败，请重试'));
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
        { timeout: 60000 },
      );

      if (response) {
        // 将结果存储到sessionStorage，供添加记账页面使用
        sessionStorage.setItem('smartAccountingResult', JSON.stringify(response));
        showSuccess('智能识别成功');

        // 刷新记账点余额
        try {
          await fetchBalance();
        } catch (balanceError) {
          console.error('刷新记账点余额失败:', balanceError);
        }

        onClose();
        router.push('/transactions/new');
      } else {
        showError(createError(MultimodalErrorType.PROCESSING_ERROR, '智能识别失败，请手动填写'));
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

    // 检查记账点余额
    if (!checkAccountingPoints('text')) {
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

    // 检查记账点余额
    if (!checkAccountingPoints('text')) {
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
        { timeout: 60000 },
      );

      if (response && (response.id || (response.transactions && response.count > 0))) {
        const successMessage = response.id 
          ? '记账成功' 
          : `记账成功，已创建${response.count}条记录`;
        progressManager.showProgress(progressId, successMessage, 'success');

        // 刷新仪表盘数据
        if (accountBookId) {
          try {
            await refreshDashboardData(accountBookId);
            // 刷新记账点余额
            await fetchBalance();
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
    console.log('🔄 [ManualAccounting] 手动记账按钮被点击');

    try {
      safeHapticFeedback('touch'); // 手动记账按钮震动反馈
      console.log('🔄 [ManualAccounting] 震动反馈已触发');

      // 先关闭模态框
      onClose();
      console.log('🔄 [ManualAccounting] 模态框已关闭');

      // 等待模态框关闭动画完成和导航状态重置后再进行路由跳转
      setTimeout(() => {
        console.log('🔄 [ManualAccounting] 准备跳转到 /transactions/new');
        router.push('/transactions/new');
        console.log('🔄 [ManualAccounting] 路由跳转已执行');
      }, 300); // 延迟300ms确保模态框完全关闭
    } catch (error) {
      console.error('🔄 [ManualAccounting] 手动记账处理失败:', error);
      toast.error('跳转失败，请重试');
    }
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
      console.log('🚀 智能记账对话框打开，开始初始化:', {
        accountBookId,
        configLoading,
        config,
        balance,
      });

      // 初始化多模态状态
      loadMultimodalStatus();

      // 如果记账点系统启用，获取记账点余额
      if (config.accountingPointsEnabled) {
        fetchBalance()
          .then(() => {
            console.log('✅ 记账点余额获取完成');
          })
          .catch((error) => {
            console.error('❌ 记账点余额获取失败:', error);
          });
      } else {
        console.log('💰 记账点系统未启用，跳过余额获取');
      }

      // 重置所有状态
      setDescription('');
      setIsProcessing(false);
      setProcessingStep('');
      setIsProcessingMultimodal(false);
      recordingCancelledRef.current = false;
      setIsButtonTouched(false);
      setTouchStartPos(null);
      setGestureType('none');
      setShowGestureHint(false);

      // 重置相机按钮状态
      setIsCameraButtonTouched(false);
      setCameraTouchStartPos(null);
      setCameraGestureType('none');

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
      if (isRecordingState(recordingState)) {
        cleanupAudioAnalyser();
      }
    };
  }, [isOpen, recordingState, configLoading, config.accountingPointsEnabled]);

  // 专门处理记账点余额获取
  useEffect(() => {
    console.log('🔍 余额获取useEffect触发:', {
      isOpen,
      configLoading,
      accountingPointsEnabled: config.accountingPointsEnabled,
    });

    if (isOpen && !configLoading && config.accountingPointsEnabled) {
      console.log('🔄 配置加载完成，开始获取记账点余额');
      fetchBalance()
        .then(() => {
          console.log('✅ 记账点余额获取成功');
        })
        .catch((error) => {
          console.error('❌ 记账点余额获取失败:', error);
        });
    }
  }, [isOpen, configLoading, config.accountingPointsEnabled, fetchBalance]);

  if (!isOpen) return null;

  // 处理点击空白处关闭弹窗
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="smart-accounting-dialog-overlay" onClick={handleOverlayClick}>
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
              {(isRecordingState(recordingState) ||
                recordingState === RecordingState.PREPARING) && (
                <div className="recording-indicator">
                  <div className="sound-wave-container">
                    <div className="microphone-icon">
                      <i className={RECORDING_STATE_ICONS[recordingState]}></i>
                    </div>
                    <div className="sound-waves">
                      {[...Array(7)].map((_, i) => {
                        // 只在真正录音时显示声波动画
                        const isActuallyRecording = recordingState === RecordingState.RECORDING;

                        // 基础高度
                        const baseHeight = 15;
                        const maxHeight = 60;

                        // 检测阈值
                        const hasAudio = isActuallyRecording && audioLevel > 1;

                        // 提高音量映射敏感度
                        const volumeMultiplier = hasAudio
                          ? Math.pow(audioLevel / 100, 0.5) * (maxHeight - baseHeight)
                          : 0;

                        // 增加波形动画幅度
                        let waveOffset = 0;
                        if (hasAudio) {
                          const frequency = 0.007 + i * 0.003;
                          const phase = (i * Math.PI) / 3;
                          const amplitude = Math.max(1, audioLevel * 0.12);
                          waveOffset = Math.sin(animationTime * frequency + phase) * amplitude;
                        } else if (recordingState === RecordingState.PREPARING) {
                          // 准备状态显示脉冲动画
                          const frequency = 0.01;
                          const amplitude = 5;
                          waveOffset = Math.sin(animationTime * frequency + i * 0.5) * amplitude;
                        }

                        // 最终高度计算
                        const finalHeight = baseHeight + volumeMultiplier + waveOffset;

                        // 根据录音状态设置颜色
                        let color = '#6b7280'; // 默认灰色
                        let opacity = 0.4;
                        let scale = 0.8;

                        if (recordingState === RecordingState.PREPARING) {
                          // 准备状态 - 蓝色脉冲
                          color = '#3b82f6';
                          opacity = 0.6 + Math.sin(animationTime * 0.01) * 0.2;
                          scale = 0.8 + Math.sin(animationTime * 0.01) * 0.1;
                        } else if (recordingState === RecordingState.RECORDING) {
                          // 录音状态 - 根据音量变化颜色
                          if (audioLevel > 30)
                            color = '#ef4444'; // 红色 - 高音量
                          else if (audioLevel > 20)
                            color = '#f59e0b'; // 橙色 - 中高音量
                          else if (audioLevel > 10)
                            color = '#22c55e'; // 绿色 - 中音量
                          else if (audioLevel > 5)
                            color = '#3b82f6'; // 蓝色 - 低音量
                          else if (audioLevel > 1)
                            color = '#8b5cf6'; // 紫色 - 极低音量
                          else color = '#6b7280'; // 静默时的灰色

                          // 提高透明度变化敏感度
                          opacity = hasAudio
                            ? Math.max(0.7, Math.min(1, 0.7 + (audioLevel / 100) * 0.3))
                            : 0.4;
                          scale = hasAudio ? 0.9 + (audioLevel / 100) * 0.1 : 0.8;
                        }

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
                              transition: hasAudio ? 'none' : 'all 0.3s ease',
                            }}
                          />
                        );
                      })}
                    </div>
                    <div className="recording-gesture-arrows">
                      <div
                        className={`arrow arrow-up ${gestureType === 'cancel' ? 'active cancel' : ''}`}
                      >
                        <i className="fas fa-times"></i>
                      </div>
                      <div
                        className={`arrow arrow-center ${gestureType === 'none' ? 'active direct-save' : ''}`}
                      >
                        <i className="fas fa-check"></i>
                      </div>
                      <div
                        className={`arrow arrow-down ${gestureType === 'fill-text' ? 'active fill-text' : ''}`}
                      >
                        <i className="fas fa-edit"></i>
                      </div>
                    </div>
                  </div>
                  <p className="title">
                    {gestureType === 'cancel'
                      ? '取消录音'
                      : gestureType === 'fill-text'
                        ? '填入文本框'
                        : '松开直接记账'}
                  </p>
                  {showGestureHint && (
                    <p className="hint gesture-hint">
                      {gestureType === 'cancel'
                        ? '松开取消录音'
                        : gestureType === 'fill-text'
                          ? '松开填入文本框'
                          : '松开转换文字并记账'}
                    </p>
                  )}
                  {!showGestureHint && (
                    <p className="default-hint">上滑取消 • 下滑填入文本框 • 松开直接记账</p>
                  )}
                </div>
              )}

              {/* 相机手势状态提示 */}
              {isCameraButtonTouched && (
                <div className="camera-gesture-indicator">
                  <div className="camera-gesture-container">
                    <div className="camera-icon">
                      <i
                        className={
                          cameraGestureType === 'capture'
                            ? 'fas fa-camera'
                            : cameraGestureType === 'upload'
                              ? 'fas fa-upload'
                              : 'fas fa-hand-pointer'
                        }
                      ></i>
                    </div>
                    <div className="gesture-arrows">
                      <div
                        className={`arrow arrow-up ${cameraGestureType === 'capture' ? 'active' : ''}`}
                      >
                        <i className="fas fa-chevron-up"></i>
                      </div>
                      <div
                        className={`arrow arrow-down ${cameraGestureType === 'upload' ? 'active' : ''}`}
                      >
                        <i className="fas fa-chevron-down"></i>
                      </div>
                    </div>
                  </div>
                  <p className="title">
                    {cameraGestureType === 'capture'
                      ? '拍照模式'
                      : cameraGestureType === 'upload'
                        ? '上传模式'
                        : '相机手势'}
                  </p>
                  <p className="hint">
                    {cameraGestureType === 'capture'
                      ? '松开拍照'
                      : cameraGestureType === 'upload'
                        ? '松开上传图片'
                        : '上滑拍照 • 下滑上传'}
                  </p>
                </div>
              )}

              <div className="smart-accounting-buttons">
                <button
                  className="smart-accounting-button identify-button"
                  onClick={handleSmartAccounting}
                  disabled={isButtonDisabled('text', isProcessing || !description.trim())}
                  title={getButtonTitle('text')}
                >
                  智能识别
                </button>

                <button
                  className="smart-accounting-button direct-button"
                  onClick={handleDirectAdd}
                  disabled={isButtonDisabled('text', !description.trim())}
                  title={getButtonTitle('text')}
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
                <div
                  style={{
                    display: 'flex',
                    gap: '12px',
                    alignItems: 'center',
                  }}
                >
                  {/* 相机按钮 */}
                  <button
                    type="button"
                    onTouchStart={handleCameraTouchStart}
                    onTouchMove={handleCameraTouchMove}
                    onTouchEnd={handleCameraTouchEnd}
                    onMouseDown={handleCameraMouseDown}
                    onMouseMove={handleCameraMouseMove}
                    onMouseUp={handleCameraMouseUp}
                    onMouseLeave={handleCameraMouseLeave}
                    disabled={isButtonDisabled('image', isProcessing || isProcessingMultimodal)}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: isCameraButtonTouched
                        ? cameraGestureType === 'capture'
                          ? 'var(--primary-color, #3b82f6)'
                          : cameraGestureType === 'upload'
                            ? 'var(--warning-color, #f59e0b)'
                            : 'var(--secondary-color-light, #8b5cf6)'
                        : 'var(--success-color, #22c55e)',
                      color: 'white',
                      fontSize: '18px',
                      cursor: isButtonDisabled('image', isProcessing || isProcessingMultimodal)
                        ? 'not-allowed'
                        : 'pointer',
                      opacity: isButtonDisabled('image', isProcessing || isProcessingMultimodal)
                        ? 0.6
                        : 1,
                      transition: isCameraButtonTouched ? 'all 0.1s ease' : 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isCameraButtonTouched
                        ? cameraGestureType === 'capture'
                          ? '0 0 0 4px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)'
                          : cameraGestureType === 'upload'
                            ? '0 0 0 4px rgba(245, 158, 11, 0.4), 0 4px 12px rgba(0, 0, 0, 0.15)'
                            : '0 0 0 4px rgba(139, 92, 246, 0.3), 0 2px 8px rgba(0, 0, 0, 0.1)'
                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transform: isCameraButtonTouched
                        ? cameraGestureType === 'capture'
                          ? 'scale(1.1) translateY(-2px)'
                          : cameraGestureType === 'upload'
                            ? 'scale(1.1) translateY(2px)'
                            : 'scale(1.05)'
                        : 'scale(1)',
                    }}
                    title={
                      getButtonTitle('image') ||
                      (isCameraButtonTouched
                        ? cameraGestureType === 'capture'
                          ? '松开拍照'
                          : cameraGestureType === 'upload'
                            ? '松开上传'
                            : '上滑拍照 下滑上传'
                        : '按住滑动：上滑拍照，下滑上传')
                    }
                  >
                    {isProcessingMultimodal ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i
                        className={
                          isCameraButtonTouched
                            ? cameraGestureType === 'capture'
                              ? 'fas fa-camera'
                              : cameraGestureType === 'upload'
                                ? 'fas fa-upload'
                                : 'fas fa-hand-pointer'
                            : 'fas fa-camera'
                        }
                      ></i>
                    )}
                  </button>

                  {/* 手动记账按钮 */}
                  <button
                    type="button"
                    className="smart-accounting-manual-button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('🔄 [ManualAccounting] 按钮点击事件触发');
                      handleManualAccounting();
                    }}
                    style={{
                      flex: 1,
                      pointerEvents: 'auto', // 确保点击事件可以触发
                      zIndex: 1, // 确保按钮在最上层
                    }}
                  >
                    手动记账
                  </button>

                  {/* 麦克风按钮 */}
                  <button
                    ref={micButtonRef}
                    type="button"
                    disabled={isButtonDisabled('voice', isProcessing || isProcessingMultimodal)}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp} // 鼠标离开按钮区域时也停止录音
                    className={`mic-button ${recordingState.toLowerCase().replace('_', '-')} ${isButtonTouched ? 'touched' : ''}`}
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: RECORDING_STATE_COLORS[recordingState],
                      color: 'white',
                      fontSize: '18px',
                      cursor: isButtonDisabled('voice', isProcessing || isProcessingMultimodal)
                        ? 'not-allowed'
                        : 'pointer',
                      opacity: isButtonDisabled('voice', isProcessing || isProcessingMultimodal)
                        ? 0.6
                        : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: isRecordingState(recordingState)
                        ? `0 4px 16px ${RECORDING_STATE_COLORS[recordingState]}40`
                        : '0 2px 8px rgba(0, 0, 0, 0.1)',
                      transform: isRecordingState(recordingState)
                        ? 'scale(1.1)'
                        : isButtonTouched
                          ? 'scale(1.05)'
                          : 'scale(1)',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none',
                      position: 'relative',
                      overflow: 'hidden',
                      touchAction: 'manipulation', // 确保触摸移动事件能正常工作
                    }}
                    title={getButtonTitle('voice') || RECORDING_STATE_LABELS[recordingState]}
                  >
                    {/* 背景呼吸效果 */}
                    {(isRecordingState(recordingState) ||
                      recordingState === RecordingState.PREPARING) && (
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
                          background:
                            'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 50%, transparent 70%)',
                          animation: 'breathe 2s ease-in-out infinite',
                        }}
                      />
                    )}

                    {/* 音频可视化 */}
                    {recordingState === RecordingState.RECORDING && (
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
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.max(5, audioLevel)}%`,
                            height: '100%',
                            backgroundColor: 'white',
                            borderRadius: '2px',
                            transition: 'width 0.1s ease',
                          }}
                        />
                      </div>
                    )}

                    {/* 图标 */}
                    <div style={{ position: 'relative', zIndex: 1 }}>
                      {isProcessingMultimodal ? (
                        <i className="fas fa-spinner fa-spin"></i>
                      ) : (
                        <i className={RECORDING_STATE_ICONS[recordingState]}></i>
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
