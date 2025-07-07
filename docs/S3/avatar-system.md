# 头像系统

## 概述

头像系统提供完整的用户头像管理功能，支持预设头像选择和自定义头像上传。系统采用混合模式，既保持向后兼容性，又提供现代化的文件存储功能。

## 系统特性

### 1. 多种头像类型支持
- **预设头像**：内置头像库，按类别组织
- **自定义上传**：支持图片文件上传到S3存储
- **Emoji头像**：支持emoji字符作为头像
- **向后兼容**：兼容旧版本的头像格式

### 2. 智能显示机制
- **自动协议处理**：HTTP/HTTPS混合内容问题解决
- **认证代理**：需要认证的图片自动通过代理访问
- **缓存优化**：URL处理结果缓存，提升性能
- **错误降级**：显示失败时自动降级到默认头像

## 核心组件

### 1. 头像显示组件

#### AvatarDisplay
```tsx
interface AvatarDisplayProps {
  avatar?: string;      // 头像ID或URL
  username?: string;    // 用户名（用于首字母显示）
  userId?: string;      // 用户ID（用于代理访问）
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
  alt?: string;
}

// 使用示例
<AvatarDisplay
  avatar={user.avatar}
  username={user.name}
  userId={user.id}
  size="large"
/>
```

#### 显示逻辑
1. **预设头像ID**：查找预设头像库
2. **HTTP/HTTPS URL**：使用AuthenticatedImage组件
3. **Emoji字符**：直接显示文字
4. **空值**：显示用户名首字母

### 2. 头像上传组件

#### AvatarUploader
```tsx
interface AvatarUploaderProps {
  currentAvatar?: string;
  onAvatarChange: (avatar: string) => void;
  disabled?: boolean;
  showPresets?: boolean;
}

// 使用示例
<AvatarUploader
  currentAvatar={user.avatar}
  onAvatarChange={handleAvatarChange}
  showPresets={true}
/>
```

#### 核心功能
1. **文件选择**：支持拖拽和点击选择
2. **图片预处理**：自动压缩和裁剪
3. **实时预览**：上传前预览效果
4. **进度显示**：上传进度实时反馈
5. **错误处理**：详细的错误信息提示

### 3. 预设头像系统

#### 头像库结构
```typescript
// apps/web/src/data/preset-avatars.ts
export interface PresetAvatar {
  id: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
}

export const avatarCategories = [
  { id: 'people', name: '人物', icon: '👤' },
  { id: 'animals', name: '动物', icon: '🐱' },
  { id: 'nature', name: '自然', icon: '🌿' },
  { id: 'objects', name: '物品', icon: '🎨' },
];
```

#### 头像管理
```typescript
// 获取头像URL
export function getAvatarUrlById(id: string): string | null;

// 获取分类头像
export function getAvatarsByCategory(category: string): PresetAvatar[];

// 搜索头像
export function searchAvatars(query: string): PresetAvatar[];
```

## 文件存储集成

### 1. 存储配置
```typescript
// 头像存储桶配置
const AVATAR_BUCKET = 'avatars';
const AVATAR_PATH_PREFIX = 'avatar/';

// 文件命名规则
const generateAvatarPath = (userId: string, fileExtension: string) => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const uuid = generateUUID();
  
  return `${AVATAR_PATH_PREFIX}${year}/${month}/${day}/${uuid}.${fileExtension}`;
};
```

### 2. 上传流程
```typescript
const uploadAvatar = async (file: File): Promise<string> => {
  // 1. 文件验证
  validateAvatarFile(file);
  
  // 2. 图片预处理
  const processedFile = await processAvatarImage(file);
  
  // 3. 上传到S3
  const uploadResult = await fileStorageService.uploadFile(
    processedFile, 
    AVATAR_BUCKET
  );
  
  // 4. 返回访问URL
  return uploadResult.url;
};
```

### 3. 图片处理
```typescript
// 图片压缩和裁剪
const processAvatarImage = async (file: File): Promise<File> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // 设置目标尺寸
  const targetSize = 200;
  canvas.width = targetSize;
  canvas.height = targetSize;
  
  // 加载和绘制图片
  const img = await loadImage(file);
  ctx.drawImage(img, 0, 0, targetSize, targetSize);
  
  // 转换为文件
  return canvasToFile(canvas, 'image/jpeg', 0.8);
};
```

## 访问策略

