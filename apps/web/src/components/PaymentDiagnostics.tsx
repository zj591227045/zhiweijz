/**
 * 支付系统诊断工具
 * 用于检查iOS支付系统的状态和配置
 */

import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useMobilePayment } from '../hooks/useMobilePayment';
import { REVENUECAT_CONFIG, validateProductConfig, getActiveProducts } from '../config/app-store-products';

interface DiagnosticResult {
  category: string;
  name: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: any;
}

export function PaymentDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  
  const {
    isInitialized,
    isLoading,
    error,
    offerings,
    customerInfo,
    membershipLevel,
    initialize
  } = useMobilePayment();

  // 运行诊断
  const runDiagnostics = async () => {
    setIsRunning(true);
    const results: DiagnosticResult[] = [];

    // 1. 平台检查
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();
    results.push({
      category: '平台',
      name: '运行环境',
      status: isNative ? 'success' : 'warning',
      message: `当前平台: ${platform}${isNative ? ' (原生应用)' : ' (Web环境)'}`,
      details: { platform, isNative }
    });

    // 2. API密钥检查
    const hasApiKey = !!REVENUECAT_CONFIG.apiKey;
    results.push({
      category: '配置',
      name: 'RevenueCat API密钥',
      status: hasApiKey ? 'success' : 'error',
      message: hasApiKey ? 'API密钥已配置' : 'API密钥未配置',
      details: { 
        hasApiKey, 
        keyLength: REVENUECAT_CONFIG.apiKey?.length || 0,
        environment: process.env.NODE_ENV 
      }
    });

    // 3. 产品配置检查
    const productValidation = validateProductConfig();
    results.push({
      category: '配置',
      name: '产品配置',
      status: productValidation.isValid ? 'success' : 'error',
      message: productValidation.isValid ? '产品配置有效' : `配置错误: ${productValidation.errors.join(', ')}`,
      details: { 
        isValid: productValidation.isValid, 
        errors: productValidation.errors,
        productCount: getActiveProducts().length
      }
    });

    // 4. 初始化状态检查
    results.push({
      category: '初始化',
      name: 'RevenueCat初始化',
      status: isInitialized ? 'success' : (isLoading ? 'warning' : 'error'),
      message: isInitialized ? '已初始化' : (isLoading ? '初始化中...' : '未初始化'),
      details: { isInitialized, isLoading, error }
    });

    // 5. 产品加载检查
    results.push({
      category: '产品',
      name: '产品套餐',
      status: offerings.length > 0 ? 'success' : 'warning',
      message: `已加载 ${offerings.length} 个产品套餐`,
      details: { offeringsCount: offerings.length, offerings }
    });

    // 6. 客户信息检查
    results.push({
      category: '用户',
      name: '客户信息',
      status: customerInfo ? 'success' : 'warning',
      message: customerInfo ? '客户信息已获取' : '客户信息未获取',
      details: { 
        hasCustomerInfo: !!customerInfo, 
        membershipLevel,
        activeSubscriptions: customerInfo?.activeSubscriptions || []
      }
    });

    // 7. 网络连接检查（简化版，避免复杂的API调用）
    if (isNative) {
      try {
        // 简单的网络连接检查，使用公共DNS服务
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

        const response = await fetch('https://1.1.1.1/', {
          method: 'HEAD',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        results.push({
          category: '网络',
          name: '网络连接',
          status: 'success',
          message: '网络连接正常',
          details: { status: response.status }
        });
      } catch (error) {
        let errorMessage = '网络连接失败';
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = '网络连接超时（3秒）';
          } else {
            errorMessage = error.message;
          }
        }

        results.push({
          category: '网络',
          name: '网络连接',
          status: 'warning', // 改为warning而不是error
          message: errorMessage,
          details: { error }
        });
      }
    } else {
      // 非移动端环境，跳过网络检查
      results.push({
        category: '网络',
        name: '网络连接',
        status: 'warning',
        message: '非移动端环境，跳过网络检查',
        details: { skipped: true }
      });
    }

    setDiagnostics(results);
    setIsRunning(false);
  };

  // 尝试初始化
  const tryInitialize = async () => {
    if (!REVENUECAT_CONFIG.apiKey) {
      alert('请先配置RevenueCat API密钥');
      return;
    }

    try {
      await initialize(REVENUECAT_CONFIG.apiKey);
      alert('初始化成功！');
      runDiagnostics();
    } catch (error) {
      alert(`初始化失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 获取状态图标
  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
    }
  };

  // 获取状态颜色
  const getStatusColor = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
    }
  };

  // 只在组件挂载时运行一次诊断，避免无限循环
  useEffect(() => {
    runDiagnostics();
  }, []); // 空依赖数组，只在挂载时运行一次

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">支付系统诊断</h2>
        <div className="space-x-2">
          <button
            onClick={runDiagnostics}
            disabled={isRunning}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isRunning ? '检查中...' : '重新检查'}
          </button>
          {!isInitialized && (
            <button
              onClick={tryInitialize}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
            >
              尝试初始化
            </button>
          )}
        </div>
      </div>

      {/* 诊断结果 */}
      <div className="space-y-4">
        {diagnostics.map((result, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{getStatusIcon(result.status)}</span>
                <span className="font-medium">{result.category} - {result.name}</span>
              </div>
              <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                {result.status.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-600 mb-2">{result.message}</p>
            {result.details && (
              <details className="text-xs">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  查看详细信息
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {/* 快速修复建议 */}
      {diagnostics.some(d => d.status === 'error') && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h3 className="font-medium text-red-800 mb-2">修复建议</h3>
          <ul className="text-sm text-red-700 space-y-1">
            {!REVENUECAT_CONFIG.apiKey && (
              <li>• 请在环境变量中配置 NEXT_PUBLIC_REVENUECAT_API_KEY</li>
            )}
            {!isInitialized && (
              <li>• 点击"尝试初始化"按钮手动初始化RevenueCat</li>
            )}
            {diagnostics.find(d => d.name === '产品配置' && d.status === 'error') && (
              <li>• 检查产品配置文件中的产品ID和权益设置</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
