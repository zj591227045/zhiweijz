/**
 * 快捷指令设置指南组件
 * 帮助用户安装和配置iOS快捷指令
 */

'use client';

import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  Settings,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Image,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';

interface ShortcutsSetupGuideProps {
  className?: string;
}

type SetupStep = 'intro' | 'install' | 'configure' | 'test' | 'complete';

export function ShortcutsSetupGuide({ className = '' }: ShortcutsSetupGuideProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>('intro');

  // 复制URL到剪贴板
  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${description}已复制到剪贴板`);
    }).catch(() => {
      toast.error('复制失败，请手动复制');
    });
  };

  // 渲染步骤指示器
  const renderStepIndicator = () => {
    const steps = [
      { key: 'intro', label: '介绍' },
      { key: 'install', label: '安装' },
      { key: 'configure', label: '配置' },
      { key: 'test', label: '测试' },
      { key: 'complete', label: '完成' }
    ];

    const currentIndex = steps.findIndex(step => step.key === currentStep);

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              index <= currentIndex 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {index < currentIndex ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 ${
                index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // 渲染介绍页面
  const renderIntro = () => (
    <div className="text-center">
      <Smartphone className="w-16 h-16 text-blue-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-4">快捷指令截图记账</h2>
      <p className="text-gray-600 mb-6">
        通过iOS快捷指令，轻敲iPhone背面即可自动截图并智能记账。
        支持微信支付、淘宝订单、发票收据等多种场景。
      </p>
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">系统要求</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• iOS 14.0 或更高版本</li>
          <li>• iPhone 8 或更新机型</li>
          <li>• 已登录只为记账App</li>
        </ul>
      </div>
      <button
        onClick={() => setCurrentStep('install')}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        开始设置
      </button>
    </div>
  );



  // 渲染安装页面
  const renderInstall = () => {
    const handleInstallShortcut = () => {
      const shortcutUrl = 'https://jz-dev.jacksonz.cn:4443/shortcuts/smart-image-accounting.shortcut';
      const installUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(shortcutUrl)}`;

      // 尝试打开快捷指令安装链接
      window.location.href = installUrl;

      toast.success('正在打开快捷指令安装页面...');
    };

    const copyInstallLink = () => {
      const shortcutUrl = 'https://jz-dev.jacksonz.cn:4443/shortcuts/smart-image-accounting.shortcut';
      const installUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(shortcutUrl)}`;

      copyToClipboard(installUrl, '安装链接');
    };

    return (
      <div>
        <h2 className="text-xl font-bold mb-4 text-center">
          安装智能图片记账快捷指令
        </h2>

        <div className="space-y-4">
          {/* 功能介绍 */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-800 mb-2">✨ 功能特点</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• 完整质量图片上传，无压缩损失</li>
              <li>• 对象存储技术，突破URL长度限制</li>
              <li>• AI智能识别，支持多种支付场景</li>
              <li>• 一键安装，无需手动配置</li>
            </ul>
          </div>

          {/* 安装按钮 */}
          <div className="space-y-3">
            <button
              onClick={handleInstallShortcut}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Download className="w-5 h-5 mr-2" />
              一键安装快捷指令
            </button>

            <button
              onClick={copyInstallLink}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <Copy className="w-4 h-4 mr-2" />
              复制安装链接
            </button>
          </div>

          {/* 安装说明 */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-800 mb-2">📱 安装步骤</h3>
            <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
              <li>点击"一键安装快捷指令"按钮</li>
              <li>在弹出的页面中选择"获取快捷指令"</li>
              <li>点击"添加快捷指令"完成安装</li>
              <li>快捷指令将自动命名为"智能图片记账"</li>
            </ol>
          </div>

        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={() => setCurrentStep('intro')}
            className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            上一步
          </button>
          <button
            onClick={() => setCurrentStep('configure')}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            下一步
          </button>
        </div>
      </div>
    );
  };

  // 渲染配置页面
  const renderConfigure = () => (
    <div>
      <h2 className="text-xl font-bold mb-4 text-center">配置轻点背面</h2>
      
      <div className="space-y-4">
        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
            <div className="text-sm text-yellow-700">
              <p className="font-medium mb-1">重要提示</p>
              <p>请确保您的iPhone支持轻点背面功能（iPhone 8及以上机型）</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
              1
            </div>
            <p className="text-sm">打开"设置"App</p>
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
              2
            </div>
            <p className="text-sm">进入"辅助功能" → "触控" → "轻点背面"</p>
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
              3
            </div>
            <p className="text-sm">选择"轻点两下"或"轻点三下"</p>
          </div>

          <div className="flex items-center p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium mr-3">
              4
            </div>
            <p className="text-sm">在快捷指令列表中选择您刚创建的快捷指令</p>
          </div>
        </div>
      </div>

      <div className="flex space-x-3 mt-6">
        <button
          onClick={() => setCurrentStep('install')}
          className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          上一步
        </button>
        <button
          onClick={() => setCurrentStep('test')}
          className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          下一步
        </button>
      </div>
    </div>
  );

  // 渲染测试页面
  const renderTest = () => (
    <div>
      <h2 className="text-xl font-bold mb-4 text-center">测试快捷指令</h2>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-start">
            <Zap className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">测试步骤</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>打开一个支付记录或订单页面</li>
                <li>轻敲iPhone背面（按您设置的次数）</li>
                <li>观察是否自动截图并打开只为记账App</li>
                <li>检查记账结果是否正确</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-semibold text-green-800 mb-2">测试成功标志</h3>
          <ul className="text-sm text-green-700 space-y-1">
            <li>✓ 轻敲背面后自动截图</li>
            <li>✓ 自动打开只为记账App</li>
            <li>✓ 成功创建记账记录</li>
          </ul>
        </div>

        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="font-semibold text-red-800 mb-2">常见问题</h3>
          <ul className="text-sm text-red-700 space-y-1">
            <li>• 轻敲无反应：检查轻点背面设置</li>
            <li>• App未打开：检查快捷指令URL配置</li>
            <li>• 识别失败：确保截图内容清晰</li>
          </ul>
        </div>
      </div>

      <div className="flex space-x-3 mt-6">
        <button
          onClick={() => setCurrentStep('configure')}
          className="flex-1 py-3 px-6 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
        >
          上一步
        </button>
        <button
          onClick={() => setCurrentStep('complete')}
          className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-green-700 transition-colors"
        >
          测试完成
        </button>
      </div>
    </div>
  );

  // 渲染完成页面
  const renderComplete = () => (
    <div className="text-center">
      <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold mb-4">设置完成！</h2>
      <p className="text-gray-600 mb-6">
        恭喜！您已成功设置快捷指令截图记账功能。
        现在可以通过轻敲iPhone背面来快速记账了。
      </p>
      
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-2">使用提示</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• 在支付完成页面使用效果最佳</li>
          <li>• 确保截图内容清晰完整</li>
          <li>• 网络良好时识别更准确</li>
          <li>• 可以在App中查看和编辑记账记录</li>
        </ul>
      </div>

      <button
        onClick={() => setCurrentStep('intro')}
        className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors"
      >
        重新设置
      </button>
    </div>
  );

  return (
    <div className={`shortcuts-setup-guide max-w-md mx-auto p-6 ${className}`}>
      {renderStepIndicator()}
      
      <div className="min-h-[400px]">
        {currentStep === 'intro' && renderIntro()}
        {currentStep === 'install' && renderInstall()}
        {currentStep === 'configure' && renderConfigure()}
        {currentStep === 'test' && renderTest()}
        {currentStep === 'complete' && renderComplete()}
      </div>
    </div>
  );
}
