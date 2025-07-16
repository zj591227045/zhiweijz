# 对象存储配置迁移说明

## 概述

为了更好的配置管理和避免混淆，对象存储配置已从Docker环境变量迁移到数据库管理。

## 配置变更

### 🔄 迁移前 (环境变量配置)
```yaml
# docker-compose.yml
environment:
  S3_ENDPOINT: http://minio:9000
  S3_ACCESS_KEY_ID: zhiweijz
  S3_SECRET_ACCESS_KEY: zhiweijz123456
  S3_REGION: us-east-1
  S3_BUCKET_AVATARS: avatars
  S3_BUCKET_ATTACHMENTS: transaction-attachments
  S3_BUCKET_TEMP: temp-files
  S3_BUCKET_SYSTEM: system-files
```

### ✅ 迁移后 (数据库配置)
```yaml
# docker-compose.yml
environment:
  # 注意：S3存储配置已移至管理后台数据库配置
  # 如需配置对象存储，请在应用启动后通过管理后台进行配置
```

配置现在保存在数据库的 `system_config` 表中：
```sql
SELECT key, value FROM system_config WHERE category = 'storage';
```

## 配置方法

### 1. 访问管理后台
- URL: `http://localhost:3000/admin` (或相应的部署地址)
- 登录管理员账户

### 2. 导航到存储配置
- 系统设置 → 存储配置
- 或直接访问: `/admin/storage`

### 3. 配置对象存储
支持多种存储服务：
- **MinIO** (本地部署)
- **Amazon S3**
- **阿里云OSS** 
- **腾讯云COS**
- **华为云OBS**

### 4. MinIO默认配置
```javascript
{
  enabled: true,
  storageType: "S3",
  endpoint: "http://minio:9000",
  accessKeyId: "zhiweijz",
  secretAccessKey: "zhiweijz123456",
  region: "us-east-1",
  buckets: {
    avatars: "avatars",
    attachments: "transaction-attachments",
    temp: "temp-files",
    system: "system-files"
  }
}
```

## 优势

### ✅ 配置管理
- **集中管理**: 所有配置在管理后台统一管理
- **实时生效**: 配置更改无需重启容器
- **配置验证**: 内置连接测试和配置验证
- **模板支持**: 提供多种云服务商配置模板

### ✅ 安全性
- **数据库存储**: 配置安全保存在数据库中
- **访问控制**: 仅管理员可修改存储配置
- **凭据保护**: 敏感信息在界面中隐藏显示

### ✅ 灵活性
- **多环境支持**: 开发/测试/生产环境独立配置
- **动态切换**: 可在不同存储服务间切换
- **存储桶管理**: 自动创建和验证存储桶

## 图片代理服务

### 工作原理
1. **配置读取**: 从数据库读取存储配置
2. **服务初始化**: 根据配置初始化S3服务
3. **代理请求**: 处理前端的图片请求
4. **认证验证**: 验证用户访问权限
5. **文件传输**: 从存储下载并返回文件

### API端点
```
GET /api/image-proxy/s3/{bucket}/{path}          # 通用S3图片代理
GET /api/image-proxy/thumbnail/s3/{bucket}/{path} # 缩略图生成
GET /api/image-proxy/avatar/{userId}             # 用户头像代理
GET /api/image-proxy/info/{bucket}/{path}        # 图片信息获取
```

### 支持功能
- ✅ **认证访问**: 支持Bearer Token认证
- ✅ **缩略图生成**: 实时生成指定尺寸缩略图
- ✅ **格式转换**: 支持JPEG/PNG/WebP格式输出
- ✅ **缓存优化**: HTTP缓存头优化
- ✅ **错误处理**: 完善的错误处理和日志

## 故障排除

### 1. 检查配置
```bash
cd docker
./scripts/diagnose-image-proxy-db.sh
```

### 2. 检查数据库配置
```sql
-- 连接到PostgreSQL
docker exec -it zhiweijz-postgres psql -U postgres -d zhiweijz

-- 查看存储配置
SELECT key, value FROM system_config WHERE category = 'storage';
```

### 3. 检查MinIO存储桶
```bash
# 进入MinIO容器
docker exec -it zhiweijz-minio sh

# 配置客户端
mc alias set local http://localhost:9000 zhiweijz zhiweijz123456

# 列出存储桶
mc ls local

# 检查特定文件
mc stat local/transaction-attachments/path/to/file.jpg
```

### 4. 测试图片代理
```bash
# 测试健康检查
curl http://localhost:3000/api/health

# 测试图片代理路由 (需要认证)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3000/api/image-proxy/info/transaction-attachments/test
```

## 常见问题

### Q: 为什么移除Docker环境变量配置？
**A**: 避免配置来源混淆，统一使用数据库配置管理，提供更好的用户体验。

### Q: 旧的环境变量配置还有效吗？
**A**: 不再有效。系统现在完全依赖数据库配置。

### Q: 如何备份存储配置？
**A**: 备份数据库中的 `system_config` 表即可。

### Q: 支持哪些存储服务？
**A**: 支持所有S3兼容的存储服务，包括MinIO、AWS S3、阿里云OSS、腾讯云COS、华为云OBS等。

### Q: 配置更改后需要重启吗？
**A**: 不需要。配置更改会自动重新加载存储服务。

## 迁移清单

- [x] 移除Docker配置文件中的S3环境变量
- [x] 更新代码以从数据库读取配置
- [x] 提供管理后台配置界面
- [x] 创建配置验证和测试功能
- [x] 提供诊断工具和文档
- [x] 保持向后兼容性（过渡期）

## 注意事项

1. **首次部署**: 需要通过管理后台配置存储服务
2. **配置备份**: 定期备份数据库配置
3. **权限管理**: 仅管理员可修改存储配置
4. **监控**: 定期检查存储服务状态和连接 