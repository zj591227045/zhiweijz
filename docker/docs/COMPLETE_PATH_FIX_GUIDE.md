# 图片代理路径重复问题完整修复指南

## 问题描述

容器环境中图片加载出现404错误，URL显示重复的路径段：
```
/api/image-proxy/thumbnail/s3/transaction-attachments/transaction-attachment/2025/07/16/xxx.jpg
```

**根本原因**: 存储桶名称`transaction-attachments`与文件分类`transaction-attachment`造成路径重复。

## 解决方案概述

将所有文件上传的category从`transaction-attachment`改为`attachments`，避免与存储桶名称重复。

## 修复文件清单

### ✅ 已修复的后端文件

1. **`server/src/controllers/transaction-attachment.controller.ts`**
   ```typescript
   // 修改前
   category: 'transaction-attachment'
   // 修改后  
   category: 'attachments'
   ```

2. **`server/src/controllers/file-storage.controller.ts`**
   ```typescript
   // 修改前
   category: 'transaction-attachment'
   // 修改后
   category: 'attachments'
   ```

3. **`server/src/services/wechat.service.ts`**
   ```typescript
   // 修改前
   category: 'wechat-attachment'
   // 修改后
   category: 'wechat'
   ```

### ✅ 已修复的前端文件

4. **`packages/mobile/src/components/transactions/mobile-attachment-upload.tsx`**
   ```typescript
   // 修改前
   formData.append('category', 'transaction-attachment');
   // 修改后
   formData.append('category', 'attachments');
   ```

5. **`apps/web/src/components/transactions/transaction-attachment-upload.tsx`**
   ```typescript
   // 修改前
   formData.append('category', 'transaction-attachment');
   // 修改后
   formData.append('category', 'attachments');
   ```

## 路径格式对比

### ❌ 修复前（问题格式）
- **存储桶**: `transaction-attachments`
- **S3 Key**: `transaction-attachment/2025/07/16/xxx.jpg`
- **完整路径**: `transaction-attachments/transaction-attachment/2025/07/16/xxx.jpg`
- **URL**: `/thumbnail/s3/transaction-attachments/transaction-attachment/...` ❌

### ✅ 修复后（正确格式）
- **存储桶**: `transaction-attachments` 
- **S3 Key**: `attachments/2025/07/16/xxx.jpg`
- **完整路径**: `transaction-attachments/attachments/2025/07/16/xxx.jpg`
- **URL**: `/thumbnail/s3/transaction-attachments/attachments/...` ✅

## 部署步骤

### 1. 重新构建容器镜像
```bash
# 构建新的镜像
docker build -t your-app:latest .
```

### 2. 停止并重启容器
```bash
# 停止现有容器
docker-compose down

# 启动新容器
docker-compose up -d
```

### 3. 清理前端缓存
- 浏览器硬刷新 (Ctrl+F5 或 Cmd+Shift+R)
- 清除浏览器缓存
- 或使用隐私模式测试

## 验证步骤

### 1. 运行容器调试脚本
```bash
# 进入容器
docker exec -it <container-name> bash

# 运行调试脚本
/app/docker/scripts/debug-container-services.sh
```

### 2. 测试新文件上传
1. 上传一个新的交易附件
2. 检查生成的URL格式
3. 验证图片能否正常显示

### 3. 检查路径格式
```bash
# 运行路径检查脚本
node docker/scripts/check-upload-path.js
```

### 4. 验证MinIO存储
- 登录MinIO控制台 (http://10.255.0.75:9000)
- 检查`transaction-attachments`存储桶
- 确认新文件存储在`attachments/`目录下

## 重要说明

### 向后兼容性
- ✅ 现有文件路径保持不变，仍可正常访问
- ✅ 新上传的文件使用新格式
- ✅ 不影响现有功能

### 测试清单
- [ ] 容器完全重启
- [ ] 前端缓存清理  
- [ ] 新文件上传测试
- [ ] 图片代理服务测试
- [ ] 旧文件访问测试

## 故障排除

### 如果新文件仍显示旧格式URL
1. 检查容器是否使用最新镜像
2. 确认前端代码已更新
3. 清除浏览器缓存
4. 检查数据库中文件记录的category字段

### 如果图片仍然404
1. 运行调试脚本检查MinIO连接
2. 验证存储桶和文件是否存在
3. 检查图片代理服务日志
4. 确认S3配置正确

### 调试命令
```bash
# 检查容器日志
docker logs <container-name>

# 进入容器检查
docker exec -it <container-name> bash

# 测试MinIO连接
curl -v http://10.255.0.75:9000/minio/health/live

# 测试图片代理
curl -v http://localhost:3000/api/image-proxy/info/transaction-attachments/test
```

## 完成确认

修复完成后，您应该看到：
1. ✅ 新上传文件URL格式：`/thumbnail/s3/transaction-attachments/attachments/...`
2. ✅ 图片能正常显示，不再出现404错误
3. ✅ 容器调试脚本显示所有服务正常
4. ✅ MinIO中文件存储在正确路径 