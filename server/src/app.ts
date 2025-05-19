import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import config from './config/config';
import routes from './routes';

// 创建Express应用
const app: Express = express();

// 配置中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// 配置CORS，允许所有来源的请求
app.use(cors({
  origin: '*', // 允许所有来源的请求
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // 允许跨域访问资源
}));
app.use(morgan(config.env === 'development' ? 'dev' : 'combined'));

// 配置静态文件服务
const dataDir = path.join(process.cwd(), '..', 'data');
app.use('/data', express.static(dataDir));

// 根路由
app.get('/', (req: Request, res: Response) => {
  res.json({ message: '欢迎使用只为记账API' });
});

// API路由
app.use('/api', routes);

// 404处理
app.use((req: Request, res: Response) => {
  res.status(404).json({ message: '未找到请求的资源' });
});

// 错误处理中间件
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    message: '服务器内部错误',
    error: config.env === 'development' ? err.message : undefined,
  });
});

export default app;
