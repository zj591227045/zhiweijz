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
        {/* 临时禁用日志管理器，用于调试分享功能 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // 临时禁用日志过滤，允许所有日志输出
              console.log('🔧 [DEBUG] 日志管理器已临时禁用，所有日志将正常输出');
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
