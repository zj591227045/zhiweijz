# S3对象存储系统文档

## 概述

本项目实现了完整的S3对象存储系统，支持文件上传、下载、图片代理等功能。系统采用智能访问策略，根据协议类型和安全需求选择最优的访问方式。

## 目录结构

```
docs/S3/
├── README.md                    # 总体概述
├── storage-architecture.md     # 存储架构设计
├── image-proxy-system.md       # 图片代理系统
├── avatar-system.md            # 头像系统
├── access-policies.md          # 访问策略配置
├── api-reference.md            # API接口文档
└── troubleshooting.md          # 故障排除指南
```

## 核心特性

### 1. 智能访问策略
- **HTTPS + 公开访问**：直接访问（性能最佳）
- **HTTPS + 需要认证**：预签名URL（安全 + 性能）
- **HTTP协议**：代理访问（解决混合内容问题）

### 2. 多存储桶支持
- `avatars`：用户头像存储
- `transaction-attachments`：记账记录附件
- `temp-files`：临时文件
- `system-files`：系统文件

### 3. 认证图片代理
- 自动处理需要认证的图片请求
- 支持Bearer token认证
- 自动转换为blob URL显示
- 内存管理和缓存优化

## 快速开始

### 基本配置

1. **环境变量配置**（server/.env）：
```env
# S3存储配置
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=your-access-key
S3_SECRET_KEY=your-secret-key
S3_REGION=us-east-1
S3_FORCE_PATH_STYLE=true

# 存储桶配置
S3_AVATAR_BUCKET=avatars
S3_ATTACHMENT_BUCKET=transaction-attachments
```

2. **前端存储配置**：
通过管理控制台或localStorage配置后端API地址。

### 使用示例

#### 1. 显示头像
```tsx
import { AvatarDisplay } from '@/components/ui/avatar-display';

<AvatarDisplay
  avatar={user.avatar}
  username={user.name}
  userId={user.id}
  size="large"
/>
```

#### 2. 认证图片显示
```tsx
import { AuthenticatedImage } from '@/components/ui/authenticated-image';

<AuthenticatedImage
  src="/api/image-proxy/s3/avatars/user-avatar.jpg"
  alt="用户头像"
  className="w-16 h-16 rounded-full"
  fallback={<div>加载失败</div>}
/>
```

#### 3. 文件上传
```tsx
import { useFileStorageStatus } from '@/store/file-storage-store';

const { uploadFile } = useFileStorageStatus();

const handleUpload = async (file: File) => {
  const result = await uploadFile(file, 'avatars');
  console.log('上传结果:', result);
};
```

## 系统架构

### 后端组件
- **FileStorageService**：文件存储服务
- **S3StorageService**：S3存储实现
- **ImageProxyController**：图片代理控制器
- **认证中间件**：Bearer token验证

### 前端组件
- **AuthenticatedImage**：认证图片组件
- **AvatarDisplay**：头像显示组件
- **AvatarUploader**：头像上传组件
- **图片代理工具**：URL处理和缓存

## 安全特性

1. **认证保护**：所有API请求需要Bearer token
2. **访问控制**：基于存储桶的访问策略
3. **预签名URL**：临时访问权限
4. **HTTPS强制**：生产环境强制HTTPS
5. **内容类型验证**：文件类型检查

## 性能优化

1. **智能缓存**：URL处理结果缓存
2. **Blob URL管理**：自动清理避免内存泄漏
3. **请求去重**：避免重复的图片请求
4. **CDN友好**：支持CDN加速
5. **压缩优化**：图片自动压缩

## 监控和日志

- 详细的请求日志
- 性能指标监控
- 错误追踪和报告
- 存储使用统计

## 相关文档

- [存储架构设计](./storage-architecture.md)
- [图片代理系统](./image-proxy-system.md)
- [头像系统](./avatar-system.md)
- [访问策略配置](./access-policies.md)
- [API接口文档](./api-reference.md)
- [故障排除指南](./troubleshooting.md)

## 常见问题

### Q: 图片显示失败怎么办？
A: 检查以下几点：
1. 确认后端API地址配置正确
2. 检查认证token是否有效
3. 查看浏览器控制台错误信息
4. 确认S3存储服务正常运行

### Q: 如何配置新的存储桶？
A: 在`apps/web/src/lib/s3-access-config.ts`中添加新的存储桶策略配置。

### Q: 如何优化图片加载性能？
A: 系统已内置多种优化策略，包括缓存、压缩、CDN支持等。

## 版本历史

- **v1.0.0**：基础S3存储功能
- **v1.1.0**：添加图片代理系统
- **v1.2.0**：智能访问策略
- **v1.3.0**：认证图片组件
- **v1.4.0**：性能优化和缓存
