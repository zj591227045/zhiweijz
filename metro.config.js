const {getDefaultConfig} = require('@react-native/metro-config');
const path = require('path');

// 设置项目根目录为 apps/android
const projectRoot = path.resolve(__dirname, 'apps/android');
const config = getDefaultConfig(projectRoot);

// 配置Metro服务器绑定到所有网络接口
config.server = {
  host: '0.0.0.0',  // 绑定到所有网络接口
  port: 8181,       // 使用8181端口避免冲突
};

// 配置项目根目录和监视目录
config.projectRoot = projectRoot;
config.watchFolders = [
  projectRoot,
  path.resolve(__dirname, 'node_modules'),
];

module.exports = config;
