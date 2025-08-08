// 服务端日志过滤 - 立即执行
if (typeof window === 'undefined') {
  // 服务端默认禁用所有日志
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
}

import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '../styles/z-index-layers.css';
import '../styles/android-fixes.css';
import '../styles/ios-fixes.css';
import { ClientProviders } from './providers';
import { PlatformDetector } from '@/components/platform-detector';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'sans-serif',
  ],
});

export const metadata: Metadata = {
  title: '只为记账 - 简单高效的个人记账应用',
  description: '只为记账是一款简单、高效的个人记账应用，帮助您更好地管理财务。',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 立即重写console方法，在任何其他脚本之前执行
              (function() {
                // 保存原始console方法
                const originalConsole = {
                  log: console.log.bind(console),
                  info: console.info.bind(console),
                  warn: console.warn.bind(console),
                  error: console.error.bind(console),
                  debug: console.debug.bind(console),
                };

                // 获取配置
                function getLogConfig() {
                  const defaultConfig = { enabled: false, level: 'debug' };
                  try {
                    const stored = localStorage.getItem('zhiweijz-simple-log-config');
                    if (stored) {
                      return Object.assign(defaultConfig, JSON.parse(stored));
                    }
                  } catch (error) {
                    // 忽略错误，使用默认配置
                  }
                  return defaultConfig;
                }

                // 检查是否应该输出日志
                function shouldLog(level) {
                  const config = getLogConfig();
                  if (!config.enabled) {
                    return false;
                  }
                  const levels = ['debug', 'info', 'warn', 'error'];
                  const currentLevelIndex = levels.indexOf(config.level);
                  const targetLevelIndex = levels.indexOf(level);
                  return targetLevelIndex >= currentLevelIndex;
                }

                // 创建日志包装函数
                function createLogWrapper(level, originalMethod) {
                  return function() {
                    if (shouldLog(level)) {
                      originalMethod.apply(console, arguments);
                    }
                  };
                }

                // 立即重写console方法
                console.log = createLogWrapper('debug', originalConsole.log);
                console.info = createLogWrapper('info', originalConsole.info);
                console.warn = createLogWrapper('warn', originalConsole.warn);
                console.error = createLogWrapper('error', originalConsole.error);
                console.debug = createLogWrapper('debug', originalConsole.debug);

                // 暴露API（静默模式，不输出任何提示）
                window.enableLogs = function(level) {
                  level = level || 'debug';
                  const config = { enabled: true, level: level };
                  localStorage.setItem('zhiweijz-simple-log-config', JSON.stringify(config));
                  // 静默启用，不输出任何提示
                };

                window.disableLogs = function() {
                  const config = { enabled: false, level: 'debug' };
                  localStorage.setItem('zhiweijz-simple-log-config', JSON.stringify(config));
                  // 静默禁用，不输出任何提示
                };

                window.getLogConfig = function() {
                  const config = getLogConfig();
                  return config;
                };

                window.clearLogConfig = function() {
                  localStorage.removeItem('zhiweijz-simple-log-config');
                  // 静默清除，不输出任何提示
                };

                window.testLogs = function() {
                  console.log('🔍 这是一条log日志 - 应该被过滤');
                  console.info('ℹ️ 这是一条info日志 - 应该被过滤');
                  console.warn('⚠️ 这是一条warn日志 - 应该被过滤');
                  console.error('❌ 这是一条error日志 - 应该被过滤');
                  // 静默测试，不输出任何提示
                };

                // 静默初始化，不输出任何日志管理器相关信息
              })();
            `,
          }}
        />
        {/* 移动端视口设置，支持安全区域 */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />

        {/* 预加载字体 */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* iOS状态栏样式 */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />

        {/* 添加meta标签，防止浏览器缓存CSS */}
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <PlatformDetector />
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
