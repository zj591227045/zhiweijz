'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import './shortcuts.css';

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
  const router = useRouter();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
  const [iosVersion, setIOSVersion] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState<'intro' | 'install' | 'configure' | 'test' | 'complete'>('intro');

  // 移动端后退处理
  useMobileBackHandler({
    pageId: 'shortcuts-settings',
    pageLevel: PageLevel.MODAL,
    enableHardwareBack: true,
    enableBrowserBack: true,
    onBack: () => {
      // 快捷记账页面后退到设置页面
      router.push('/settings');
      return true; // 已处理
    },
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
    const icloudUrl = 'https://www.icloud.com/shortcuts/54101f6b4e5448cf8d20945f2daa1df4';

    // 直接打开iCloud快捷指令链接
    window.open(icloudUrl, '_blank');

    toast.success('正在打开快捷指令安装页面...');
  };

  // 复制安装链接
  const copyInstallLink = () => {
    const icloudUrl = 'https://www.icloud.com/shortcuts/54101f6b4e5448cf8d20945f2daa1df4';

    copyToClipboard(icloudUrl, '安装链接');
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
      <div className="step-indicator">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={`step-number ${index <= currentIndex ? 'active' : 'inactive'}`}>
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={`step-line ${index < currentIndex ? 'active' : 'inactive'}`} />
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
            <div className="card">
              <div className="text-center mb-4 sm:mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-3 sm:mb-4" style={{ backgroundColor: 'var(--primary-color-light)' }}>
                  <Zap className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: 'var(--primary-color)' }} />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>iOS快捷记账</h2>
                <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>轻敲iPhone背面，自动截图并智能记账</p>
              </div>

              <div className="space-y-3 sm:space-y-4">
                <div className="feature-item">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 feature-icon" />
                  <div>
                    <h4 className="feature-title text-sm sm:text-base">AI图片识别</h4>
                    <p className="feature-description text-xs sm:text-sm">使用先进的AI技术识别支付记录、订单详情等</p>
                  </div>
                </div>
                <div className="feature-item">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 feature-icon" />
                  <div>
                    <h4 className="feature-title text-sm sm:text-base">一键触发</h4>
                    <p className="feature-description text-xs sm:text-sm">轻敲iPhone背面即可快速截图记账</p>
                  </div>
                </div>
                <div className="feature-item">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 feature-icon" />
                  <div>
                    <h4 className="feature-title text-sm sm:text-base">支持多平台</h4>
                    <p className="feature-description text-xs sm:text-sm">微信、支付宝、淘宝、美团等主流平台</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 系统要求 */}
            <div className="card">
              <h3 className="card-header">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 icon" />
                系统要求
              </h3>
              <div className="space-y-2 sm:space-y-3">
                <div className="requirement-item">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 requirement-icon" />
                  <span className="requirement-text text-sm sm:text-base">iOS 14.0 或更高版本</span>
                </div>
                <div className="requirement-item">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 requirement-icon" />
                  <span className="requirement-text text-sm sm:text-base">iPhone 8 或更新机型</span>
                </div>
                <div className="requirement-item">
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 requirement-icon" />
                  <span className="requirement-text text-sm sm:text-base">已安装"只为记账"App</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentStep('install')}
              className="btn btn-primary text-sm sm:text-base"
            >
              开始设置
              <ExternalLink className="w-4 h-4 ml-2" />
            </button>
          </div>
        );

      case 'install':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div
              className="rounded-lg shadow-sm border p-4 sm:p-6 transition-colors"
              style={{
                backgroundColor: 'var(--card-background)',
                borderColor: 'var(--border-color)',
              }}
            >
              <h3
                className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center"
                style={{ color: 'var(--text-primary)' }}
              >
                <Download
                  className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
                  style={{ color: 'var(--primary-color)' }}
                />
                安装快捷指令
              </h3>

              <div className="space-y-4 mb-4 sm:mb-6">
                <div
                  className="border rounded-lg p-3 sm:p-4 transition-colors"
                  style={{
                    backgroundColor: 'var(--primary-color-light)',
                    borderColor: 'var(--primary-color)',
                    borderWidth: '1px',
                  }}
                >
                  <div className="flex items-center mb-2">
                    <Apple
                      className="w-4 h-4 sm:w-5 sm:h-5 mr-2"
                      style={{ color: 'var(--primary-color)' }}
                    />
                    <span
                      className="font-medium text-sm sm:text-base"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      智能图片记账快捷指令
                    </span>
                  </div>
                  <p
                    className="text-xs sm:text-sm mb-3"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    通过iCloud快捷指令分享 - 支持完整质量图片，AI智能识别，无URL长度限制
                  </p>
                  <div className="space-y-2">
                    <button
                      onClick={installShortcut}
                      className="w-full py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-sm sm:text-base shadow-sm hover:shadow-md"
                      style={{
                        backgroundColor: 'var(--primary-color)',
                        color: 'white',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary-color-dark)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--primary-color)';
                      }}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      一键安装快捷指令
                    </button>
                    <button
                      onClick={copyInstallLink}
                      className="w-full py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center text-xs sm:text-sm shadow-sm hover:shadow-md"
                      style={{
                        backgroundColor: 'var(--hover-background)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--background-hover)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                      }}
                    >
                      <Copy className="w-3 h-3 mr-2" />
                      复制安装链接
                    </button>
                  </div>
                </div>
              </div>

              <div
                className="rounded-lg p-3 sm:p-4 transition-colors"
                style={{ backgroundColor: 'var(--hover-background)' }}
              >
                <p
                  className="font-medium text-sm sm:text-base mb-3"
                  style={{ color: 'var(--text-primary)' }}
                >
                  安装步骤：
                </p>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div
                    className="flex items-start p-2 rounded-md transition-colors"
                    style={{ backgroundColor: 'var(--card-background)' }}
                  >
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-xs font-medium mr-2 sm:mr-3 mt-0.5 flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--primary-color-light)',
                        color: 'var(--primary-color)',
                      }}
                    >
                      1
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      点击"一键安装快捷指令"按钮
                    </span>
                  </div>
                  <div
                    className="flex items-start p-2 rounded-md transition-colors"
                    style={{ backgroundColor: 'var(--card-background)' }}
                  >
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-xs font-medium mr-2 sm:mr-3 mt-0.5 flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--primary-color-light)',
                        color: 'var(--primary-color)',
                      }}
                    >
                      2
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      在Safari中打开iCloud快捷指令页面
                    </span>
                  </div>
                  <div
                    className="flex items-start p-2 rounded-md transition-colors"
                    style={{ backgroundColor: 'var(--card-background)' }}
                  >
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-xs font-medium mr-2 sm:mr-3 mt-0.5 flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--primary-color-light)',
                        color: 'var(--primary-color)',
                      }}
                    >
                      3
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      点击"获取快捷指令"按钮
                    </span>
                  </div>
                  <div
                    className="flex items-start p-2 rounded-md transition-colors"
                    style={{ backgroundColor: 'var(--card-background)' }}
                  >
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded-full text-xs font-medium mr-2 sm:mr-3 mt-0.5 flex-shrink-0"
                      style={{
                        backgroundColor: 'var(--primary-color-light)',
                        color: 'var(--primary-color)',
                      }}
                    >
                      4
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      在快捷指令App中点击"添加快捷指令"
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setCurrentStep('intro')}
                className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: 'var(--hover-background)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--background-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--hover-background)';
                }}
              >
                上一步
              </button>
              <button
                onClick={() => setCurrentStep('configure')}
                className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-lg font-medium transition-all duration-200 text-sm sm:text-base shadow-sm hover:shadow-md"
                style={{
                  backgroundColor: 'var(--primary-color)',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary-color-dark)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--primary-color)';
                }}
              >
                下一步
              </button>
            </div>
          </div>
        );

      case 'configure':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="card">
              <h3 className="card-header">
                <Settings className="w-4 h-4 sm:w-5 sm:h-5 icon" />
                配置轻点背面
              </h3>

              <div className="space-y-3 sm:space-y-4">
                <div className="config-step">
                  <span className="config-number">1</span>
                  <div>
                    <h4 className="config-title text-sm sm:text-base">打开设置</h4>
                    <p className="config-description text-xs sm:text-sm">在iPhone上打开"设置"应用</p>
                  </div>
                </div>

                <div className="config-step">
                  <span className="config-number">2</span>
                  <div>
                    <h4 className="config-title text-sm sm:text-base">进入辅助功能</h4>
                    <p className="config-description text-xs sm:text-sm">设置 → 辅助功能</p>
                  </div>
                </div>

                <div className="config-step">
                  <span className="config-number">3</span>
                  <div>
                    <h4 className="config-title text-sm sm:text-base">找到触控设置</h4>
                    <p className="config-description text-xs sm:text-sm">辅助功能 → 触控</p>
                  </div>
                </div>

                <div className="config-step">
                  <span className="config-number">4</span>
                  <div>
                    <h4 className="config-title text-sm sm:text-base">配置轻点背面</h4>
                    <p className="config-description text-xs sm:text-sm">触控 → 轻点背面 → 轻点两下</p>
                  </div>
                </div>

                <div className="config-step">
                  <span className="config-number">5</span>
                  <div>
                    <h4 className="config-title text-sm sm:text-base">选择快捷指令</h4>
                    <p className="config-description text-xs sm:text-sm">在快捷指令列表中选择"只为记账-截图记账"</p>
                  </div>
                </div>
              </div>

              <div className="alert alert-warning">
                <div className="flex items-center mb-2">
                  <AlertCircle className="w-4 h-4 alert-icon" />
                  <span className="alert-title text-sm sm:text-base">注意事项</span>
                </div>
                <p className="alert-description text-xs sm:text-sm">
                  如果在快捷指令列表中找不到"智能图片记账"，请确保已正确安装快捷指令。
                </p>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setCurrentStep('install')}
                className="btn btn-secondary flex-1 text-sm sm:text-base"
              >
                上一步
              </button>
              <button
                onClick={() => setCurrentStep('test')}
                className="btn btn-primary flex-1 text-sm sm:text-base"
              >
                下一步
              </button>
            </div>
          </div>
        );

      case 'test':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="card">
              <h3 className="card-header">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 icon" />
                测试功能
              </h3>

              <div className="space-y-4 mb-4 sm:mb-6">
                <div className="alert alert-success">
                  <h4 className="alert-title text-sm sm:text-base">测试步骤</h4>
                  <div className="space-y-2 text-xs sm:text-sm">
                    <div className="test-step">
                      <span className="step-number-small">1</span>
                      <span>确保已在只为记账App中选择了账本</span>
                    </div>
                    <div className="test-step">
                      <span className="step-number-small">2</span>
                      <span>打开微信支付记录或支付宝账单页面</span>
                    </div>
                    <div className="test-step">
                      <span className="step-number-small">3</span>
                      <span>轻敲iPhone背面两次</span>
                    </div>
                    <div className="test-step">
                      <span className="step-number-small">4</span>
                      <span>等待自动截图和AI识别处理</span>
                    </div>
                    <div className="test-step">
                      <span className="step-number-small">5</span>
                      <span>查看记账结果</span>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info">
                  <h4 className="alert-title text-sm sm:text-base">支持的场景</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
                    <div className="supported-scenario">
                      <CheckCircle className="w-3 h-3 scenario-icon" />
                      <span>微信支付记录</span>
                    </div>
                    <div className="supported-scenario">
                      <CheckCircle className="w-3 h-3 scenario-icon" />
                      <span>支付宝付款页面</span>
                    </div>
                    <div className="supported-scenario">
                      <CheckCircle className="w-3 h-3 scenario-icon" />
                      <span>淘宝订单详情</span>
                    </div>
                    <div className="supported-scenario">
                      <CheckCircle className="w-3 h-3 scenario-icon" />
                      <span>美团外卖订单</span>
                    </div>
                    <div className="supported-scenario">
                      <CheckCircle className="w-3 h-3 scenario-icon" />
                      <span>银行转账记录</span>
                    </div>
                    <div className="supported-scenario">
                      <CheckCircle className="w-3 h-3 scenario-icon" />
                      <span>发票和收据</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="alert alert-error">
                <h4 className="alert-title text-sm sm:text-base">故障排除</h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  <p>• 如果轻敲背面没有反应，请检查轻点背面设置</p>
                  <p>• 如果识别不准确，确保截图内容清晰完整</p>
                  <p>• 如果记账失败，检查网络连接和账本选择</p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => setCurrentStep('configure')}
                className="btn btn-secondary flex-1 text-sm sm:text-base"
              >
                上一步
              </button>
              <button
                onClick={() => setCurrentStep('complete')}
                className="btn btn-success flex-1 text-sm sm:text-base"
              >
                测试完成
              </button>
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="card text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-3 sm:mb-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>设置完成！</h2>
              <p className="text-sm sm:text-base mb-4 sm:mb-6" style={{ color: 'var(--text-secondary)' }}>
                您已成功设置iOS快捷记账功能，现在可以轻敲iPhone背面快速记账了。
              </p>

              <div className="alert alert-info text-left">
                <h4 className="alert-title text-sm sm:text-base">使用提示</h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  <p>• 选择信息完整的页面进行截图</p>
                  <p>• 避免截图时有弹窗遮挡</p>
                  <p>• 确保金额和商家信息清晰可见</p>
                  <p>• 在网络良好的环境下使用</p>
                </div>
              </div>

              <button
                onClick={() => setCurrentStep('intro')}
                className="btn btn-primary text-sm sm:text-base"
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
      <div className="space-y-4 sm:space-y-6">
        {/* 功能介绍 */}
        <div className="card">
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-3 sm:mb-4" style={{ backgroundColor: 'var(--primary-color-light)' }}>
              <Zap className="w-6 h-6 sm:w-8 sm:h-8" style={{ color: 'var(--primary-color)' }} />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Android快捷记账</h2>
            <p className="text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>通过分享图片，一键调用智能记账</p>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="feature-item">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 feature-icon" />
              <div>
                <h4 className="feature-title text-sm sm:text-base">系统分享集成</h4>
                <p className="feature-description text-xs sm:text-sm">直接使用Android系统分享功能调用智能记账</p>
              </div>
            </div>
            <div className="feature-item">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 feature-icon" />
              <div>
                <h4 className="feature-title text-sm sm:text-base">AI图片识别</h4>
                <p className="feature-description text-xs sm:text-sm">智能识别支付记录、订单详情等财务信息</p>
              </div>
            </div>
            <div className="feature-item">
              <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 feature-icon" />
              <div>
                <h4 className="feature-title text-sm sm:text-base">全平台支持</h4>
                <p className="feature-description text-xs sm:text-sm">支持所有支持分享图片的应用</p>
              </div>
            </div>
          </div>
        </div>

        {/* 使用步骤 */}
        <div className="card">
          <h3 className="card-header">
            <Settings className="w-4 h-4 sm:w-5 sm:h-5 icon" />
            使用方法
          </h3>

          <div className="space-y-3 sm:space-y-4">
            <div className="config-step">
              <span className="config-number">1</span>
              <div>
                <h4 className="config-title text-sm sm:text-base">找到支付记录</h4>
                <p className="config-description text-xs sm:text-sm">在微信、支付宝等应用中找到支付记录或订单详情</p>
              </div>
            </div>

            <div className="config-step">
              <span className="config-number">2</span>
              <div>
                <h4 className="config-title text-sm sm:text-base">分享图片</h4>
                <p className="config-description text-xs sm:text-sm">长按截图选择"分享"，或使用应用的分享功能</p>
              </div>
            </div>

            <div className="config-step">
              <span className="config-number">3</span>
              <div>
                <h4 className="config-title text-sm sm:text-base">选择只为记账</h4>
                <p className="config-description text-xs sm:text-sm">在分享应用列表中选择"只为记账"</p>
              </div>
            </div>

            <div className="config-step">
              <span className="config-number">4</span>
              <div>
                <h4 className="config-title text-sm sm:text-base">确认记账</h4>
                <p className="config-description text-xs sm:text-sm">查看AI识别结果并确认保存</p>
              </div>
            </div>
          </div>
        </div>

        {/* 支持的应用 */}
        <div className="card">
          <h3 className="card-header">
            <Image className="w-4 h-4 sm:w-5 sm:h-5 icon" />
            支持的应用
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="supported-scenario">
              <CheckCircle className="w-3 h-3 scenario-icon" />
              <span className="text-xs sm:text-sm">微信</span>
            </div>
            <div className="supported-scenario">
              <CheckCircle className="w-3 h-3 scenario-icon" />
              <span className="text-xs sm:text-sm">支付宝</span>
            </div>
            <div className="supported-scenario">
              <CheckCircle className="w-3 h-3 scenario-icon" />
              <span className="text-xs sm:text-sm">淘宝</span>
            </div>
            <div className="supported-scenario">
              <CheckCircle className="w-3 h-3 scenario-icon" />
              <span className="text-xs sm:text-sm">美团</span>
            </div>
            <div className="supported-scenario">
              <CheckCircle className="w-3 h-3 scenario-icon" />
              <span className="text-xs sm:text-sm">饿了么</span>
            </div>
            <div className="supported-scenario">
              <CheckCircle className="w-3 h-3 scenario-icon" />
              <span className="text-xs sm:text-sm">更多应用</span>
            </div>
          </div>
        </div>

        {/* 温馨提示 */}
        <div className="alert alert-info">
          <div className="flex items-center mb-2">
            <AlertCircle className="w-4 h-4 alert-icon" />
            <span className="alert-title text-sm sm:text-base">温馨提示</span>
          </div>
          <div className="space-y-1 text-xs sm:text-sm">
            <p>• 确保分享的图片内容清晰，包含完整的金额和商家信息</p>
            <p>• 如果识别结果不准确，可以手动修改后保存</p>
            <p>• 首次使用时需要授予"只为记账"访问图片的权限</p>
            <p>• 使用前请确保已在App中选择了正确的账本</p>
          </div>
        </div>
      </div>
    );
  };

  // 渲染其他平台内容
  const renderOtherPlatformContent = () => {
    return (
      <div
        className="rounded-lg shadow-sm border p-4 sm:p-6 text-center transition-colors"
        style={{
          backgroundColor: 'var(--card-background)',
          borderColor: 'var(--border-color)',
        }}
      >
        <div
          className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full mb-3 sm:mb-4 transition-colors"
          style={{ backgroundColor: 'var(--hover-background)' }}
        >
          <Smartphone
            className="w-6 h-6 sm:w-8 sm:h-8"
            style={{ color: 'var(--text-secondary)' }}
          />
        </div>
        <h2
          className="text-lg sm:text-xl font-bold mb-2"
          style={{ color: 'var(--text-primary)' }}
        >
          仅支持移动设备
        </h2>
        <p
          className="text-sm sm:text-base mb-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          快捷记账功能仅在iOS和Android移动设备上可用。
        </p>
        <div
          className="border rounded-lg p-3 sm:p-4 transition-colors"
          style={{
            backgroundColor: 'var(--primary-color-light)',
            borderColor: 'var(--primary-color)',
          }}
        >
          <p
            className="text-xs sm:text-sm"
            style={{ color: 'var(--primary-color)' }}
          >
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
      <div className="shortcuts-page w-full max-w-2xl mx-auto px-4 pb-safe">
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
