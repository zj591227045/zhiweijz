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
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);

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
        
        // 停止所有音频轨道
        stream.getTracks().forEach(track => {
          console.log('🎤 [MediaRecorder] 停止音频轨道:', track.label);
          track.stop();
        });

        // 确保UI状态更新
        setIsRecording(false);
        setMediaRecorder(null);

        // 只有在没有取消的情况下才进行语音识别
        if (!recordingCancelled && chunks.length > 0) {
          console.log('🎤 [MediaRecorder] 开始语音识别，音频块数:', chunks.length);
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          handleSpeechRecognition(audioBlob, gestureTypeRef.current);
        } else {
          console.log('🎤 [MediaRecorder] 跳过语音识别，取消状态:', recordingCancelled, '音频块数:', chunks.length);
        }
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
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🎤 [StopRecording] 正在停止MediaRecorder...');
      mediaRecorder.stop();
    }
    
    // 立即更新UI状态
    setIsRecording(false);
    setMediaRecorder(null);
    setTouchStartPos(null);
    
    console.log('🎤 [StopRecording] 录音状态已重置');
  };

  // 取消录音
  const cancelRecording = () => {
    console.log('🎤 [CancelRecording] 取消录音');
    setRecordingCancelled(true);
    
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      console.log('🎤 [CancelRecording] 停止MediaRecorder...');
      mediaRecorder.stop();
    }
    
    // 立即更新UI状态
    setIsRecording(false);
    setMediaRecorder(null);
    setTouchStartPos(null);
    showInfo('录音已取消');
    
    console.log('🎤 [CancelRecording] 录音已取消，状态已重置');
  };

  // 处理触摸开始
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    console.log('🎤 [TouchStart] 触摸开始');
    const touch = e.touches[0];
    setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    startRecording();
  };

  // 处理触摸移动（检测是否要取消）
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos || !isRecording) return;

    const touch = e.touches[0];
    const deltaY = touchStartPos.y - touch.clientY;
    const deltaX = Math.abs(touch.clientX - touchStartPos.x);

    console.log('🎤 [TouchMove] 触摸移动:', { deltaY, deltaX });

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
    gestureTypeRef.current = 'none';
    setShowGestureHint(false);
  };

  // 处理鼠标事件（桌面端）
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🎤 [MouseDown] 鼠标按下');
    setTouchStartPos({ x: e.clientX, y: e.clientY });
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
    gestureTypeRef.current = 'none';
    setShowGestureHint(false);
  };

  // 处理语音识别
  const handleSpeechRecognition = async (audioBlob: Blob, gestureType: 'none' | 'cancel' | 'fill-text') => {
    if (!accountBookId) {
      toast.error('请先选择账本');
      return;
    }

    setIsProcessingMultimodal(true);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('accountBookId', accountBookId);

      const response = await apiClient.post('/ai/smart-accounting/speech', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });

      if (response && response.data && response.data.text) {
        const recognizedText = response.data.text;
        setDescription(recognizedText);
        showSuccess('语音识别成功');

        // 根据手势类型执行不同操作
        if (gestureType === 'cancel') {
          // 取消录音的情况下，不应该到这里，这里只是保护性代码
          console.log('🎤 [SpeechRecognition] 录音已取消，跳过处理');
          return;
        } else if (gestureType === 'fill-text') {
          // 填入文本框，不自动调用记账
          setDescription(recognizedText);
          showSuccess('语音已转换为文字');
        } else {
          // 正常结束录音，直接调用记账
          setDescription(recognizedText);
          await handleSmartAccountingWithText(recognizedText);
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

    try {
      setIsProcessing(true);
      setProcessingStep('正在创建交易记录...');

      // 调用直接添加记账API
      const response = await apiClient.post(
        `/ai/account/${accountBookId}/smart-accounting/direct`,
        { description },
        { timeout: 60000 }
      );

      if (response && response.id) {
        toast.success('记账成功');

        // 刷新仪表盘数据
        if (accountBookId) {
          try {
            await refreshDashboardData(accountBookId);
          } catch (refreshError) {
            console.error('刷新仪表盘数据失败:', refreshError);
          }
        }

        onClose();
        setDescription('');
      } else {
        toast.error('记账失败，请手动填写');
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

      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
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
    }
  }, [isOpen]);

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

              {/* 录音状态提示 */}
              {isRecording && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(0, 0, 0, 0.8)',
                  color: 'white',
                  padding: '20px',
                  borderRadius: '12px',
                  textAlign: 'center',
                  zIndex: 1000,
                  minWidth: '200px'
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--error-color, #ef4444)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    animation: 'recordingPulse 1.5s ease-in-out infinite'
                  }}>
                    <i className="fas fa-microphone" style={{ fontSize: '16px', color: 'white' }}></i>
                  </div>
                  <p style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 'bold' }}>
                    正在录音...
                  </p>
                  {showGestureHint && (
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
                      {gestureType === 'cancel' ? '松开取消录音' : 
                       gestureType === 'fill-text' ? '松开填入文本框' : 
                       '松开转换文字并记账'}
                    </p>
                  )}
                  {!showGestureHint && (
                    <p style={{ margin: 0, fontSize: '12px', opacity: 0.7 }}>
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
                      transform: isRecording ? 'scale(1.1)' : 'scale(1)',
                      userSelect: 'none',
                      WebkitUserSelect: 'none',
                      WebkitTouchCallout: 'none'
                    }}
                    title={isRecording ? '松开停止录音，向上滑动取消' : '长按开始语音记账'}
                  >
                    {isProcessingMultimodal ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : isRecording ? (
                      <i className="fas fa-stop"></i>
                    ) : (
                      <i className="fas fa-microphone"></i>
                    )}
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
