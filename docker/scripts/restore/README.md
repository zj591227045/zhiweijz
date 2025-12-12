# S3 对象存储恢复工具

独立运行版本 - 无需 Docker 容器环境

## 功能特性

- ✅ 直接从 WebDAV 读取备份文件
- ✅ 直接写入 S3 对象存储
- ✅ 无需 Docker 容器环境
- ✅ 无需依赖项目其他模块
- ✅ 支持配置文件管理
- ✅ 交互式快照选择
- ✅ 实时进度显示

## 系统要求

- Node.js >= 18.0.0
- 网络访问：能够连接到 WebDAV 服务器和 S3 服务器

## 快速开始

### 1. 准备配置文件

复制示例配置并修改：

```bash
cd docker/scripts/restore
cp restore-config.example.json restore-config.json
```

编辑 `restore-config.json`，填入你的实际配置：

```json
{
  "webdav": {
    "url": "https://your-webdav-server.com",
    "username": "your-username",
    "password": "your-password",
    "basePath": "/Backup/zhiweijz/S3/"
  },
  "s3": {
    "endpoint": "http://your-s3-server:9000",
    "accessKeyId": "your-access-key",
    "secretAccessKey": "your-secret-key",
    "region": "us-east-1"
  }
}
```

### 2. 运行恢复工具

```bash
./restore.sh
```

首次运行会自动安装依赖包。

### 3. 按提示操作

工具会引导你完成以下步骤：

1. 加载配置
2. 验证 S3 权限
3. 连接 WebDAV 服务器
4. 列出可用备份快照
5. 选择要恢复的快照
6. 确认并执行恢复

## 高级用法

### 指定配置文件

```bash
./restore.sh --config /path/to/your-config.json
```

### 调试模式

```bash
DEBUG=1 ./restore.sh
```

## 配置说明

### WebDAV 配置

- `url`: WebDAV 服务器地址
- `username`: 用户名
- `password`: 密码
- `basePath`: 备份文件的基础路径

### S3 配置

- `endpoint`: S3 服务器地址（MinIO/AWS S3）
- `accessKeyId`: 访问密钥 ID
- `secretAccessKey`: 访问密钥
- `region`: 区域（默认 us-east-1）

## 工作原理

```
WebDAV 备份服务器
    ↓
下载快照元数据 (snapshots/*.json)
    ↓
用户选择恢复时间点
    ↓
下载对象文件 (objects/*)
    ↓
上传到 S3 对象存储
```

## 注意事项

⚠️ **重要警告**

- 恢复操作会**覆盖**现有 S3 存储中的同名文件
- 建议在恢复前备份当前 S3 数据
- 确保有足够的网络带宽和存储空间

## 故障排查

### 问题：找不到 Node.js

```bash
# macOS
brew install node

# Ubuntu/Debian
sudo apt install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm
```

### 问题：WebDAV 连接失败

- 检查 URL 是否正确（包括协议 http/https）
- 检查用户名和密码
- 检查网络连接和防火墙

### 问题：S3 权限验证失败

- 检查 endpoint 地址是否正确
- 检查 accessKeyId 和 secretAccessKey
- 确保 S3 用户有 `temp-files` 桶的读写权限

### 问题：找不到备份快照

- 检查 WebDAV basePath 是否正确
- 确保 `basePath/snapshots/` 目录存在
- 确保有 `full_*.json` 或 `incr_*.json` 文件

## 技术细节

### 依赖包

- `@aws-sdk/client-s3`: AWS S3 官方 SDK
- `webdav`: WebDAV 客户端库

### 临时文件

临时文件存储在系统临时目录：

- macOS/Linux: `/tmp/zhiweijz-s3-restore/`
- Windows: `%TEMP%\zhiweijz-s3-restore\`

恢复完成后会自动清理。

## 许可证

与主项目保持一致
