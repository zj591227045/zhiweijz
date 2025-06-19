# 系统性能监控功能

## 概述

系统性能监控功能为管理端提供了实时的系统性能历史数据展示，包括磁盘使用率、CPU使用率和内存使用率的历史趋势图表。

## 功能特性

### 📊 性能指标监控
- **磁盘使用率**: 每分钟收集一次磁盘空间使用情况
- **CPU使用率**: 每10秒收集一次CPU使用率
- **内存使用率**: 每10秒收集一次内存使用情况

### 📈 历史数据展示
- 支持四种时间范围：小时、天、周、30天
- 实时图表展示，支持数据刷新
- 显示平均值、最小值、最大值和样本数量
- 移动端适配的响应式设计

### 🗄️ 数据管理
- 自动保留最近30天的性能数据
- 定时清理过期数据，避免数据库膨胀
- 高效的数据查询和聚合

## 数据库结构

### system_performance_history 表

```sql
CREATE TABLE system_performance_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type VARCHAR(20) NOT NULL, -- 'disk', 'cpu', 'memory'
    metric_value DECIMAL(5,2) NOT NULL, -- 使用率百分比 (0.00-100.00)
    additional_data JSONB, -- 额外数据
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 索引优化

- `idx_system_performance_metric_type`: 按指标类型索引
- `idx_system_performance_recorded_at`: 按记录时间索引
- `idx_system_performance_type_time`: 复合索引，优化查询性能
- `idx_system_performance_recent`: 最近30天数据的部分索引

## API 接口

### 获取性能历史数据

```
GET /api/admin/dashboard/performance/history?metricType={type}&timeRange={range}
```

**参数:**
- `metricType`: 指标类型 (`disk`, `cpu`, `memory`)
- `timeRange`: 时间范围 (`hour`, `day`, `week`, `30days`)

**响应:**
```json
{
  "success": true,
  "data": {
    "metricType": "cpu",
    "timeRange": "day",
    "data": [
      {
        "time": "2024-01-01T10:00:00Z",
        "avgValue": 45.5,
        "minValue": 30.2,
        "maxValue": 78.9,
        "sampleCount": 60
      }
    ]
  }
}
```

### 获取所有性能历史数据

```
GET /api/admin/dashboard/performance/all?timeRange={range}
```

### 获取性能统计信息

```
GET /api/admin/dashboard/performance/stats?metricType={type}&hours={hours}
```

## 配置选项

系统配置表中的相关配置项：

| 配置键 | 默认值 | 说明 |
|--------|--------|------|
| `performance_monitoring_enabled` | `true` | 性能监控开关 |
| `performance_data_retention_days` | `30` | 数据保留天数 |
| `disk_monitoring_interval_minutes` | `1` | 磁盘监控间隔（分钟） |
| `cpu_memory_monitoring_interval_seconds` | `10` | CPU/内存监控间隔（秒） |

## 部署和升级

### 数据库迁移

系统会自动执行从版本1.5.0到1.6.0的数据库迁移：

```bash
# 检查迁移状态
node scripts/migration-manager.js status

# 执行迁移
node scripts/migration-manager.js migrate
```

### 服务启动

性能监控服务会在应用启动时自动启动：

1. 任务调度器启动
2. 性能数据收集开始
3. 定时清理任务启动

### 测试功能

使用测试脚本验证功能：

```bash
cd server
npm run build
node scripts/test-performance-monitoring.js
```

## 前端组件

### PerformanceHistoryCard

性能历史图表组件，支持：

- 实时数据加载和刷新
- 时间范围切换
- 响应式设计
- 错误处理和重试

**使用示例:**

```tsx
<PerformanceHistoryCard
  metricType="cpu"
  title="CPU使用率"
  color="#F59E0B"
  unit="%"
/>
```

### 管理端仪表盘集成

在 `AdminDashboard.tsx` 中已集成三个性能历史图表：

- 磁盘使用率（红色）
- CPU使用率（橙色）
- 内存使用率（绿色）

## 性能优化

### 数据收集优化

- 使用异步收集，避免阻塞主线程
- 批量插入数据，提高写入效率
- 错误处理和重试机制

### 查询优化

- 使用聚合视图优化不同时间范围的查询
- 索引优化，提高查询速度
- 分页和限制结果数量

### 存储优化

- 定时清理过期数据
- 使用JSONB存储额外数据
- 压缩历史数据

## 故障排除

### 常见问题

1. **数据收集不工作**
   - 检查性能监控是否启用
   - 查看服务器日志中的错误信息
   - 验证数据库连接

2. **图表不显示数据**
   - 检查API接口是否正常
   - 验证时间范围参数
   - 查看浏览器控制台错误

3. **数据库迁移失败**
   - 检查数据库权限
   - 查看迁移日志
   - 手动执行迁移SQL

### 日志监控

关键日志信息：

- 性能数据收集日志
- 数据清理日志
- API请求错误日志
- 数据库连接错误

## 未来扩展

### 计划功能

- 性能告警和通知
- 更多系统指标监控
- 性能数据导出
- 自定义监控阈值
- 性能趋势分析

### 扩展建议

- 添加网络I/O监控
- 集成第三方监控服务
- 实现性能基准测试
- 添加性能优化建议
