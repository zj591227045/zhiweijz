# 只为记账 (ZhiWeiJZ)

一个简单、纯粹的，AI驱动的移动端记账工具。

## 🎉 最新版本 v0.8.0 重大更新

### 新增功能
- 🖼️ **图片识别多记录选择导入**: 智能识别图片中的多个记账信息，支持用户选择性导入
- 📱 **安卓客户端快捷记账**: 新增安卓端快捷记账功能，提升记账效率
- 💰 **算分摊功能**: 增加费用分摊计算功能，支持多人共同支出的智能分摊
- 🚀 **火山方舟大模型**: 集成火山方舟大模型，提供更强大的AI分析能力
- ⚡ **禁用LLM推理选项**: 增加禁用LLM推理功能，显著提高响应速度
- ✅ **签到状态优化**: 完善用户中心签到按钮，增加已签到状态的快速查看功能

### 问题修复
- 🎯 **智能记账预算匹配**: 修复智能记账服务没有有效匹配预算的问题
- 🗑️ **安卓删除按钮**: 修复安卓应用编辑记账页面删除记录按钮显示问题
- 📅 **跨月预算生成**: 修复跨月没有生成托管用户个人预算的问题
- 📝 **iOS多条记录识别**: 修复iOS快捷记账不能识别多条记账记录的问题
- 🔄 **记账类型更新**: 修复修改记账类型后更新记账失败的问题

### 历史版本
- 📋 [v0.7.0 更新日志](docs/version/v0.7.0-changelog.md) - 图片查看器优化、iOS Apple充值、智能记账增强等

## 项目概述

"只为记账"是一个专注于移动端体验的记账应用，采用B/S架构，支持多用户访问和家庭账本共享。应用通过AI技术提供智能化的财务管理体验，帮助用户更好地理解自己的消费模式，优化预算管理。

## 核心功能

- **记账功能**: 支持收入、支出记账，自定义分类管理
- **标签管理**: 灵活的标签系统，支持多维度记账分类
- **预算管理**: 个人和家庭预算设置，支持预算透支顺延
- **家庭账本**: 多用户共享账本，支持未注册用户(如孩子)的支出记录
- **AI驱动**: 智能记账分类，消费模式分析，预算建议，集成火山方舟等多种大模型
- **多模态记账**: 支持文字、语音、图片多种记账方式，图片识别支持多记录选择导入
- **日历视图**: 直观的日历界面查看每日记账情况
- **附件管理**: 为记账记录添加图片附件，支持快速预览
- **对象存储**: 集成S3协议兼容存储，支持自定义头像和附件存储
- **微信集成**: 支持微信公众号智能记账，包含语音和图片识别
- **统计分析**: 多维度数据分析，包含支出预算分布和预算统计分析等丰富图表
- **会员系统**: 完整的会员体系和记账点计费机制，支持签到功能和分摊计算
- **版本管理**: 完整的应用版本管理系统，支持版本检查、更新日志和用户状态跟踪
- **数据管理**: 支持数据导入导出，用户头像设置，账户注销等完整功能
- **移动客户端**: 原生iOS和Android应用，完整的移动端体验，支持振动反馈和快捷记账功能

## 技术栈

- **前端**: React + Next.js, Tailwind CSS
- **移动端**: React Native, React Native Paper
- **后端**: Node.js
- **数据库**: PostgreSQL
- **对象存储**: S3协议兼容存储 (MinIO/AWS S3)
- **AI服务**: 多模态AI集成 (语音识别、图像识别)
- **认证**: JWT (JSON Web Tokens)
- **项目结构**: Monorepo (Yarn Workspaces)

## 项目结构

本项目采用Monorepo结构，使用Yarn Workspaces管理多个包：

