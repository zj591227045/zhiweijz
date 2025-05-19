import app from './app';
import config from './config/config';
import { connectDatabase, disconnectDatabase } from './config/database';

// 连接数据库
connectDatabase();

// 启动服务器
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`服务器已启动，监听地址: 0.0.0.0:${config.port}`);
  console.log(`环境: ${config.env}`);
});

// 处理进程终止信号
const gracefulShutdown = async () => {
  console.log('正在关闭服务器...');
  server.close(async () => {
    console.log('服务器已关闭');
    await disconnectDatabase();
    process.exit(0);
  });
};

// 监听终止信号
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default server;
