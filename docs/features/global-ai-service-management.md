# 全局AI服务管理功能实现文档

## 📋 功能概述

本文档描述了全局AI服务管理功能的完整实现，包括官方AI服务和自定义AI服务的统一管理界面。

## 🎯 实现的功能

### 1. 全局AI配置
- ✅ AI功能总开关（启用/禁用AI功能）
- ✅ AI服务类型选择（官方服务 vs 自定义服务）
- ✅ 统一的配置界面和用户体验

### 2. 官方AI服务管理
- ✅ 官方AI服务运行状态指示器
- ✅ 今日TOKEN使用量统计
- ✅ 每日免费TOKEN额度显示（50,000 TOKEN）
- ✅ 使用量进度条和百分比显示
- ✅ 服务状态实时检查和响应时间显示

### 3. 自定义AI服务管理
- ✅ 保持现有的AI服务管理功能
- ✅ 用户自定义AI服务的CRUD操作
- ✅ AI服务连接测试和配置验证

### 4. 服务优先级逻辑
- ✅ 官方服务优先级高于自定义服务
- ✅ 启用官方服务时自动覆盖账本AI服务绑定

## 🏗️ 技术架构

### 后端实现

#### 新增API接口
```
GET /api/system-config/global-ai        # 获取全局AI配置
GET /api/system-config/ai-status        # 获取AI服务状态
GET /api/system-config/token-usage      # 获取TOKEN使用量统计
GET /api/system-config/token-usage/today # 获取今日TOKEN使用量
```

#### 新增文件
- `server/src/routes/system-config.routes.ts` - 系统配置路由
- `server/src/controllers/system-config.controller.ts` - 系统配置控制器
- `server/src/services/system-config.service.ts` - 系统配置服务
- `server/src/services/token-usage.service.ts` - TOKEN使用量统计服务

#### 数据库配置
基于现有的 `system_configs` 表，新增以下配置项：
```sql
llm_global_enabled          # 是否启用全局LLM配置
llm_global_provider         # 全局LLM服务提供商
llm_global_model           # 全局LLM模型
llm_global_api_key         # 全局LLM API密钥
llm_global_base_url        # 全局LLM服务地址
llm_global_temperature     # 全局LLM温度参数
llm_global_max_tokens      # 全局LLM最大Token数
llm_daily_token_limit      # 每日免费Token额度
```

### 前端实现

#### 新增组件
- `apps/web/src/components/ai-services/global-ai-config.tsx` - 全局AI配置组件
- `apps/web/src/components/ai-services/official-ai-service.tsx` - 官方AI服务组件

#### 新增API和状态管理
- `apps/web/src/lib/api/system-config.ts` - 系统配置API
- `apps/web/src/store/global-ai-store.ts` - 全局AI状态管理

#### 重构的文件
- `apps/web/src/app/settings/ai-services/page.tsx` - 主页面重构
- `apps/web/src/app/settings/ai-services/ai-services.module.css` - 样式扩展

## 🎨 用户界面设计

### 页面布局
```
AI服务管理页面
├── 全局AI配置组件
│   ├── AI功能总开关
│   └── AI服务类型选择（官方服务 | 自定义服务）
├── 官方AI服务组件（当选择官方服务时）
│   ├── 服务状态指示器
│   ├── 今日TOKEN使用量统计
│   ├── 使用量进度条
│   └── 免费额度信息
└── 自定义AI服务列表（当选择自定义服务时）
    ├── AI服务列表
    ├── 添加/编辑/删除操作
    └── 连接测试功能
```

### 视觉特性
- 🎨 统一的卡片式设计风格
- 📱 响应式布局，支持移动端
- 🌙 深色模式兼容
- ⚡ 流畅的动画和过渡效果
- 🔄 实时状态更新和加载指示器

## 📊 TOKEN使用量统计

### 统计维度
- **今日使用量**: 当前用户今日已使用的TOKEN数量
- **剩余额度**: 今日剩余可用TOKEN数量
- **使用率**: 今日使用量占每日额度的百分比
- **调用次数**: 成功和失败的API调用统计

### 数据来源
基于现有的 `llm_call_logs` 表进行统计：
- 按用户ID过滤
- 按日期范围查询
- 区分成功和失败的调用
- 统计TOKEN消耗量

## 🔧 配置说明

### 环境变量
无需新增环境变量，使用现有的数据库配置。

### 数据库迁移
运行以下迁移脚本添加必要的配置项：
```bash
# 执行补充的LLM配置迁移
psql -d your_database -f server/migrations/incremental/add-llm-configs.sql
```

## 🚀 部署说明

### 前端部署
1. 确保所有新增的组件和API调用正确导入
2. 检查CSS样式在不同主题下的兼容性
3. 验证响应式设计在移动端的表现

### 后端部署
1. 运行数据库迁移脚本
2. 确保新增的路由正确注册
3. 验证API接口的认证和权限控制

## 🧪 测试建议

### 功能测试
1. **AI功能开关测试**
   - 验证开关状态的保存和恢复
   - 测试开关对其他功能的影响

2. **官方服务状态测试**
   - 验证服务状态检查的准确性
   - 测试网络异常情况的处理

3. **TOKEN使用量测试**
   - 验证统计数据的准确性
   - 测试不同时间范围的查询

4. **服务类型切换测试**
   - 验证官方服务和自定义服务的切换
   - 测试数据加载和状态管理

### 性能测试
1. **API响应时间**: 确保新增API的响应时间在可接受范围内
2. **前端渲染性能**: 验证组件渲染和状态更新的性能
3. **数据库查询优化**: 确保TOKEN统计查询的效率

## 📝 使用说明

### 管理员配置
1. 登录管理员后台
2. 在系统配置中设置全局LLM相关参数
3. 配置官方AI服务的API密钥和服务地址

### 用户使用
1. 访问 "设置 > AI服务管理" 页面
2. 使用AI功能开关启用或禁用AI功能
3. 选择使用官方服务或自定义服务
4. 查看TOKEN使用量和服务状态

## 🔮 未来扩展

### 计划中的功能
- [ ] TOKEN使用量历史图表
- [ ] 多种官方AI服务提供商支持
- [ ] 用户级别的TOKEN配额管理
- [ ] AI服务性能监控和告警
- [ ] 批量AI服务配置导入/导出

### 技术优化
- [ ] 缓存机制优化
- [ ] 实时数据推送
- [ ] 更细粒度的权限控制
- [ ] API限流和熔断机制
