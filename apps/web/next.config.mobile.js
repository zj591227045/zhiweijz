/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  
  // Capacitor静态导出配置
  output: 'export',
  trailingSlash: true,
  
  // 图片优化配置
  images: {
    unoptimized: true
  },
  
  // 禁用服务端功能
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
  
  // 构建配置
  generateBuildId: () => 'mobile-build',
  
  // 忽略构建错误
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 环境变量 - 标识这是移动端构建
  env: {
    IS_MOBILE_BUILD: 'true',
    NEXT_PUBLIC_IS_MOBILE: 'true',
  },

  // 页面扩展名配置
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],


  
  // 自定义webpack配置
  webpack: (config, { dev, isServer }) => {
    // 确保mobile-stub.js文件存在的路径别名
    const stubPath = path.resolve(__dirname, 'src/lib/mobile-stub.js');

    // 添加别名，将admin和debug相关导入重定向到空模块
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components/admin': stubPath,
      '@/store/admin': stubPath,
      '@/lib/admin-api-client': stubPath,
      '@/components/debug': stubPath,
    };

    // 排除admin、debug和test页面文件 - 使用更精确的匹配
    config.module.rules.push({
      test: /src[\/\\]app[\/\\](admin|debug|test.*)/,
      use: 'null-loader'
    });

    // 排除debug组件
    config.module.rules.push({
      test: /src[\/\\]components[\/\\]debug/,
      use: 'null-loader'
    });

    // 添加忽略插件，完全排除admin、debug和test相关文件
    config.plugins.push(
      new (require('webpack')).IgnorePlugin({
        resourceRegExp: /src[\/\\]app[\/\\](admin|debug|test.*)/,
      })
    );

    config.plugins.push(
      new (require('webpack')).IgnorePlugin({
        resourceRegExp: /src[\/\\]components[\/\\]debug/,
      })
    );

    // 定义全局变量
    config.plugins.push(
      new (require('webpack')).DefinePlugin({
        'process.env.IS_MOBILE_BUILD': JSON.stringify('true'),
        'process.env.NEXT_PUBLIC_IS_MOBILE': JSON.stringify('true'),
      })
    );

    return config;
  },
};

module.exports = nextConfig;