```
zhiweijz/
├── packages/                # 共享包
│   ├── core/                # 核心业务逻辑和类型定义
│   ├── web/                 # Web端特定组件和功能
│   └── mobile/              # 移动端特定组件和功能
├── apps/                    # 应用
│   ├── web/                 # Web应用
│   ├── android/             # Android应用
│   └── ios/                 # iOS应用
├── server/                  # 后端服务
├── docker/                  # Docker部署配置
├── docs/                    # 项目文档
└── package.json             # 根配置
```

## 🚀 快速部署 (Docker)

### 简化部署（仅依赖 docker-compose.yml 和 .env.example）

如果您希望使用最简单的方式进行部署，仅需要使用 `docker-compose.yml` 和 `.env.example` 文件：

#### 前置要求

- Docker 20.10.0+
- Docker Compose 2.0.0+
- 至少 2GB 可用内存
- 至少 5GB 可用磁盘空间

#### 部署步骤

```bash
# 1. 克隆项目
git clone https://github.com/zj591227045/zhiweijz.git
cd zhiweijz/docker

# 2. 复制并配置环境变量
cp .env.example .env

# 3. 启动所有服务
docker-compose up -d

# 4. 等待服务启动完成（约2-3分钟）
docker-compose logs -f
```

#### 环境变量配置说明

在 `.env` 文件中，您可以根据需要修改以下关键配置：

```bash
# 项目名称
PROJECT_NAME=zhiweijz

# 数据库配置
DB_NAME=zhiweijz
DB_USER=zhiweijz
DB_PASSWORD=zhiweijz123  # 建议修改为更安全的密码

# JWT密钥
JWT_SECRET=your-super-secret-jwt-key-change-in-production-please  # 必须修改

# 端口配置（如果有端口冲突，可以修改这些端口）
POSTGRES_EXTERNAL_PORT=5433  # PostgreSQL外部端口
NGINX_HTTP_PORT=80           # Web应用HTTP端口
NGINX_HTTPS_PORT=443         # Web应用HTTPS端口
MINIO_API_PORT=9000          # MinIO API端口
MINIO_CONSOLE_PORT=9001      # MinIO管理界面端口

# MinIO对象存储配置
MINIO_ROOT_USER=zhiweijz
MINIO_ROOT_PASSWORD=zhiweijz123456  # 建议修改为更安全的密码

# 镜像版本（可根据需要切换版本）
BACKEND_IMAGE_VERSION=0.8.0
FRONTEND_IMAGE_VERSION=0.8.0
NGINX_IMAGE_VERSION=0.8.0
```

#### 访问应用

部署成功后，您可以通过以下地址访问：

- **主应用**: http://localhost
- **MinIO管理界面**: http://localhost:9001
- **API文档**: http://localhost/api
- **健康检查**: http://localhost/health

#### 服务管理命令

```bash
# 查看所有服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f [service_name]

# 重启特定服务
docker-compose restart [service_name]

# 停止所有服务
docker-compose down

# 停止并删除所有数据（谨慎使用）
docker-compose down -v

# 更新到最新版本
docker-compose pull
docker-compose up -d
```

#### 故障排除

**常见问题及解决方案：**

1. **端口冲突**：修改 `.env` 文件中的端口配置
2. **服务启动失败**：检查 Docker 日志 `docker-compose logs [service_name]`
3. **数据库连接问题**：确保 PostgreSQL 服务健康 `docker-compose ps postgres`
4. **内存不足**：确保系统有足够的可用内存

**健康检查：**

```bash
# 检查所有服务是否健康
docker-compose ps

# 检查特定服务健康状态
docker-compose exec backend curl -f http://localhost:3000/api/health
docker-compose exec frontend curl -f http://localhost:3001/
```

### 一键部署（使用脚本）

如果您需要更完整的部署体验，包括自动配置和优化，可以使用我们提供的部署脚本：

```bash
# 1. 克隆项目
git clone https://github.com/zj591227045/zhiweijz.git
cd zhiweijz

# 2. 进入docker目录
cd docker

# 3. 一键启动
./start.sh
```

### 访问应用

