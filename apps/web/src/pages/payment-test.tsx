/**
 * 支付功能测试页面
 * 用于测试完整的支付流程
 */

import React, { useState, useEffect } from 'react';
import { PaymentDiagnostics } from '../components/PaymentDiagnostics';
import { PaymentModal } from '../components/PaymentModal';
import { MobilePaymentModal } from '../components/MobilePaymentModal';
import {
  useMobilePayment,
  MembershipLevel,
  getActiveProducts,
  getPaymentSystemStatus
} from '../lib/payment';
import { Capacitor } from '@capacitor/core';

export default function PaymentTestPage() {
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);

  const {
    isInitialized,
    isLoading,
    error,
    membershipLevel,
    isDonationMember,
    isDonationTwo,
    isDonationThree,
    hasMonthlyPoints1000,
    hasMonthlyPoints1500,
    hasCharityAttribution,
    hasPrioritySupport,
    hasAiSmartAccounting,
    hasAdvancedAnalytics,
    refreshCustomerInfo,
    restorePurchases
  } = useMobilePayment();

  // 添加测试结果
  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  // 测试支付系统状态
  const testPaymentSystemStatus = () => {
    try {
      const status = getPaymentSystemStatus();
      addTestResult(`支付系统状态检查: ${JSON.stringify(status)}`);
    } catch (error) {
      addTestResult(`支付系统状态检查失败: ${error}`);
    }
  };

  // 测试产品配置
  const testProductConfiguration = () => {
    try {
      const products = getActiveProducts();
      addTestResult(`产品配置检查: 找到 ${products.length} 个激活产品`);
      products.forEach(product => {
        addTestResult(`- ${product.name}: ${product.displayPrice} (${product.id})`);
      });
    } catch (error) {
      addTestResult(`产品配置检查失败: ${error}`);
    }
  };

  // 测试客户信息刷新
  const testRefreshCustomerInfo = async () => {
    try {
      addTestResult('开始刷新客户信息...');
      await refreshCustomerInfo();
      addTestResult('客户信息刷新成功');
    } catch (error) {
      addTestResult(`客户信息刷新失败: ${error}`);
    }
  };

  // 测试恢复购买
  const testRestorePurchases = async () => {
    try {
      addTestResult('开始恢复购买...');
      await restorePurchases();
      addTestResult('恢复购买成功');
    } catch (error) {
      addTestResult(`恢复购买失败: ${error}`);
    }
  };

  // 清空测试结果
  const clearTestResults = () => {
    setTestResults([]);
  };

  // 获取会员状态显示
  const getMembershipDisplay = () => {
    switch (membershipLevel) {
      case MembershipLevel.DONATION_THREE:
        return { name: '捐赠会员（叁）', color: 'text-purple-600', bgColor: 'bg-purple-100' };
      case MembershipLevel.DONATION_TWO:
        return { name: '捐赠会员（贰）', color: 'text-blue-600', bgColor: 'bg-blue-100' };
      case MembershipLevel.DONATION_ONE:
        return { name: '捐赠会员（壹）', color: 'text-green-600', bgColor: 'bg-green-100' };
      default:
        return { name: '免费用户', color: 'text-gray-600', bgColor: 'bg-gray-100' };
    }
  };

  const membershipDisplay = getMembershipDisplay();
  const isMobile = Capacitor.isNativePlatform();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-center mb-8">支付功能测试</h1>

        {/* 快速状态检查 */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-sm text-blue-800">
            <div>🔧 平台: {Capacitor.getPlatform()} {isMobile ? '(移动端)' : '(Web端)'}</div>
            <div>🔄 初始化状态: {isInitialized ? '✅ 已初始化' : '❌ 未初始化'}</div>
            <div>⏳ 加载状态: {isLoading ? '🔄 加载中' : '✅ 空闲'}</div>
            {error && <div>❌ 错误: {error}</div>}
          </div>
        </div>

        {/* 诊断工具 */}
        <div className="mb-8">
          <PaymentDiagnostics />
        </div>

        {/* 系统状态 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* 基本信息 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">系统信息</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>平台:</span>
                <span className="font-medium">{Capacitor.getPlatform()}</span>
              </div>
              <div className="flex justify-between">
                <span>是否移动端:</span>
                <span className={`font-medium ${isMobile ? 'text-green-600' : 'text-orange-600'}`}>
                  {isMobile ? '是' : '否'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>支付系统初始化:</span>
                <span className={`font-medium ${isInitialized ? 'text-green-600' : 'text-red-600'}`}>
                  {isInitialized ? '已初始化' : '未初始化'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>加载状态:</span>
                <span className={`font-medium ${isLoading ? 'text-yellow-600' : 'text-gray-600'}`}>
                  {isLoading ? '加载中' : '空闲'}
                </span>
              </div>
              {error && (
                <div className="flex justify-between">
                  <span>错误:</span>
                  <span className="font-medium text-red-600">{error}</span>
                </div>
              )}
            </div>
          </div>

          {/* 会员状态 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">会员状态</h2>
            <div className={`inline-flex items-center px-4 py-2 rounded-full ${membershipDisplay.bgColor} mb-4`}>
              <span className={`font-medium ${membershipDisplay.color}`}>
                {membershipDisplay.name}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span>1000点/月记账点:</span>
                <span className={hasMonthlyPoints1000 ? 'text-green-600' : 'text-gray-400'}>
                  {hasMonthlyPoints1000 ? '✓' : '○'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>1500点/月记账点:</span>
                <span className={hasMonthlyPoints1500 ? 'text-green-600' : 'text-gray-400'}>
                  {hasMonthlyPoints1500 ? '✓' : '○'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>公益署名权:</span>
                <span className={hasCharityAttribution ? 'text-green-600' : 'text-gray-400'}>
                  {hasCharityAttribution ? '✓' : '○'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>优先客服支持:</span>
                <span className={hasPrioritySupport ? 'text-green-600' : 'text-gray-400'}>
                  {hasPrioritySupport ? '✓' : '○'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>AI智能记账:</span>
                <span className={hasAiSmartAccounting ? 'text-green-600' : 'text-gray-400'}>
                  {hasAiSmartAccounting ? '✓' : '○'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>高级统计分析:</span>
                <span className={hasAdvancedAnalytics ? 'text-green-600' : 'text-gray-400'}>
                  {hasAdvancedAnalytics ? '✓' : '○'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 测试操作 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">测试操作</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={testPaymentSystemStatus}
              className="bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600"
            >
              检查系统状态
            </button>
            <button
              onClick={testProductConfiguration}
              className="bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
            >
              检查产品配置
            </button>
            <button
              onClick={testRefreshCustomerInfo}
              disabled={!isInitialized || isLoading}
              className="bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 disabled:opacity-50"
            >
              刷新客户信息
            </button>
            <button
              onClick={testRestorePurchases}
              disabled={!isInitialized || isLoading || !isMobile}
              className="bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              恢复购买
            </button>
          </div>
        </div>

        {/* 购买测试 */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">购买测试</h2>
          <div className="space-y-4">
            <button
              onClick={() => setShowPaymentModal(true)}
              disabled={!isInitialized || !isMobile}
              className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {!isMobile ? 'App内购买仅在移动端可用' : 
               !isInitialized ? '支付系统未初始化' : 
               '打开支付界面'}
            </button>

            {!isMobile && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-600 text-sm">
                  💡 要测试App内购买功能，请在iOS或Android设备上运行应用
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 测试结果 */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">测试结果</h2>
            <button
              onClick={clearTestResults}
              className="bg-gray-500 text-white py-1 px-3 rounded hover:bg-gray-600"
            >
              清空
            </button>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 text-center">暂无测试结果</p>
            ) : (
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 支付模态框 */}
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={(level) => {
            addTestResult(`购买成功: ${level}`);
            setShowPaymentModal(false);
          }}
        />
      </div>
    </div>
  );
}
