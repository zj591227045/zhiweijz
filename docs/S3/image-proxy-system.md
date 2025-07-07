# 图片代理系统

## 概述

图片代理系统是为了解决HTTPS/HTTP混合内容问题而设计的。当应用通过HTTPS加载时，无法直接访问HTTP协议的S3存储图片，需要通过后端代理来中转访问。

## 系统架构

```
前端应用 (HTTPS) 
    ↓
认证图片组件 (AuthenticatedImage)
    ↓
后端代理API (/api/image-proxy)
    ↓
S3存储服务 (HTTP/HTTPS)
```

## 核心组件

### 1. 后端代理API

#### ImageProxyController
```typescript
// server/src/controllers/image-proxy.controller.ts
export class ImageProxyController {
  // 通用S3图片代理
  async proxyS3Image(req: Request, res: Response): Promise<void>
  
  // 用户头像代理
  async proxyUserAvatar(req: Request, res: Response): Promise<void>
  
  // 获取图片信息
  async getImageInfo(req: Request, res: Response): Promise<void>
}
```

#### 路由配置
```typescript
// server/src/routes/image-proxy.routes.ts
router.get('/s3/:bucket/*', proxyS3Image);           // 通用S3代理
router.get('/avatar/:userId', proxyUserAvatar);      // 用户头像代理
router.get('/info/:bucket/*', getImageInfo);         // 图片信息
```

### 2. 前端认证组件

#### AuthenticatedImage组件
```typescript
// apps/web/src/components/ui/authenticated-image.tsx
interface AuthenticatedImageProps {
  src: string;                    // 图片URL
  alt: string;                    // 替代文本
  className?: string;             // CSS类名
  style?: React.CSSProperties;    // 内联样式
  onLoad?: () => void;           // 加载完成回调
  onError?: (error: Error) => void; // 错误回调
  fallback?: React.ReactNode;     // 错误时显示的内容
}
```

#### 核心功能
1. **自动认证**：从localStorage获取token并添加到请求头
2. **Blob URL转换**：将图片数据转换为blob URL显示
3. **内存管理**：自动清理blob URL避免内存泄漏
4. **错误处理**：提供fallback机制
5. **加载状态**：显示加载动画

### 3. 智能URL处理

#### processAvatarUrl函数
```typescript
// apps/web/src/lib/image-proxy.ts
export function processAvatarUrl(
  avatarUrl: string, 
  userId?: string, 
  enableDebug?: boolean
): string
```

#### 处理逻辑
1. **缓存检查**：避免重复处理相同URL
2. **协议判断**：HTTP使用代理，HTTPS直接访问
3. **认证需求**：根据存储桶策略决定访问方式
4. **URL转换**：生成代理API URL

## 访问策略

### 策略配置
```typescript
// apps/web/src/lib/s3-access-config.ts
export const S3_ACCESS_POLICIES: Record<string, S3AccessPolicy> = {
  avatars: {
    requireAuth: false,        // 不需要认证
    allowDirectAccess: true,   // 允许直接访问
    presignedUrlTTL: 3600,    // 预签名URL过期时间
    proxyHttpAccess: true,     // 代理HTTP访问
  },
  'transaction-attachments': {
    requireAuth: true,         // 需要认证
    allowDirectAccess: true,   // 允许直接访问
    presignedUrlTTL: 1800,    // 30分钟过期
    proxyHttpAccess: true,     // 代理HTTP访问
  }
};
```

### 访问方式选择
1. **直接访问**：HTTPS + 公开资源
2. **预签名URL**：HTTPS + 需要认证
3. **代理访问**：HTTP协议或强制代理

## API接口

### 1. 通用S3图片代理
```
GET /api/image-proxy/s3/:bucket/*
```

**参数**：
- `bucket`：存储桶名称
- `*`：文件路径（支持多级目录）

**示例**：
```
GET /api/image-proxy/s3/avatars/avatar/2025/07/07/user-avatar.jpg
```

### 2. 用户头像代理
```
GET /api/image-proxy/avatar/:userId
```

**参数**：
- `userId`：用户ID

**示例**：
```
GET /api/image-proxy/avatar/user-123
```

### 3. 图片信息获取
```
GET /api/image-proxy/info/:bucket/*
```

**返回**：
```json
{
  "success": true,
  "data": {
    "bucket": "avatars",
    "key": "avatar/user.jpg",
    "contentType": "image/jpeg",
    "contentLength": 102400,
    "lastModified": "2025-07-07T10:00:00Z",
    "etag": "\"abc123\""
  }
}
```

## 使用指南

### 1. 基本用法
```tsx
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

// 显示需要认证的图片
<AuthenticatedImage
  src="/api/image-proxy/s3/avatars/user-avatar.jpg"
  alt="用户头像"
  className="w-16 h-16 rounded-full"
  fallback={<div>加载失败</div>}
/>
```

### 2. 头像显示
```tsx
import { AvatarDisplay } from '@/components/ui/avatar-display';

// 自动处理头像URL
<AvatarDisplay
  avatar={user.avatar}
  username={user.name}
  userId={user.id}
  size="large"
/>
```

### 3. 手动URL处理
```tsx
import { processAvatarUrl } from '@/lib/image-proxy';

const processedUrl = processAvatarUrl(originalUrl, userId, true);
```

## 性能优化

### 1. 缓存策略
- **URL处理缓存**：避免重复计算
- **Blob URL缓存**：复用已加载的图片
- **HTTP缓存**：设置适当的缓存头

### 2. 内存管理
- **自动清理**：组件卸载时清理blob URL
- **缓存限制**：限制缓存大小防止内存泄漏
- **请求取消**：组件卸载时取消进行中的请求

### 3. 错误处理
- **重试机制**：网络错误时自动重试
- **降级策略**：代理失败时回退到直接访问
- **用户反馈**：提供清晰的错误信息

## 安全考虑

### 1. 认证验证
- **Token验证**：每个请求验证Bearer token
- **用户权限**：检查用户是否有权访问资源
- **请求限制**：防止恶意请求

### 2. 内容安全
- **文件类型检查**：验证文件MIME类型
- **大小限制**：限制代理文件大小
- **路径验证**：防止路径遍历攻击

## 故障排除

### 常见问题

1. **图片显示失败**
   - 检查认证token是否有效
   - 确认后端API地址配置正确
   - 查看网络请求错误信息

2. **加载速度慢**
   - 检查S3存储服务性能
   - 优化图片大小和格式
   - 考虑使用CDN加速

3. **内存泄漏**
   - 确保组件正确清理blob URL
   - 检查缓存大小限制
   - 监控内存使用情况

### 调试工具

1. **启用调试日志**：
```typescript
const processedUrl = processAvatarUrl(url, userId, true);
```

2. **查看访问策略**：
```typescript
import { debugAccessPolicy } from '@/lib/s3-access-config';
debugAccessPolicy(s3Url);
```

3. **监控网络请求**：
使用浏览器开发者工具查看网络请求详情。
