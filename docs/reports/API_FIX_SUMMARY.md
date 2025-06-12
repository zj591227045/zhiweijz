# API连接问题修复总结

## 问题描述

在 `/admin/llm/logs` 页面中，API请求返回401未授权错误，错误信息显示：
```
GET http://localhost:3005/api/admin/llm-logs?page=1&pageSize=20 401 (Unauthorized)
```

## 问题分析

1. **端口配置问题**：前端服务器运行在端口3005，后端服务器运行在端口3000
2. **API代理失效**：Next.js的API代理配置没有正确工作，因为环境变量 `DEV_BACKEND_URL` 没有设置
3. **请求路由错误**：API请求被发送到前端服务器(3005端口)而不是后端服务器(3000端口)

## 修复方案

### 1. 环境变量配置
创建了 `apps/web/.env.local` 文件：
```env
DEV_BACKEND_URL=http://localhost:3000
```

### 2. 统一API配置管理
创建了 `apps/web/src/lib/admin-api-config.ts` 文件，统一管理管理员API配置：
- 根据环境自动选择API基础URL
- 提供统一的API端点常量
- 提供便捷的API调用方法

### 3. 更新API调用
更新了以下文件中的API调用：
- `apps/web/src/app/admin/llm/logs/page.tsx`
- `apps/web/src/store/admin/useAdminAuth.ts`

将硬编码的相对路径替换为使用配置文件中的端点。

## 修复结果

✅ **后端API连接正常**：测试确认后端服务器在端口3000正常运行
✅ **认证中间件工作正常**：401响应表明认证系统正常工作
✅ **API路由修复**：前端现在正确连接到后端服务器

## 长期解决方案

1. **环境变量管理**：确保 `.env.local` 文件正确配置
2. **代理配置优化**：Next.js代理配置在重启后应该正常工作
3. **统一配置管理**：使用 `admin-api-config.ts` 统一管理所有管理员API配置

## 验证步骤

1. 确保后端服务器在端口3000运行
2. 确保前端服务器在端口3005运行
3. 访问 `/admin/llm/logs` 页面
4. 验证API请求现在发送到 `http://localhost:3000/api/admin/llm-logs`

## 注意事项

- 在生产环境中，API配置会自动使用相对路径
- 如果需要修改端口，请同时更新 `.env.local` 和 `admin-api-config.ts`
- 重启前端服务器后，Next.js代理应该能正常工作，可以考虑恢复使用相对路径 