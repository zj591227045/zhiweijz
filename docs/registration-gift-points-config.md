# 注册赠送记账点配置指南

## 概述

本文档介绍如何配置新用户注册时赠送的记账点数量。系统支持通过数据库配置动态调整注册赠送点数，无需修改代码。

## 配置方式

### 1. 通过管理员API配置（推荐）

#### 获取当前配置
```bash
GET /api/admin/accounting-points/config
```

响应示例：
```json
{
  "success": true,
  "data": {
    "pointCosts": {
      "text": 1,
      "voice": 1,
      "image": 2
    },
    "checkinReward": 5,
    "dailyGift": 5,
    "registrationGift": 10,
    "giftBalanceLimit": 30
  }
}
```

#### 更新注册赠送点数
```bash
PUT /api/admin/accounting-points/config/registration-gift
Content-Type: application/json

{
  "points": 20
}
```

响应示例：
```json
{
  "success": true,
  "message": "注册赠送点数已更新为 20 点",
  "data": {
    "registrationGiftPoints": 20
  }
}
```

### 2. 直接修改数据库配置

#### 查看当前配置
```sql
SELECT * FROM system_configs WHERE key = 'registration_gift_points';
```

#### 更新配置
```sql
-- 更新注册赠送点数为15点
UPDATE system_configs 
SET value = '15', updated_at = NOW() 
WHERE key = 'registration_gift_points';

-- 如果配置不存在，则插入新配置
INSERT INTO system_configs (key, value, description, category)
VALUES (
  'registration_gift_points',
  '15',
  '新用户注册时赠送的记账点数量',
  'accounting_points'
) ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();
```

### 3. 通过环境变量配置（开发环境）

在开发环境中，可以通过修改代码中的默认值：

```typescript
// server/src/services/accounting-points.service.ts
static REGISTRATION_GIFT = 15; // 修改这个值
```

## 配置说明

### 配置项详情

| 配置键 | 默认值 | 说明 | 有效范围 |
|--------|--------|------|----------|
| `registration_gift_points` | 10 | 新用户注册时赠送的记账点数量 | 0-999999 |

### 生效机制

1. **新用户注册**：配置立即生效，新注册用户将获得配置的点数
2. **现有用户**：不影响已注册用户的记账点余额
3. **配置缓存**：每次创建用户记账点账户时都会重新读取配置

### 默认值处理

- 如果配置项不存在，使用代码中的默认值（10点）
- 如果配置值无效（非数字），使用代码中的默认值
- 如果配置值为负数，使用代码中的默认值

## 使用场景

### 1. 促销活动
```bash
# 双十一活动：注册赠送50点
curl -X PUT http://localhost:3000/api/admin/accounting-points/config/registration-gift \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"points": 50}'
```

### 2. 降低门槛
```bash
# 新用户体验：注册赠送100点
curl -X PUT http://localhost:3000/api/admin/accounting-points/config/registration-gift \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"points": 100}'
```

### 3. 恢复默认
```bash
# 恢复默认设置：10点
curl -X PUT http://localhost:3000/api/admin/accounting-points/config/registration-gift \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"points": 10}'
```

## 测试验证

### 1. 运行测试脚本
```bash
cd server
node scripts/test-registration-gift-config.js
```

### 2. 手动测试
1. 修改注册赠送点数配置
2. 注册新用户
3. 检查新用户的记账点余额
4. 查看记账点记录中的"注册赠送记账点"记录

### 3. API测试
```bash
# 获取配置
curl -X GET http://localhost:3000/api/admin/accounting-points/config \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# 更新配置
curl -X PUT http://localhost:3000/api/admin/accounting-points/config/registration-gift \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{"points": 25}'
```

## 注意事项

1. **权限要求**：只有管理员可以修改配置
2. **数据一致性**：配置修改立即生效，但不影响已注册用户
3. **备份建议**：修改配置前建议备份当前设置
4. **监控建议**：建议监控注册赠送点数的使用情况，避免过度赠送

## 故障排除

### 配置不生效
1. 检查数据库连接是否正常
2. 确认配置项是否正确插入
3. 查看应用日志是否有错误信息

### API调用失败
1. 确认管理员权限
2. 检查请求格式是否正确
3. 验证参数是否在有效范围内

### 数据库问题
```sql
-- 检查配置表结构
\d system_configs

-- 检查配置是否存在
SELECT * FROM system_configs WHERE key = 'registration_gift_points';

-- 重新创建配置（如果丢失）
INSERT INTO system_configs (key, value, description, category)
VALUES (
  'registration_gift_points',
  '10',
  '新用户注册时赠送的记账点数量',
  'accounting_points'
);
```