### 1. 头像存储桶策略
```typescript
// apps/web/src/lib/s3-access-config.ts
avatars: {
  requireAuth: false,        // 头像公开访问
  allowDirectAccess: true,   // 允许直接访问
  presignedUrlTTL: 3600,    // 1小时缓存
  proxyHttpAccess: true,     // HTTP协议使用代理
}
```

### 2. 访问方式
- **HTTPS S3 URL**：直接访问（性能最佳）
- **HTTP S3 URL**：通过代理访问（解决混合内容）
- **预设头像**：静态资源直接访问

## API接口

### 1. 头像上传
```
POST /api/users/me/avatar
Content-Type: multipart/form-data

Body: FormData with 'avatar' file
```

**响应**：
```json
{
  "success": true,
  "data": {
    "url": "http://s3.example.com/avatars/avatar/2025/07/07/uuid.jpg",
    "size": 102400,
    "contentType": "image/jpeg"
  }
}
```

### 2. 头像代理访问
```
GET /api/image-proxy/avatar/:userId
```

**响应**：图片二进制数据

### 3. 用户资料更新
```
PUT /api/users/me/profile
Content-Type: application/json

{
  "avatar": "preset-avatar-1" | "http://s3.example.com/avatars/..."
}
```

## 使用指南

### 1. 基本头像显示
```tsx
import { AvatarDisplay } from '@/components/ui/avatar-display';

function UserProfile({ user }) {
  return (
    <div>
      <AvatarDisplay
        avatar={user.avatar}
        username={user.name}
        userId={user.id}
        size="large"
        alt={`${user.name}的头像`}
      />
      <h2>{user.name}</h2>
    </div>
  );
}
```

### 2. 头像上传功能
```tsx
import { AvatarUploader } from '@/components/profile/avatar-uploader';

function ProfileSettings({ user, onUserUpdate }) {
  const handleAvatarChange = async (newAvatar: string) => {
    try {
      await updateUserProfile({ avatar: newAvatar });
      onUserUpdate({ ...user, avatar: newAvatar });
    } catch (error) {
      console.error('头像更新失败:', error);
    }
  };

  return (
    <AvatarUploader
      currentAvatar={user.avatar}
      onAvatarChange={handleAvatarChange}
      showPresets={true}
    />
  );
}
```

### 3. 批量头像显示
```tsx
import { AvatarDisplay } from '@/components/ui/avatar-display';

function UserList({ users }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {users.map(user => (
        <div key={user.id} className="text-center">
          <AvatarDisplay
            avatar={user.avatar}
            username={user.name}
            userId={user.id}
            size="medium"
          />
          <p>{user.name}</p>
        </div>
      ))}
    </div>
  );
}
```

## 性能优化

### 1. 图片优化
- **自动压缩**：上传时自动压缩到合适大小
- **格式转换**：统一转换为JPEG格式
- **尺寸标准化**：统一头像尺寸规格

### 2. 缓存策略
- **URL处理缓存**：避免重复的URL转换
- **浏览器缓存**：设置合适的缓存头
- **CDN加速**：支持CDN分发

### 3. 加载优化
- **懒加载**：视口外的头像延迟加载
- **预加载**：关键头像提前加载
- **降级显示**：加载失败时显示默认头像

## 安全考虑

### 1. 文件验证
```typescript
const validateAvatarFile = (file: File) => {
  // 文件类型检查
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('不支持的文件类型');
  }
  
  // 文件大小检查
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('文件大小超过限制');
  }
};
```

### 2. 访问控制
- **认证检查**：上传需要用户认证
- **权限验证**：只能修改自己的头像
- **内容过滤**：检查图片内容合规性

## 故障排除

### 常见问题

1. **头像显示为空**
   - 检查用户avatar字段值
   - 确认S3存储服务状态
   - 查看浏览器控制台错误

2. **上传失败**
   - 检查文件格式和大小
   - 确认网络连接状态
   - 查看后端错误日志

3. **加载缓慢**
   - 优化图片大小
   - 检查网络带宽
   - 考虑使用CDN

### 调试技巧

1. **启用详细日志**：
```typescript
const processedUrl = processAvatarUrl(avatar, userId, true);
```

2. **检查存储状态**：
```typescript
const { isStorageAvailable } = useFileStorageStatus();
console.log('存储可用:', isStorageAvailable);
```

3. **监控上传进度**：
```typescript
<AvatarUploader
  onProgress={(progress) => console.log('上传进度:', progress)}
  onError={(error) => console.error('上传错误:', error)}
/>
```
