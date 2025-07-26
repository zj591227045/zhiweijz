'use client';

import React from 'react';
import { Smartphone, Download, Settings, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';

export default function ShortcutsInstallPage() {
  const handleInstallImageShortcut = () => {
    // 使用原始快捷指令文件
    const shortcutUrl = encodeURIComponent('https://jz-dev.jacksonz.cn:4443/shortcuts/smart-image-accounting.shortcut');
    const installUrl = `shortcuts://import-shortcut?url=${shortcutUrl}`;

    // 尝试打开快捷指令App
    window.location.href = installUrl;
  };

  const copyInstallLink = () => {
    const shortcutUrl = 'https://jz-dev.jacksonz.cn:4443/shortcuts/smart-image-accounting.shortcut';
    const installUrl = `shortcuts://import-shortcut?url=${encodeURIComponent(shortcutUrl)}`;

    navigator.clipboard.writeText(installUrl).then(() => {
      alert('安装链接已复制到剪贴板');
    }).catch(() => {
      alert('复制失败，请手动复制');
    });
  };

  const openDirectDownload = () => {
    const shortcutUrl = 'https://jz-dev.jacksonz.cn:4443/shortcuts/smart-image-accounting.shortcut';
    window.open(shortcutUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            iOS快捷指令安装
          </h1>
          <p className="text-lg text-gray-600">
            轻敲iPhone背面，自动截图记账
          </p>
        </div>

        {/* 系统要求 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 text-amber-500 mr-2" />
            系统要求
          </h2>
          <ul className="space-y-2 text-gray-600">
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              iOS 14.0 或更高版本
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              iPhone 8 或更新机型（支持轻点背面）
            </li>
            <li className="flex items-center">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
              已安装"只为记账"App并完成登录
            </li>
          </ul>
        </div>

        {/* 智能图片记账快捷指令 */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Download className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">智能图片记账快捷指令</h2>
            <p className="text-gray-600">对象存储版本 - 支持完整质量图片上传，无URL长度限制</p>
          </div>

          {/* 功能特点 */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium">完整质量图片</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium">对象存储上传</span>
            </div>
            <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium">智能识别记账</span>
            </div>
          </div>

          {/* 工作流程 */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-3 text-gray-900">🔄 工作流程</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center space-x-2">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">1</span>
                <span>截取屏幕</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">2</span>
                <span>获取上传Token</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">3</span>
                <span>上传图片到对象存储</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">4</span>
                <span>调用智能记账API</span>
              </div>
            </div>
          </div>

          {/* 安装按钮 */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleInstallImageShortcut}
              className="bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <Download className="w-5 h-5 mr-2" />
              一键安装快捷指令
            </button>

            <button
              onClick={copyInstallLink}
              className="bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              复制安装链接
            </button>

            <button
              onClick={openDirectDownload}
              className="bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              直接下载
            </button>
          </div>
        </div>

        {/* 配置步骤 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Settings className="w-5 h-5 text-blue-500 mr-2" />
            配置轻点背面触发
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-medium text-blue-600">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">打开设置</p>
                <p className="text-sm text-gray-600">设置 → 辅助功能</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-medium text-blue-600">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">找到触控设置</p>
                <p className="text-sm text-gray-600">辅助功能 → 触控</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-medium text-blue-600">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">配置轻点背面</p>
                <p className="text-sm text-gray-600">触控 → 轻点背面 → 轻点两下 → 选择"智能图片记账"快捷指令</p>
              </div>
            </div>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            使用方法
          </h2>
          
          <div className="space-y-3">
            <div className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
              <span className="text-sm text-gray-600">打开需要记账的页面（支付记录、订单详情等）</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
              <span className="text-sm text-gray-600">轻敲iPhone背面两次</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
              <span className="text-sm text-gray-600">等待自动截图和AI识别</span>
            </div>
            <div className="flex items-start">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5" />
              <span className="text-sm text-gray-600">查看记账结果</span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>提示：</strong> 确保在使用前已在只为记账App中选择了要记账的账本，并保持网络连接良好。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
