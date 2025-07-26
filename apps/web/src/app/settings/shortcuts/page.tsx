'use client';

import React, { useState, useEffect } from 'react';
import { PageContainer } from '@/components/layout/page-container';
import {
  Smartphone,
  Download,
  Settings,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Copy,
  Image,
  Zap,
  Apple
} from 'lucide-react';
import { toast } from 'sonner';
import { useMobileBackHandler } from '@/hooks/use-mobile-back-handler';
import { PageLevel } from '@/lib/mobile-navigation';

// 检测平台类型
const detectPlatform = (): 'ios' | 'android' | 'other' => {
  if (typeof window === 'undefined') return 'other';
  
  const userAgent = window.navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) {
    return 'ios';
  } else if (/android/.test(userAgent)) {
    return 'android';
  }
  return 'other';
};

// 检测iOS版本
const getIOSVersion = (): number | null => {
  if (typeof window === 'undefined') return null;
  
  const userAgent = window.navigator.userAgent;
  const match = userAgent.match(/OS (\d+)_/);
  return match ? parseInt(match[1]) : null;
};

export default function ShortcutsSettingsPage() {
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [iosVersion, setIOSVersion] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<'intro' | 'install' | 'configure' | 'test' | 'complete'>('intro');

  // 移动端后退处理
  useMobileBackHandler({
    pageId: 'shortcuts-settings',
    pageLevel: PageLevel.FEATURE,
    enableHardwareBack: true,
    enableBrowserBack: true,
  });

  useEffect(() => {
    const detectedPlatform = detectPlatform();
    const detectedIOSVersion = getIOSVersion();
    
    setPlatform(detectedPlatform);
    setIOSVersion(detectedIOSVersion);
  }, []);

  // 复制文本到剪贴板
  const copyToClipboard = (text: string, description: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${description}已复制到剪贴板`);
    }).catch(() => {
      toast.error('复制失败，请手动复制');
    });
  };

  // 安装快捷指令
  const installShortcut = () => {
    const shortcutUrl = 'https://jz-dev.jacksonz.cn:4443/shortcuts/smart-image-accounting.shortcut';
    const installUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(shortcutUrl)}`;

    // 尝试打开快捷指令安装链接
    window.location.href = installUrl;

    toast.success('正在打开快捷指令安装页面...');
  };

  // 复制安装链接
  const copyInstallLink = () => {
    const shortcutUrl = 'https://jz-dev.jacksonz.cn:4443/shortcuts/smart-image-accounting.shortcut';
    const installUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(shortcutUrl)}`;

    copyToClipboard(installUrl, '安装链接');
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
      <div className="flex items-center justify-center mb-6 px-2">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
              index <= currentIndex
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={`w-8 sm:w-12 h-0.5 mx-1 sm:mx-2 transition-colors ${
                index < currentIndex ? 'bg-primary' : 'bg-muted'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // 渲染iOS内容
  const renderIOSContent = () => {
    // 检查iOS版本兼容性
    const isCompatible = iosVersion === null || iosVersion >= 14;

    if (!isCompatible) {
      return (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 sm:p-6">
          <div className="flex items-center mb-4">
            <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-destructive mr-3" />
            <h3 className="text-base sm:text-lg font-semibold text-destructive">系统版本不兼容</h3>
          </div>
          <p className="text-destructive/80 text-sm sm:text-base mb-4">
            快捷记账功能需要 iOS 14.0 或更高版本，您当前的系统版本为 iOS {iosVersion}。
          </p>
          <p className="text-destructive/80 text-sm sm:text-base">
            请升级您的iOS系统后再使用此功能。
          </p>
        </div>
      );
    }

    switch (currentStep) {
      case 'intro':
        return (
          <div className="space-y-4 sm:space-y-6">
            {/* 功能介绍 */}
            <div className="bg-card rounded-lg shadow-sm border p-4 sm:p-6">
              <div className="text-center mb-4 sm:mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-primary/10 rounded-full mb-3 sm:mb-4">
                  <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">iOS快捷记账</h2>
                <p className="text-muted-foreground text-sm sm:text-base">轻敲iPhone背面，自动截图并智能记账</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm sm:text-base">AI图片识别</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">使用先进的AI技术识别支付记录、订单详情等</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm sm:text-base">一键触发</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">轻敲iPhone背面即可快速截图记账</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-medium text-foreground text-sm sm:text-base">支持多平台</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground">微信、支付宝、淘宝、美团等主流平台</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 系统要求 */}
            <div className="bg-card rounded-lg shadow-sm border p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-primary mr-2" />
                系统要求
              </h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 sm:mr-3 flex-shrink-0" />
                  <span className="text-foreground text-sm sm:text-base">iOS 14.0 或更高版本</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 sm:mr-3 flex-shrink-0" />
                  <span className="text-foreground text-sm sm:text-base">iPhone 8 或更新机型</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500 mr-2 sm:mr-3 flex-shrink-0" />
                  <span className="text-foreground text-sm sm:text-base">已安装"只为记账"App</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep('install')}
              className="w-full bg-primary text-primary-foreground py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center text-sm sm:text-base"
            >
              开始设置
              <ExternalLink className="w-4 h-4 ml-2" />
            </button>
          </div>
        );

      case 'install':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-card rounded-lg shadow-sm border p-4 sm:p-6">
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4 flex items-center">
                <Download className="w-4 h-4 sm:w-5 sm:h-5 text-primary mr-2" />
                安装快捷指令
              </h3>

              <div className="space-y-4 mb-4 sm:mb-6">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center mb-2">
                    <Image className="w-4 h-4 sm:w-5 sm:h-5 text-primary mr-2" />
                    <span className="font-medium text-foreground text-sm sm:text-base">智能图片记账快捷指令</span>
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                    对象存储版本 - 支持完整质量图片，AI智能识别，无URL长度限制
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={installShortcut}
                      className="w-full bg-primary text-primary-foreground py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors flex items-center justify-center text-sm sm:text-base"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      一键安装快捷指令
                    </button>
                    <button
                      onClick={copyInstallLink}
                      className="w-full bg-secondary text-secondary-foreground py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center text-xs sm:text-sm"
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      复制安装链接
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm text-muted-foreground">
                <p className="font-medium text-foreground text-sm sm:text-base">安装步骤：</p>
                <div className="space-y-2">
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-primary/10 text-primary rounded-full text-xs font-medium mr-2 sm:mr-3 mt-0.5 flex-shrink-0">1</span>
                    <span>点击"一键安装快捷指令"按钮</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-primary/10 text-primary rounded-full text-xs font-medium mr-2 sm:mr-3 mt-0.5 flex-shrink-0">2</span>
                    <span>在弹出的页面中选择"获取快捷指令"</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-primary/10 text-primary rounded-full text-xs font-medium mr-2 sm:mr-3 mt-0.5 flex-shrink-0">3</span>
                    <span>点击"添加快捷指令"完成安装</span>
                  </div>
                  <div className="flex items-start">
                    <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 bg-primary/10 text-primary rounded-full text-xs font-medium mr-2 sm:mr-3 mt-0.5 flex-shrink-0">4</span>
                    <span>快捷指令将自动命名为"智能图片记账"</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setCurrentStep('intro')}
                className="flex-1 bg-secondary text-secondary-foreground py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium hover:bg-secondary/80 transition-colors text-sm sm:text-base"
              >
                上一步
              </button>
              <button
                onClick={() => setCurrentStep('configure')}
                className="flex-1 bg-primary text-primary-foreground py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors text-sm sm:text-base"
              >
                下一步
              </button>
            </div>
          </div>
        );

      case 'configure':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 text-blue-500 mr-2" />
                配置轻点背面
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mr-4 mt-1">1</span>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">打开设置</h4>
                    <p className="text-sm text-gray-600">在iPhone上打开"设置"应用</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mr-4 mt-1">2</span>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">进入辅助功能</h4>
                    <p className="text-sm text-gray-600">设置 → 辅助功能</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mr-4 mt-1">3</span>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">找到触控设置</h4>
                    <p className="text-sm text-gray-600">辅助功能 → 触控</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mr-4 mt-1">4</span>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">配置轻点背面</h4>
                    <p className="text-sm text-gray-600">触控 → 轻点背面 → 轻点两下</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full text-sm font-medium mr-4 mt-1">5</span>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">选择快捷指令</h4>
                    <p className="text-sm text-gray-600">在快捷指令列表中选择"只为记账-图片记账"</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 mr-2" />
                  <span className="font-medium text-amber-800">注意事项</span>
                </div>
                <p className="text-sm text-amber-700">
                  如果在快捷指令列表中找不到"只为记账-图片记账"，请确保已正确安装快捷指令。
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('install')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                上一步
              </button>
              <button
                onClick={() => setCurrentStep('test')}
                className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                下一步
              </button>
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                测试功能
              </h3>
              
              <div className="space-y-4 mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-2">测试步骤</h4>
                  <div className="space-y-2 text-sm text-green-700">
                    <div className="flex items-start">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs font-medium mr-3 mt-0.5">1</span>
                      <span>确保已在只为记账App中选择了账本</span>
                    </div>
                    <div className="flex items-start">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs font-medium mr-3 mt-0.5">2</span>
                      <span>打开微信支付记录或支付宝账单页面</span>
                    </div>
                    <div className="flex items-start">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs font-medium mr-3 mt-0.5">3</span>
                      <span>轻敲iPhone背面两次</span>
                    </div>
                    <div className="flex items-start">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs font-medium mr-3 mt-0.5">4</span>
                      <span>等待自动截图和AI识别处理</span>
                    </div>
                    <div className="flex items-start">
                      <span className="inline-flex items-center justify-center w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs font-medium mr-3 mt-0.5">5</span>
                      <span>查看记账结果</span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-800 mb-2">支持的场景</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-blue-700">
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-blue-600 mr-2" />
                      <span>微信支付记录</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-blue-600 mr-2" />
                      <span>支付宝付款页面</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-blue-600 mr-2" />
                      <span>淘宝订单详情</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-blue-600 mr-2" />
                      <span>美团外卖订单</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-blue-600 mr-2" />
                      <span>银行转账记录</span>
                    </div>
                    <div className="flex items-center">
                      <CheckCircle className="w-3 h-3 text-blue-600 mr-2" />
                      <span>发票和收据</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-2">故障排除</h4>
                <div className="space-y-1 text-sm text-amber-700">
                  <p>• 如果轻敲背面没有反应，请检查轻点背面设置</p>
                  <p>• 如果识别不准确，确保截图内容清晰完整</p>
                  <p>• 如果记账失败，检查网络连接和账本选择</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setCurrentStep('configure')}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                上一步
              </button>
              <button
                onClick={() => setCurrentStep('complete')}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-green-700 transition-colors"
              >
                测试完成
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">设置完成！</h2>
              <p className="text-gray-600 mb-6">
                您已成功设置iOS快捷记账功能，现在可以轻敲iPhone背面快速记账了。
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-blue-800 mb-2">使用提示</h4>
                <div className="space-y-1 text-sm text-blue-700 text-left">
                  <p>• 选择信息完整的页面进行截图</p>
                  <p>• 避免截图时有弹窗遮挡</p>
                  <p>• 确保金额和商家信息清晰可见</p>
                  <p>• 在网络良好的环境下使用</p>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep('intro')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                重新查看设置
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // 渲染Android内容
  const renderAndroidContent = () => {
    return (
      <div className="bg-card rounded-lg shadow-sm border p-4 sm:p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full mb-3 sm:mb-4">
          <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">Android版本开发中</h2>
        <p className="text-muted-foreground text-sm sm:text-base mb-4">
          Android平台的快捷记账功能正在开发中，敬请期待。
        </p>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            您可以继续使用App内的智能记账功能，支持拍照和语音记账。
          </p>
        </div>
      </div>
    );
  };

  // 渲染其他平台内容
  const renderOtherPlatformContent = () => {
    return (
      <div className="bg-card rounded-lg shadow-sm border p-4 sm:p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-muted rounded-full mb-3 sm:mb-4">
          <Smartphone className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
        </div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground mb-2">仅支持移动设备</h2>
        <p className="text-muted-foreground text-sm sm:text-base mb-4">
          快捷记账功能仅在iOS和Android移动设备上可用。
        </p>
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-muted-foreground">
            请在iPhone或Android手机上访问此页面来设置快捷记账功能。
          </p>
        </div>
      </div>
    );
  };

  return (
    <PageContainer
      title="快捷记账"
      showBackButton={true}
      activeNavItem="profile"
    >
      <div className="w-full max-w-2xl mx-auto px-4 pb-safe">
        {/* 平台检测和步骤指示器 */}
        {platform === 'ios' && renderStepIndicator()}

        {/* 根据平台显示不同内容 */}
        {platform === 'ios' && renderIOSContent()}
        {platform === 'android' && renderAndroidContent()}
        {platform === 'other' && renderOtherPlatformContent()}
      </div>
    </PageContainer>
  );
}
