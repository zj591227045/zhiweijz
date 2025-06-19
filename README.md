# 只为记账 (ZhiWeiJZ)

一个简单、纯粹的，AI驱动的移动端记账工具。

## 🎉 最新版本 v0.2.5 重大更新

### 客户端正式发布
- ✅ **正式发布iOS、Android客户端**
- 📱 支持完整的移动端记账体验

### 新增功能
- 🏷️ **标签管理**: 支持自定义标签，更灵活的交易分类
- 📊 **统计分析优化**: 支持更灵活的检索和数据分析
- 👤 **头像设置**: 个性化用户头像功能
- 📥 **数据导入**: 支持从其他记账工具导入数据
- 🗑️ **用户注销**: 支持完整的账户注销功能
- 🎨 **样式优化**: 全面优化用户界面体验

### 微信公众号增强
- 💬 **智能记账**: 发送文字信息即可智能记账
- 🔍 **账单查询**: 通过公众号快速查询账单信息
- 🔗 **账本绑定**: 支持公众号与账本的便捷绑定

### 私有部署版本专享功能
- ⚖️ **LLM负载均衡**: 多服务配置，故障自动切换
- 📊 **Token限额管理**: 全局和用户级别的Token使用限制
- 🔧 **自定义API**: 支持OpenAI兼容的自定义API配置
- 📈 **系统监控**: 实时监控系统资源并保存历史记录
- 🔐 **密码重置**: 管理员可重置用户密码功能

## 项目概述

"只为记账"是一个专注于移动端体验的记账应用，采用B/S架构，支持多用户访问和家庭账本共享。应用通过AI技术提供智能化的财务管理体验，帮助用户更好地理解自己的消费模式，优化预算管理。

## 核心功能

- **记账功能**: 支持收入、支出记账，自定义分类管理
- **标签管理**: 灵活的标签系统，支持多维度交易分类
- **预算管理**: 个人和家庭预算设置，支持预算透支顺延
- **家庭账本**: 多用户共享账本，支持未注册用户(如孩子)的支出记录
- **AI驱动**: 智能交易分类，消费模式分析，预算建议
- **微信集成**: 支持微信公众号智能记账，便捷的移动端记账体验
- **统计分析**: 多维度数据分析，支持灵活的检索和报表生成
- **数据管理**: 支持数据导入导出，用户头像设置，账户注销等完整功能
- **移动客户端**: 原生iOS和Android应用，完整的移动端体验

## 技术栈

- **前端**: React + Next.js, Tailwind CSS
- **移动端**: React Native, React Native Paper
- **后端**: Node.js
- **数据库**: PostgreSQL
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

### 一键部署

使用Docker可以快速部署完整的应用栈，包括前端、后端、数据库和Nginx反向代理：

```bash
# 1. 克隆项目
git clone <repository-url>
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

**从旧版本升级到v0.2.5的步骤**：

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
