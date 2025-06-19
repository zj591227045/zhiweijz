/** @type {import('next').NextConfig} */
const path = require('path');

// 检测构建模式
const isMobileBuild = process.env.BUILD_MODE === 'mobile' ||
                     process.env.NEXT_BUILD_MODE === 'mobile' ||
                     process.argv.includes('--mobile');

const isDevelopment = process.env.NODE_ENV === 'development';

console.log(`🔧 Next.js 配置模式: ${isMobileBuild ? '移动端' : 'Web端'} (开发环境: ${isDevelopment})`);

// 基础配置
const baseConfig = {
  reactStrictMode: true,

  // 图片优化配置
  images: {
    unoptimized: true
  },

  // 实验性功能
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },

  // 忽略构建错误
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // 页面扩展名配置
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

// 移动端特定配置
const mobileConfig = {
  ...baseConfig,

  // Capacitor静态导出配置
  output: 'export',
  distDir: 'out',
  trailingSlash: true,

  // 构建配置
  generateBuildId: () => 'mobile-build',

  // 环境变量 - 标识这是移动端构建
  env: {
    IS_MOBILE_BUILD: 'true',
    NEXT_PUBLIC_IS_MOBILE: 'true',
  },

  // 自定义webpack配置 - 移动端排除admin模块
  webpack: (config, { dev, isServer }) => {
    const stubPath = path.resolve(__dirname, 'src/lib/mobile-stub.js');

    // 添加别名，将admin相关导入重定向到空模块
    config.resolve.alias = {
      ...config.resolve.alias,
      '@/components/admin': stubPath,
      '@/store/admin': stubPath,
      '@zhiweijz/core': path.resolve(__dirname, '../../packages/core/src'),
      '@zhiweijz/web': path.resolve(__dirname, '../../packages/web/src'),
    };

    // 确保内部包可以访问前端的依赖
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      'node_modules'
    ];

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

// Web端配置
const webConfig = {
  ...baseConfig,

  // 环境变量 - Web端构建
  env: {
    IS_MOBILE_BUILD: 'false',
    NEXT_PUBLIC_IS_MOBILE: 'false',
  },

  // Webpack配置 - 处理内部包路径和依赖
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@zhiweijz/core': path.resolve(__dirname, '../../packages/core/src'),
      '@zhiweijz/web': path.resolve(__dirname, '../../packages/web/src'),
    };

    // 确保内部包可以访问前端的依赖
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      path.resolve(__dirname, '../../node_modules'),
      'node_modules'
    ];

    // 定义全局变量
    config.plugins.push(
      new (require('webpack')).DefinePlugin({
        'process.env.IS_MOBILE_BUILD': JSON.stringify('false'),
        'process.env.NEXT_PUBLIC_IS_MOBILE': JSON.stringify('false'),
      })
    );

    return config;
  },
};

// 根据构建模式选择配置
const nextConfig = isMobileBuild ? mobileConfig : webConfig;

module.exports = nextConfig;
