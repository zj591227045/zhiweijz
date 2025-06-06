'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SimpleSlidingCaptchaProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
  onError: (error: string) => void;
  title?: string;
}

export const SimpleSlidingCaptcha: React.FC<SimpleSlidingCaptchaProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onError,
  title = '请完成安全验证',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [targetPosition, setTargetPosition] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [backgroundPattern, setBackgroundPattern] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);
  const dragStartX = useRef<number>(0);
  const initialSliderPosition = useRef<number>(0);

  // 生成随机背景图案和目标位置
  const generatePuzzle = useCallback(() => {
    if (typeof window === 'undefined') return;

    // 生成随机目标位置 (60-180px之间，避免边缘)
    const target = Math.random() * 120 + 60;
    setTargetPosition(target);

    // 生成美观的渐变背景
    const hue1 = Math.random() * 360;
    const hue2 = (hue1 + 120) % 360;
    const hue3 = (hue1 + 240) % 360;

    const patterns = [
      `linear-gradient(135deg, hsl(${hue1}, 80%, 75%) 0%, hsl(${hue2}, 70%, 65%) 50%, hsl(${hue3}, 75%, 70%) 100%)`,
      `radial-gradient(circle at 30% 30%, hsl(${hue1}, 85%, 80%) 0%, hsl(${hue2}, 75%, 70%) 40%, hsl(${hue3}, 80%, 60%) 100%)`,
      `linear-gradient(45deg, hsl(${hue1}, 90%, 80%) 0%, hsl(${hue2}, 85%, 75%) 25%, hsl(${hue3}, 80%, 70%) 50%, hsl(${hue1}, 75%, 65%) 100%)`,
      `conic-gradient(from 45deg, hsl(${hue1}, 80%, 75%), hsl(${hue2}, 75%, 70%), hsl(${hue3}, 85%, 75%), hsl(${hue1}, 80%, 75%))`,
    ];

    const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
    setBackgroundPattern(selectedPattern);
  }, []);

  // 处理拖拽开始
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setStartTime(Date.now());

    // 记录拖拽开始时的鼠标/触摸位置和滑块位置
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    dragStartX.current = clientX;
    initialSliderPosition.current = sliderPosition;
  };

  // 处理拖拽移动
  const handleDragMove = useCallback(
    (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;

      e.preventDefault(); // 防止默认行为

      // 使用相对位置计算，避免重复获取getBoundingClientRect
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const deltaX = clientX - dragStartX.current;
      const newPosition = Math.max(0, Math.min(250, initialSliderPosition.current + deltaX));

      // 直接更新状态
      setSliderPosition(newPosition);
    },
    [isDragging],
  );

  // 处理拖拽结束
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return;

    setIsDragging(false);
    const endTime = Date.now();
    const duration = endTime - startTime;

    // 检查位置是否正确 (允许20像素误差，更宽松)
    const isCorrect = Math.abs(sliderPosition - targetPosition) <= 20;

    // 检查时间是否合理（防止机器人，更宽松的时间范围）
    const isTimeValid = duration > 300 && duration < 15000;

    if (isCorrect && isTimeValid) {
      // 显示验证中状态
      setIsVerifying(true);

      setTimeout(() => {
        // 显示成功状态
        setIsSuccess(true);

        setTimeout(() => {
          // 生成验证token
          const token = btoa(
            JSON.stringify({
              timestamp: Date.now(),
              position: sliderPosition,
              target: targetPosition,
              duration,
            }),
          );

          onSuccess(token);
        }, 800);
      }, 500);
    } else {
      onError('验证失败，请重试');
      // 重置滑块位置
      setSliderPosition(0);
      setIsSuccess(false);
      setIsVerifying(false);
      // 重新生成拼图
      setTimeout(generatePuzzle, 1000);
    }
  }, [isDragging, sliderPosition, targetPosition, startTime, onSuccess, onError, generatePuzzle]);

  // 添加事件监听器
  useEffect(() => {
    if (isDragging) {
      const options = { passive: false };
      document.addEventListener('mousemove', handleDragMove, options);
      document.addEventListener('mouseup', handleDragEnd);
      document.addEventListener('touchmove', handleDragMove, options);
      document.addEventListener('touchend', handleDragEnd);

      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
        document.removeEventListener('touchmove', handleDragMove);
        document.removeEventListener('touchend', handleDragEnd);
      };
    }
  }, [isDragging, handleDragMove, handleDragEnd]);

  // 初始化拼图
  useEffect(() => {
    if (isOpen) {
      setSliderPosition(0);
      setIsSuccess(false);
      setIsVerifying(false);
      generatePuzzle();
    }
  }, [isOpen, generatePuzzle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm" onClick={onClose} />

      {/* 验证码弹窗 */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mx-4 w-full max-w-md border border-gray-200 dark:border-gray-700">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">🔒</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-light hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200"
          >
            ×
          </button>
        </div>

        {/* 拼图区域 */}
        <div className="mb-6">
          <div
            className="relative rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600 shadow-inner"
            style={{
              height: '160px',
              background: backgroundPattern || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            }}
          >
            {/* 装饰性光效 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-10 transform -skew-x-12 animate-pulse"></div>

            {/* 目标区域指示 */}
            <div
              className="absolute top-1/2 transform -translate-y-1/2 w-14 h-14 border-3 border-dashed border-white bg-white bg-opacity-20 rounded-xl backdrop-blur-sm shadow-lg transition-all duration-300"
              style={{ left: `${targetPosition}px` }}
            >
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white to-transparent opacity-30"></div>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white text-xl">
                🎯
              </div>
            </div>

            {/* 拼图片段 */}
            <div
              className={`absolute top-1/2 transform -translate-y-1/2 w-14 h-14 rounded-xl shadow-xl flex items-center justify-center text-white font-bold ${
                isSuccess
                  ? 'bg-gradient-to-br from-green-400 to-green-600 scale-110 transition-all duration-500'
                  : isVerifying
                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 animate-pulse'
                    : 'bg-gradient-to-br from-blue-400 to-blue-600'
              }`}
              style={{
                left: `${sliderPosition}px`,
                boxShadow: isSuccess
                  ? '0 8px 25px rgba(34, 197, 94, 0.4)'
                  : isVerifying
                    ? '0 8px 25px rgba(234, 179, 8, 0.4)'
                    : '0 8px 25px rgba(59, 130, 246, 0.4)',
                transition: isDragging
                  ? 'none'
                  : isSuccess || isVerifying
                    ? 'all 0.5s ease'
                    : 'none',
              }}
            >
              <div className="text-2xl">{isSuccess ? '✅' : isVerifying ? '⏳' : '🧩'}</div>
            </div>

            {/* 美化的提示文字 */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2">
              <div
                className={`backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full border border-white border-opacity-20 transition-all duration-300 ${
                  isSuccess
                    ? 'bg-green-600 bg-opacity-80'
                    : isVerifying
                      ? 'bg-yellow-600 bg-opacity-80'
                      : 'bg-black bg-opacity-60'
                }`}
              >
                <span className="flex items-center space-x-2">
                  {isSuccess ? (
                    <>
                      <span>🎉</span>
                      <span>验证成功！</span>
                      <span>🎉</span>
                    </>
                  ) : isVerifying ? (
                    <>
                      <span>⏳</span>
                      <span>验证中...</span>
                      <span>⏳</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>将拼图块拖到目标位置</span>
                      <span>✨</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 滑块区域 */}
        <div className="relative mb-4">
          <div className="w-full h-14 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-xl relative overflow-hidden shadow-inner border border-gray-300 dark:border-gray-600">
            {/* 滑块轨道背景效果 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 opacity-30"></div>

            {/* 滑块轨道文字 */}
            <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
              <span className="flex items-center space-x-2">
                <span>👆</span>
                <span>向右拖动滑块完成验证</span>
                <span>👆</span>
              </span>
            </div>

            {/* 进度条 */}
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-blue-500 opacity-20"
              style={{
                width: `${sliderPosition}px`,
                transition: isDragging ? 'none' : 'width 0.3s ease',
              }}
            ></div>

            {/* 滑块 */}
            <div
              ref={sliderRef}
              className={`absolute top-1 left-1 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl cursor-pointer flex items-center justify-center text-white shadow-xl border-2 border-white ${
                isDragging ? '' : 'hover:scale-105 hover:shadow-2xl transition-all duration-200'
              }`}
              style={{
                transform: `translateX(${sliderPosition}px)`,
                boxShadow: '0 6px 20px rgba(59, 130, 246, 0.4)',
                transition: isDragging ? 'none' : undefined,
              }}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div className="text-xl">🔄</div>
            </div>
          </div>
        </div>

        {/* 美化的提示文字 */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center justify-center space-x-2">
            <span>🎮</span>
            <span>拖动滑块控制拼图块移动到目标位置</span>
            <span>🎮</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">验证成功后将自动提交</p>
        </div>
      </div>
    </div>
  );
};
