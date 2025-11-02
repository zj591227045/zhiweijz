/**
 * Android H5支付模态框组件
 * 用于Android客户端的H5支付（微信支付/支付宝支付）
 */

import React, { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface AndroidH5PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  productId?: string;
  initialTab?: 'monthly' | 'yearly';
}

interface AndroidH5Product {
  id: string;
  name: string;
  description: string;
  membershipTier: string;
  duration: 'monthly' | 'yearly';
  displayPrice: string;
  originalPrice?: string;
  discountPercentage?: number;
  monthlyPoints: number;
  hasCharityAttribution: boolean;
  hasPrioritySupport: boolean;
  isPopular?: boolean;
  sortOrder: number;
  prices: {
    wechat: number;
    alipay: number;
  };
}

interface PaymentOrder {
  outTradeNo: string;
  jumpUrl: string;
  tradeNo: string;
  expireTime: string;
  amount: number;
  productName: string;
  payType: string;
}

export function AndroidH5PaymentModal({
  isOpen,
  onClose,
  onSuccess,
  productId,
  initialTab = 'monthly'
}: AndroidH5PaymentModalProps) {
  const [products, setProducts] = useState<AndroidH5Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly'>(initialTab);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(productId || null);
  const [selectedPayType, setSelectedPayType] = useState<'wechat' | 'alipay'>('wechat');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrder | null>(null);
  const [showWebView, setShowWebView] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isAndroid, setIsAndroid] = useState(false);

  // 检查是否在Android环境
  useEffect(() => {
    const checkPlatform = async () => {
      try {
        if (typeof window !== 'undefined') {
          const { Capacitor } = await import('@capacitor/core');
          setIsAndroid(Capacitor.getPlatform() === 'android');
        }
      } catch (error) {
        console.warn('无法加载Capacitor，假设为非Android环境:', error);
        setIsAndroid(false);
      }
    };

    checkPlatform();
  }, []);

  // 获取产品列表
  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/android-h5-payment/products');
      
      if (response.success) {
        setProducts(response.data.products);
        
        // 如果没有选中产品，默认选择第一个推荐产品
        if (!selectedProduct) {
          const popularProduct = response.data.products.find((p: AndroidH5Product) => p.isPopular);
          const firstProduct = response.data.products[0];
          setSelectedProduct(popularProduct?.id || firstProduct?.id);
        }
      } else {
        throw new Error(response.message || '获取产品列表失败');
      }
    } catch (error: any) {
      console.error('获取产品列表失败:', error);
      setError(error.message || '获取产品列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建支付订单
  const createPaymentOrder = async () => {
    if (!selectedProduct || !selectedPayType) {
      toast.error('请选择产品和支付方式');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);

      const response = await apiClient.post('/android-h5-payment/create-order', {
        productId: selectedProduct,
        payType: selectedPayType
      });

      if (response.success) {
        const order = response.data;
        setCurrentOrder(order);
        
        // 在Android环境中打开WebView
        if (isAndroid && order.jumpUrl) {
          await openPaymentWebView(order.jumpUrl);
          startPaymentStatusPolling(order.outTradeNo);
        } else {
          // 非Android环境，显示提示
          toast.error('H5支付仅在Android应用中可用');
        }
      } else {
        throw new Error(response.message || '创建支付订单失败');
      }
    } catch (error: any) {
      console.error('创建支付订单失败:', error);
      setError(error.message || '创建支付订单失败');
      toast.error(error.message || '创建支付订单失败');
    } finally {
      setIsProcessing(false);
    }
  };

  // 打开支付WebView
  const openPaymentWebView = async (jumpUrl: string) => {
    try {
      setShowWebView(true);

      // 动态导入Browser
      const { Browser } = await import('@capacitor/browser');

      await Browser.open({
        url: jumpUrl,
        windowName: '_blank',
        toolbarColor: '#1976d2',
        presentationStyle: 'popover'
      });

      // 监听浏览器关闭事件
      Browser.addListener('browserFinished', () => {
        setShowWebView(false);
        console.log('💰 [AndroidH5Payment] 用户关闭了支付页面');
      });

    } catch (error) {
      console.error('💰 [AndroidH5Payment] 打开支付页面失败:', error);
      setShowWebView(false);
      toast.error('打开支付页面失败');
    }
  };

  // 开始轮询支付状态
  const startPaymentStatusPolling = (outTradeNo: string) => {
    // 清除之前的轮询
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    console.log('💰 [AndroidH5Payment] 开始轮询支付状态:', outTradeNo);

    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await apiClient.get(`/android-h5-payment/query-status/${outTradeNo}`);
        
        if (response.success) {
          // 这里可以根据需要检查支付状态
          // 由于H5支付API的限制，主要依赖后端回调通知
          console.log('💰 [AndroidH5Payment] 支付状态查询:', response.data);
        }
      } catch (error) {
        console.error('💰 [AndroidH5Payment] 查询支付状态失败:', error);
      }
    }, 3000); // 每3秒查询一次

    // 2分钟后停止轮询
    setTimeout(() => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }, 120000);
  };

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  // 过滤产品
  const filteredProducts = products.filter(product => 
    product.duration === activeTab
  ).sort((a, b) => a.sortOrder - b.sortOrder);

  const selectedProductData = products.find(p => p.id === selectedProduct);

  if (!isOpen) return null;

  // 如果不在Android环境，显示提示
  if (!isAndroid) {
    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">H5支付</h2>
          <p className="text-gray-600 mb-4">
            H5支付功能仅在Android应用中可用。请在Android应用中进行购买。
          </p>
          <button
            onClick={onClose}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
          >
            确定
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">选择订阅方案</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isProcessing}
          >
            ✕
          </button>
        </div>

        {/* 内容 */}
        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-600">加载中...</p>
            </div>
          ) : (
            <>
              {/* 周期选择 */}
              <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('monthly')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'monthly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  月付
                </button>
                <button
                  onClick={() => setActiveTab('yearly')}
                  className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'yearly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  年付
                </button>
              </div>

              {/* 产品列表 */}
              <div className="space-y-3 mb-6">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => setSelectedProduct(product.id)}
                    className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                      selectedProduct === product.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${product.isPopular ? 'ring-2 ring-blue-200' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{product.name}</h3>
                          {product.isPopular && (
                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">
                              推荐
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-lg font-bold text-blue-600">
                            {product.displayPrice}
                          </span>
                          {product.originalPrice && (
                            <span className="text-sm text-gray-500 line-through">
                              {product.originalPrice}
                            </span>
                          )}
                          {product.discountPercentage && (
                            <span className="text-sm text-green-600">
                              省{product.discountPercentage}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        selectedProduct === product.id
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedProduct === product.id && (
                          <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 支付方式选择 */}
              <div className="mb-6">
                <h3 className="font-medium mb-3">选择支付方式</h3>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payType"
                      value="wechat"
                      checked={selectedPayType === 'wechat'}
                      onChange={(e) => setSelectedPayType(e.target.value as 'wechat')}
                      className="mr-3"
                    />
                    <span className="text-green-600 mr-2">💚</span>
                    <span>微信支付</span>
                  </label>
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="payType"
                      value="alipay"
                      checked={selectedPayType === 'alipay'}
                      onChange={(e) => setSelectedPayType(e.target.value as 'alipay')}
                      className="mr-3"
                    />
                    <span className="text-blue-600 mr-2">💙</span>
                    <span>支付宝</span>
                  </label>
                </div>
              </div>

              {/* 购买按钮 */}
              <button
                onClick={createPaymentOrder}
                disabled={!selectedProduct || isProcessing || showWebView}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? '创建订单中...' : showWebView ? '支付中...' : `立即支付 ${selectedProductData?.displayPrice || ''}`}
              </button>

              {/* 说明文字 */}
              <div className="mt-4 text-xs text-gray-500 text-center">
                <p>• 购买后立即生效，可在设置中管理订阅</p>
                <p>• 支持家庭共享，可与家人共享会员权益</p>
                <p>• 如有问题，请联系客服</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
