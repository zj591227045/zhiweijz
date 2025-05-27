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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// 配置CORS，允许所有来源的请求
app.use(cors({
  origin: true, // 允许所有来源的请求，使用true而不是'*'以支持credentials
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  optionsSuccessStatus: 200 // 支持旧版浏览器
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' } // 允许跨域访问资源
}));

// 处理预检请求
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24小时
    return res.status(200).end();
  }
  next();
});

// 精简的日志格式，只记录重要信息
const logFormat = config.env === 'development'
  ? ':method :url :status :res[content-length] - :response-time ms'
  : ':remote-addr - :method :url :status :res[content-length] - :response-time ms';

app.use(morgan(logFormat, {
  // 过滤掉健康检查请求的日志
  skip: (req, res) => req.url === '/api/health'
}));

// 配置静态文件服务
const dataDir = path.join(process.cwd(), '..', 'data');
app.use('/data', express.static(dataDir));

// 根路由
app.get('/', (req: Request, res: Response) => {
  res.json({ message: '欢迎使用只为记账API' });
});

// 健康检查端点
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env
  });
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
