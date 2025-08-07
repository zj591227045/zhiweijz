/** @type {import('next').NextConfig} */
const nextConfig = {
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

  // 环境变量 - Web端构建
  env: {
    IS_MOBILE_BUILD: 'false',
    NEXT_PUBLIC_IS_MOBILE: 'false',
  },

  // 页面扩展名配置
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Webpack配置 - 处理内部包路径和依赖
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@zhiweijz/core': require('path').resolve(__dirname, '../../packages/core/src'),
      '@zhiweijz/web': require('path').resolve(__dirname, '../../packages/web/src'),
    };

    // 确保内部包可以访问前端的依赖
    config.resolve.modules = [
      require('path').resolve(__dirname, 'node_modules'),
      require('path').resolve(__dirname, '../../node_modules'),
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

module.exports = nextConfig;