部署完成后，脚本会自动显示访问地址：
- **Web应用**: http://localhost (或自定义端口)
- **API接口**: http://localhost/api
- **数据库**: localhost:5432

### 版本更新

**升级到v0.8.0的步骤**：

```bash
# 1. 获取最新代码
cd zhiweijz
git pull

# 2. 备份数据库（可选但推荐）
cp scripts/database/db_backup/config.conf.template scripts/database/db_backup/config.env
# 编辑配置文件，设置数据库用户名和密码
vim scripts/database/db_backup/config.env
./scripts/database/db_backup/backup.sh full

# 3. 拉取最新docker镜像并更新
cd docker
docker-compose -p zhiweijz pull
docker-compose -p zhiweijz up -d
```

**v0.8.0版本重要提醒**：
- 新增图片识别多记录选择导入功能
- Android客户端新增快捷记账功能
- 集成火山方舟大模型，提供更强AI能力
- 新增分摊计算功能，支持多人共同支出
- 优化签到功能，提升用户体验
- 修复多个关键问题，提升系统稳定性
- 建议在升级前备份数据库

**v0.7.0版本重要提醒**：
- 图片查看器交互优化，改为长按操作
- iOS Apple充值功能完整对接
- 智能记账功能大幅增强，支持多条记录识别
- 修复了大量用户反馈的问题，提升整体稳定性
- 建议在升级前备份数据库

**v0.6.0版本重要提醒**：
- 新增版本管理系统，支持应用版本检查和更新日志
- 统计分析功能增强，新增预算统计分析
- 移动端体验优化，增加振动反馈
- 建议在升级前备份数据库

**v0.5.0版本重要提醒**：
- 新增对象存储功能，首次启动会自动配置MinIO
- 会员系统和记账点功能需要数据库迁移
- 建议在升级前备份数据库

### 管理命令

```bash
# 停止服务
./stop.sh

# 清理所有数据
./stop.sh --clean

# 查看日志
docker-compose -p zhiweijz logs -f

# 更新应用
docker pull zj591227045/zhiweijz-frontend:latest
docker pull zj591227045/zhiweijz-backend:latest
./start.sh
```

详细的Docker部署文档请参考: [Docker部署指南](docker/README.md)

## 📚 文档

详细的项目文档位于 `docs` 目录:

### 项目规划文档

- [项目规划](docs/project_plan.md)
- [技术栈详细说明](docs/tech_stack.md)
- [实施计划](docs/implementation_plan.md)
- [数据库模型设计](docs/database_schema.md)
- [API设计](docs/api_design.md)
- [AI功能设计](docs/ai_features.md)
- [UI设计](docs/ui_design.md)

### 移动应用开发文档

- [React Native技术规划](docs/App/01_React_Native技术规划.md)
- [页面转换详细规划](docs/App/02_页面转换详细规划.md)
- [React Native实施指南](docs/App/03_React_Native实施指南.md)
- [React Native转换总结](docs/App/04_React_Native转换总结.md)
- [跨平台开发总结与规划](docs/App/05_跨平台开发总结与规划.md)
- [离线功能实现方案](docs/App/06_离线功能实现方案.md)

### 部署文档

- [Docker部署指南](docker/README.md)
- [详细部署文档](docker/docs/DEPLOYMENT.md)
- [故障排除指南](docker/docs/TROUBLESHOOTING.md)

### 微信集成文档

- [微信集成快速启动](docs/wechat_integration/quick_start.md)
- [微信集成API文档](docs/wechat_integration/api_integration.md)
- [微信集成部署指南](docs/wechat_integration/deployment_guide.md)
- [微信集成项目总结](docs/wechat_integration/project_summary.md)

## 🛠️ 相关工具

### 微信助手工具
专为"只为记账"设计的微信自动化工具，支持批量处理微信消息和记账：

