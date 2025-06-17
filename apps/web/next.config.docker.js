/** @type {import('next').NextConfig} */
const webpack = require('webpack');
const path = require('path');

const nextConfig = {
  reactStrictMode: true,
  
  // Docker环境使用standalone模式
  output: 'standalone',
  
  // 图片优化配置
  images: {
    unoptimized: true
  },
  
  // 实验性功能
  experimental: {
    missingSuspenseWithCSRBailout: false,
    skipTrailingSlashRedirect: true,
  },
  
  // 忽略构建错误
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // 环境变量
  env: {
    DOCKER_ENV: process.env.DOCKER_ENV || 'true',
    IS_MOBILE_BUILD: 'false', // Docker环境不是移动端构建
  },
  
  // Webpack配置 - 处理内部包路径和依赖
  webpack: (config, { isServer }) => {
    // 定义环境变量
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.IS_MOBILE_BUILD': JSON.stringify('false'),
        'process.env.DOCKER_ENV': JSON.stringify('true'),
      })
    );
    
    // 处理路径别名 - 确保 @ 别名正确指向 src 目录
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, 'src'),
      '@/data': path.resolve(__dirname, 'src/data'),
      '@/components': path.resolve(__dirname, 'src/components'),
      '@/lib': path.resolve(__dirname, 'src/lib'),
      '@/store': path.resolve(__dirname, 'src/store'),
      '@/styles': path.resolve(__dirname, 'src/styles'),
      '@/utils': path.resolve(__dirname, 'src/utils'),
      '@/types': path.resolve(__dirname, 'src/types'),
    };
    
    // 确保模块解析路径正确
    config.resolve.modules = [
      path.resolve(__dirname, 'src'),
      path.resolve(__dirname, 'node_modules'),
      'node_modules'
    ];
    
    // 处理外部依赖
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }
    
    return config;
  },
};

module.exports = nextConfig; 