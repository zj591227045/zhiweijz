# 内置静默日志管理系统

## 概述

应用内置了一个完全静默的日志管理系统，默认禁用所有调试日志，确保生产环境的干净控制台。

## 特点

- **默认禁用**：所有调试日志默认被过滤
- **无需配置**：不依赖任何环境变量
- **完全隐藏**：普通用户无法发现此功能
- **开发者友好**：内部开发者可临时启用调试

## 开发者命令

⚠️ **内部使用** - 以下命令仅供开发团队使用

在浏览器控制台中使用以下命令：

```javascript
// 基础控制（静默执行，无提示）
enableLogs()                    // 启用所有日志
disableLogs()                   // 禁用所有日志
enableLogs('warn')              // 启用warn级别及以上日志

// 查看状态
getLogConfig()                  // 查看当前配置

// 测试功能
testLogs()                      // 测试日志过滤效果

// 重置配置
clearLogConfig()                // 清除配置，恢复默认
```

## 日志级别

| 级别 | 包含的日志类型 |
|------|----------------|
| `debug` | console.log, console.debug, console.info, console.warn, console.error |
| `info` | console.info, console.warn, console.error |
| `warn` | console.warn, console.error |
| `error` | console.error |

## 使用场景

### 生产环境临时调试

1. 打开浏览器开发者工具
2. 在控制台执行：`enableLogs()`
3. 进行需要调试的操作
4. 查看日志输出
5. 调试完成后执行：`disableLogs()`

### 配置持久化

```javascript
// 设置仅显示警告和错误
enableLogs('warn')

// 配置会自动保存到localStorage
// 刷新页面后仍然保持此设置
```

## 技术特点

- **完全隐藏**：普通用户无法发现此功能
- **零侵入性**：不需要修改现有的console调用
- **持久化配置**：运行时修改会保存到localStorage
- **灵活过滤**：支持多种日志级别的精确控制
- **生产安全**：默认禁用所有调试日志
- **静默运行**：不输出任何管理器相关信息

## 实现原理

系统在HTML head中直接插入script标签，在任何其他JavaScript加载之前就重写console方法，确保所有日志都被正确管理。

## 安全性

- 功能完全隐藏，不暴露给最终用户
- 只有知道命令的开发者才能使用
- 默认禁用状态确保生产环境安全