🔗 **项目地址**: [wxauto4zhiweijz](https://github.com/zj591227045/wxauto4zhiweijz)

**主要功能**：
- 📱 微信消息自动化处理
- 🤖 智能识别和记账
- 📊 批量数据处理
- 🔄 自动同步到记账系统

### 记录导入工具
强大的数据导入工具，支持从各种记账软件导入数据：

🔗 **项目地址**: [zhiweijz_import_records](https://github.com/zj591227045/zhiweijz_import_records)

**支持格式**：
- 📄 Excel/CSV文件导入
- 💳 银行流水导入
- 📱 其他记账软件数据迁移
- 🔧 自定义数据格式适配

## 开发指南

### 环境要求

- Node.js 18+
- Yarn 1.22+
- React Native环境（用于移动端开发）
  - Android Studio（Android开发）
  - Xcode（iOS开发，仅macOS）

### 安装依赖

```bash
# 安装所有依赖
yarn install
```

### 开发命令

**核心包开发**：

```bash
# 构建核心包
yarn workspace @zhiweijz/core build

# 开发模式（监视文件变化）
yarn workspace @zhiweijz/core dev
```

**Web应用开发**：

```bash
# 启动Web开发服务器
yarn workspace @zhiweijz/web-app dev

# 构建Web应用
yarn workspace @zhiweijz/web-app build
```

**Android应用开发**：

```bash
# 启动Metro服务器
yarn workspace @zhiweijz/android-app start

# 在模拟器或设备上运行
yarn workspace @zhiweijz/android-app android

# 构建发布版APK
yarn workspace @zhiweijz/android-app build
```

**iOS应用开发**（仅macOS）：

```bash
# 启动Metro服务器
yarn workspace @zhiweijz/ios-app start

# 在模拟器或设备上运行
yarn workspace @zhiweijz/ios-app ios

# 构建应用
yarn workspace @zhiweijz/ios-app build
```

**微信集成开发**：

```bash
# 进入服务器目录
cd server

# 启动微信集成开发环境（包含环境检查）
npm run wechat:dev

# 运行微信集成测试
npm run wechat:test

# 清理微信消息日志
npm run wechat:cleanup

# 检查微信服务状态
curl http://localhost:3000/api/wechat/health
```

### 代码共享指南

1. **业务逻辑共享**：
   - 将共享的业务逻辑、API服务和类型定义放在`packages/core`中
   - 确保核心包不依赖于特定平台的API

2. **UI组件**：
   - Web特定组件放在`packages/web`中
   - 移动端特定组件放在`packages/mobile`中
   - 组件应遵循相同的接口设计，便于跨平台使用

3. **新功能开发流程**：
   - 先在核心包中实现平台无关的业务逻辑
   - 然后在Web和移动端分别实现UI层
   - 使用相同的数据模型和状态管理

## 开发状态

✅ **项目已正式发布**：
- Web端功能完整
- iOS和Android客户端已正式发布
- 微信公众号集成完成
- 私有部署版本功能齐全

📱 **移动端应用**：
- iOS App已上架App Store
- Android APK支持直接下载安装

🔧 **持续优化**：
- 定期功能更新和性能优化
- 用户反馈驱动的功能改进

## 📋 许可证与使用条款

### 软件许可协议

本项目遵循以下许可条款：

#### ✅ 允许的使用方式
- **个人使用**: 完全免费使用，无任何限制
- **代码修改**: 允许修改源代码以满足个人需求
- **二次分发**: 允许分享和分发修改后的版本

#### ⚠️ 商业使用限制
- **作者商业权利**: 仅原作者保留商业使用权利
- **第三方商业使用**: 除作者外，**禁止任何形式的商业使用**
- **二次开发商业化**: 基于此项目的二次开发项目如需商业使用，**必须获得作者授权**

#### 📞 商业授权联系
如需商业使用授权，请联系项目作者讨论授权条款。

#### 📄 法律条款
详细的法律条款请参见 [LICENSE](LICENSE) 文件。
