# 图片代理路径重复问题修复

## 问题描述

在容器环境中，记账附件图片加载时出现404错误，具体表现为URL路径中存在重复的路径段：

**错误的URL**：
```
/api/image-proxy/thumbnail/s3/transaction-attachments/transaction-attachment/2025/07/16/05e1248e-466c-438a-bf5d-82f896de1c91.jpg
```

**实际S3存储路径**：
```
bucket: transaction-attachments
key: transaction-attachment/2025/07/16/05e1248e-466c-438a-bf5d-82f896de1c91.jpg
```

## 根本原因

路径构建逻辑中存在重复：

1. **存储桶名称**：`transaction-attachments`（在`BUCKET_CONFIG.ATTACHMENTS`中定义）
2. **文件分类**：`transaction-attachment`（在上传请求中传递）
3. **S3 key生成**：`${category}/${year}/${month}/${day}/${uuid}${ext}`

最终导致完整路径为：`transaction-attachments/transaction-attachment/...`

## 问题分析

### S3路径构建流程

1. **上传时**：
   ```typescript
   const uploadRequest: FileUploadRequestDto = {
     bucket: BUCKET_CONFIG.ATTACHMENTS, // "transaction-attachments"
     category: 'transaction-attachment', // 问题在这里！
     // ...
   };
   ```

2. **S3键生成**：
   ```typescript
   generateKeyWithPath(category: string, originalName: string): string {
     const uuid = uuidv4();
     const ext = path.extname(originalName);
     const date = new Date();
     const year = date.getFullYear();
     const month = String(date.getMonth() + 1).padStart(2, '0');
     const day = String(date.getDate()).padStart(2, '0');
     
     return `${category}/${year}/${month}/${day}/${uuid}${ext}`;
     // 结果：transaction-attachment/2025/07/16/xxx.jpg
   }
   ```

3. **最终S3路径**：
   ```
   s3://transaction-attachments/transaction-attachment/2025/07/16/xxx.jpg
   ```

4. **图片代理URL**：
   ```
   /api/image-proxy/thumbnail/s3/transaction-attachments/transaction-attachment/2025/07/16/xxx.jpg
   ```

## 修复方案

### 更改文件分类名称

将所有记账附件上传时的`category`从`transaction-attachment`改为`attachments`，避免与存储桶名称重复。

### 修改的文件

1. **`server/src/controllers/transaction-attachment.controller.ts`**
   ```diff
   - category: 'transaction-attachment',
   + category: 'attachments',
   ```

2. **`server/src/controllers/file-storage.controller.ts`**
   ```diff
   - category: 'transaction-attachment',
   + category: 'attachments',
   ```

3. **`server/src/services/wechat.service.ts`**
   ```diff
   - category: 'wechat-attachment',
   + category: 'wechat',
   ```

### 修复后的路径结构

**新的S3路径**：
```
bucket: transaction-attachments
key: attachments/2025/07/16/05e1248e-466c-438a-bf5d-82f896de1c91.jpg
```

**新的图片代理URL**：
```
/api/image-proxy/thumbnail/s3/transaction-attachments/attachments/2025/07/16/05e1248e-466c-438a-bf5d-82f896de1c91.jpg
```

## 验证方法

1. **上传新的记账附件**，确认生成的S3路径正确
2. **访问图片代理API**，确认返回200状态码
3. **前端图片显示**，确认可以正常加载缩略图

## 迁移注意事项

⚠️ **重要提醒**：此修复仅影响**新上传**的文件。现有的文件路径不会改变，仍然可以正常访问。

如果需要迁移现有文件，可以：
1. 保持当前路径结构不变（推荐）
2. 或者编写迁移脚本来重新组织现有文件路径

## 预防措施

为了避免类似问题再次发生：

1. **命名规范**：确保`category`和`bucket`名称不要有重复的路径段
2. **代码审查**：在添加新的文件上传功能时，检查路径构建逻辑
3. **测试覆盖**：包含路径解析的端到端测试

## 相关文件

- `server/src/services/s3-storage.service.ts` - S3路径生成逻辑
- `server/src/services/file-storage.service.ts` - 文件存储服务
- `server/src/controllers/image-proxy.controller.ts` - 图片代理控制器
- `server/src/models/file-storage.model.ts` - 存储桶配置
- `apps/web/src/lib/image-proxy.ts` - 前端图片代理工具 