import { Request, Response, NextFunction } from 'express';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXML = promisify(parseString);

/**
 * 微信XML解析中间件
 */
export const parseWechatXML = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 只处理POST请求的XML数据
    if (req.method !== 'POST') {
      return next();
    }

    // 获取原始XML数据
    let xmlData = '';
    
    req.on('data', (chunk) => {
      xmlData += chunk.toString();
    });

    req.on('end', async () => {
      try {
        if (xmlData) {
          // 解析XML
          const result = await parseXML(xmlData) as any;

          // 将解析后的数据添加到请求对象
          req.body = result.xml || {};
          req.rawBody = xmlData;
        }
        next();
      } catch (error) {
        console.error('XML解析失败:', error);
        res.status(400).send('Invalid XML format');
      }
    });

    req.on('error', (error) => {
      console.error('请求数据读取失败:', error);
      res.status(400).send('Request data error');
    });

  } catch (error) {
    console.error('微信XML中间件错误:', error);
    res.status(500).send('Internal server error');
  }
};

/**
 * 微信签名验证中间件
 */
export const verifyWechatSignature = (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signature, timestamp, nonce } = req.query;

    // 记录请求详情用于调试
    console.log('微信请求参数:', {
      method: req.method,
      path: req.path,
      query: req.query,
      headers: {
        'user-agent': req.get('User-Agent'),
        'content-type': req.get('Content-Type')
      }
    });

    if (!signature || !timestamp || !nonce) {
      console.log('缺少必需的微信验证参数:', { signature, timestamp, nonce });
      // 对于微信回调，返回简单的错误信息而不是JSON
      return res.status(400).send('Missing required parameters');
    }

    // 将验证参数添加到请求对象
    req.wechatParams = {
      signature: signature as string,
      timestamp: timestamp as string,
      nonce: nonce as string,
      echostr: req.query.echostr as string
    };

    next();
  } catch (error) {
    console.error('微信签名验证中间件错误:', error);
    res.status(500).send('Internal server error');
  }
};

/**
 * 微信错误处理中间件
 */
export const wechatErrorHandler = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('微信服务错误:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query
  });

  // 对于微信服务器的请求，总是返回success避免重试
  if (req.path.includes('/wechat/')) {
    return res.send('success');
  }

  // 其他请求返回JSON错误
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
};

/**
 * 微信请求日志中间件
 */
export const wechatLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // 记录请求开始
  console.log(`[微信请求] ${req.method} ${req.path}`, {
    query: req.query,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // 监听响应结束
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[微信响应] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
};

// 扩展Request接口
declare global {
  namespace Express {
    interface Request {
      wechatParams?: {
        signature: string;
        timestamp: string;
        nonce: string;
        echostr?: string;
      };
      rawBody?: string;
    }
  }
}
