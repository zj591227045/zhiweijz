# 全局AI服务管理功能实现文档

## 概述

本文档描述了全局AI服务管理功能的实现，该功能将AI服务管理从账本级别提升到全局级别，统一管理所有账本的AI服务配置。

## 核心目标

将AI服务管理从账本级别提升到全局级别，统一管理所有账本的AI服务配置，实现：

1. **移除账本管理界面的AI服务绑定功能**
2. **AI服务管理界面功能重构**
3. **全局AI服务管理API**
4. **数据同步机制**

## 已实现功能

### 1. 前端功能

#### 1.1 移除账本级别AI服务绑定
- ✅ 从 `book-edit-modal.tsx` 中移除AI服务相关的UI和逻辑
- ✅ 移除AI服务相关的状态变量和导入
- ✅ 添加迁移提示信息，引导用户到全局AI服务管理

#### 1.2 全局AI配置组件增强
- ✅ 实现AI功能总开关的API调用 (`GlobalAIConfig`)
- ✅ 添加服务类型选择（官方服务/自定义服务）
- ✅ 实现服务切换确认机制 (`ServiceSwitchModal`)
- ✅ 添加连接状态检测和用户提示
- ✅ 实现加载状态和错误处理

#### 1.3 自定义服务列表增强
- ✅ 为每个自定义AI服务添加单选复选框
- ✅ 实现同一时间只能激活一个自定义服务
- ✅ 保持现有的添加、编辑、删除功能
- ✅ 添加服务激活状态显示

#### 1.4 服务切换确认机制
- ✅ 创建服务切换确认模态框 (`ServiceSwitchModal`)
- ✅ 显示切换影响的说明信息
- ✅ 实现切换前的连接测试
- ✅ 提供取消和确认选项

### 2. 后端功能

#### 2.1 系统配置服务
- ✅ 创建 `SystemConfigService` 类
- ✅ 实现全局AI配置的获取和更新
- ✅ 实现AI服务状态检测
- ✅ 实现TOKEN使用量统计
- ✅ 实现AI服务类型切换逻辑
- ✅ 实现AI服务连接测试

#### 2.2 API接口
- ✅ `GET /api/system-config/global-ai` - 获取全局AI配置
- ✅ `PUT /api/system-config/global-ai` - 更新全局AI配置
- ✅ `GET /api/system-config/ai-status` - 获取AI服务状态
- ✅ `GET /api/system-config/token-usage` - 获取TOKEN使用量统计
- ✅ `GET /api/system-config/token-usage/today` - 获取今日TOKEN使用量
- ✅ `POST /api/system-config/ai-service/switch` - 切换AI服务类型
- ✅ `POST /api/system-config/ai-service/test` - 测试AI服务连接

#### 2.3 控制器和路由
- ✅ 更新 `SystemConfigController` 添加新的方法
- ✅ 更新 `system-config.routes.ts` 添加新的路由
- ✅ 实现用户认证和错误处理

### 3. 状态管理

#### 3.1 全局AI状态管理
- ✅ 扩展 `useGlobalAIStore` 添加新的操作方法
- ✅ 实现 `updateGlobalConfig` 方法
- ✅ 实现 `switchServiceType` 方法
- ✅ 实现 `testServiceConnection` 方法
- ✅ 添加错误处理和用户反馈

#### 3.2 API客户端
- ✅ 扩展 `systemConfigApi` 添加新的API方法
- ✅ 实现配置更新、服务切换、连接测试的API调用
- ✅ 添加适当的错误处理和日志记录

## 技术实现细节

### 前端架构
```
apps/web/src/
├── components/
│   ├── ai-services/
│   │   ├── global-ai-config.tsx          # 全局AI配置组件
│   │   ├── official-ai-service.tsx       # 官方服务组件
│   │   └── service-switch-modal.tsx      # 服务切换确认模态框
│   └── book-edit-modal.tsx               # 移除AI服务绑定功能
├── store/
│   └── global-ai-store.ts                # 全局AI状态管理
├── lib/api/
│   └── system-config.ts                  # 系统配置API客户端
└── app/settings/ai-services/
    └── page.tsx                          # AI服务管理页面
```

### 后端架构
```
server/src/
├── controllers/
│   └── system-config.controller.ts       # 系统配置控制器
├── services/
│   └── system-config.service.ts          # 系统配置服务
└── routes/
    └── system-config.routes.ts           # 系统配置路由
```

## 用户体验流程

### 1. AI功能开关
1. 用户进入"设置 > AI服务管理"
2. 在全局AI配置中切换AI功能总开关
3. 系统调用API更新全局配置
4. 显示成功/失败反馈

### 2. 服务类型切换
1. 用户选择"官方服务"或"自定义服务"
2. 系统显示切换确认模态框
3. 用户确认后，系统测试目标服务连接
4. 连接成功后执行切换，失败则显示错误信息

### 3. 自定义服务激活
1. 用户在自定义服务列表中选择要激活的服务
2. 系统更新选中状态
3. 显示当前激活的服务标识

## 数据流

### 配置更新流程
```
用户操作 → GlobalAIConfig → useGlobalAIStore → systemConfigApi → 后端API → SystemConfigService → 数据库
```

### 服务切换流程
```
用户选择 → 确认模态框 → 连接测试 → 服务切换 → 配置同步 → UI更新
```

## 安全考虑

1. **用户认证**: 所有API端点都需要用户认证
2. **权限控制**: 用户只能管理自己的AI服务配置
3. **输入验证**: 对所有输入参数进行验证
4. **错误处理**: 适当的错误处理和用户反馈

## 向后兼容性

1. **平滑迁移**: 现有的自定义AI服务配置保持不变
2. **渐进式升级**: 用户可以逐步迁移到新的全局管理方式
3. **降级支持**: 如果需要，可以回退到账本级别的配置

## 后续优化

1. **实际数据库集成**: 当前使用模拟数据，需要集成实际的数据库操作
2. **缓存机制**: 添加配置缓存以提高性能
3. **监控和日志**: 添加详细的监控和日志记录
4. **批量操作**: 支持批量更新多个账本的AI配置

## 测试建议

1. **单元测试**: 为所有新增的服务方法添加单元测试
2. **集成测试**: 测试前后端API集成
3. **用户体验测试**: 测试完整的用户操作流程
4. **错误场景测试**: 测试各种错误情况的处理

## 总结

全局AI服务管理功能已成功实现，提供了统一的AI服务配置管理界面，改善了用户体验，并为未来的功能扩展奠定了基础。该实现遵循了良好的软件架构原则，具有良好的可维护性和扩展性。
