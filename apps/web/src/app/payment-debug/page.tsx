'use client';

import { useEffect, useState } from 'react';
import { useMobilePayment } from '../../hooks/useMobilePayment';
import { Capacitor } from '@capacitor/core';
import { getSubscriptionProducts, validateProductConfig } from '../../config/app-store-products';
import { MobilePaymentModal } from '../../components/MobilePaymentModal';

export default function PaymentDebugPage() {
  const {
    isInitialized,
    isLoading,
    error,
    offerings,
    customerInfo,
    membershipLevel,
    initialize,
    refreshCustomerInfo
  } = useMobilePayment();

  const [debugInfo, setDebugInfo] = useState<any>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [productConfig, setProductConfig] = useState<any>(null);

  useEffect(() => {
    const platform = Capacitor.getPlatform();
    const isNative = Capacitor.isNativePlatform();

    // 验证产品配置
    const configValidation = validateProductConfig();
    const subscriptionProducts = getSubscriptionProducts();

    setDebugInfo({
      platform,
      isNative,
      capacitorAvailable: !!(window as any).Capacitor,
      apiKey: process.env.NEXT_PUBLIC_REVENUECAT_API_KEY ? '已配置' : '未配置'
    });

    setProductConfig({
      validation: configValidation,
      subscriptionProducts,
      productCount: subscriptionProducts.length
    });
  }, []);

  const handleManualInit = async () => {
    const apiKey = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;
    if (apiKey) {
      try {
        await initialize(apiKey);
      } catch (error) {
        console.error('手动初始化失败:', error);
      }
    }
  };

  const handleRefreshCustomerInfo = async () => {
    try {
      await refreshCustomerInfo();
    } catch (error) {
      console.error('刷新客户信息失败:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">支付系统调试页面</h1>
        
        {/* 环境信息 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">环境信息</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">平台:</span> {debugInfo.platform}
            </div>
            <div>
              <span className="font-medium">原生平台:</span> {debugInfo.isNative ? '是' : '否'}
            </div>
            <div>
              <span className="font-medium">Capacitor:</span> {debugInfo.capacitorAvailable ? '可用' : '不可用'}
            </div>
            <div>
              <span className="font-medium">API密钥:</span> {debugInfo.apiKey}
            </div>
          </div>
        </div>

        {/* 支付系统状态 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">支付系统状态</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">初始化状态:</span> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${isInitialized ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {isInitialized ? '已初始化' : '未初始化'}
              </span>
            </div>
            <div>
              <span className="font-medium">加载状态:</span> 
              <span className={`ml-2 px-2 py-1 rounded text-xs ${isLoading ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}`}>
                {isLoading ? '加载中' : '空闲'}
              </span>
            </div>
            <div>
              <span className="font-medium">会员级别:</span> {membershipLevel}
            </div>
            <div>
              <span className="font-medium">产品数量:</span> {offerings?.length || 0}
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <span className="font-medium text-red-800">错误:</span>
              <span className="text-red-700 ml-2">{error}</span>
            </div>
          )}
        </div>

        {/* 产品配置信息 */}
        {productConfig && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">产品配置</h2>
            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="font-medium">配置验证:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${productConfig.validation.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {productConfig.validation.isValid ? '通过' : '失败'}
                </span>
              </div>
              <div>
                <span className="font-medium">订阅产品数量:</span> {productConfig.productCount}
              </div>
            </div>

            {!productConfig.validation.isValid && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                <span className="font-medium text-red-800">配置错误:</span>
                <ul className="text-red-700 ml-2 mt-1">
                  {productConfig.validation.errors.map((error: string, index: number) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4">
              <h3 className="font-medium mb-2">订阅产品列表:</h3>
              <div className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
                {productConfig.subscriptionProducts.map((product: any, index: number) => (
                  <div key={index} className="mb-2 pb-2 border-b border-gray-200 last:border-b-0">
                    <div><strong>ID:</strong> {product.id}</div>
                    <div><strong>名称:</strong> {product.name}</div>
                    <div><strong>价格:</strong> {product.displayPrice}</div>
                    <div><strong>周期:</strong> {product.duration}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">操作</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={handleManualInit}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              手动初始化
            </button>
            <button
              onClick={handleRefreshCustomerInfo}
              disabled={isLoading || !isInitialized}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              刷新客户信息
            </button>
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={isLoading}
              className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
            >
              测试支付模态框
            </button>
          </div>
        </div>

        {/* 客户信息 */}
        {customerInfo && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">客户信息</h2>
            <pre className="text-xs bg-gray-100 p-4 rounded overflow-auto">
              {JSON.stringify(customerInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 支付模态框 */}
      <MobilePaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => {
          setShowPaymentModal(false);
          console.log('支付成功！');
        }}
      />
    </div>
  );
}
