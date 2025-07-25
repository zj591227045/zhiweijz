# 记账记账记录导入模板说明

## 模板字段定义

根据当前数据表结构，导入模板包含以下字段：

### 必填字段

| 字段名称 | 字段说明 | 数据类型 | 示例值 | 备注 |
|---------|---------|---------|-------|------|
| **日期** | 记账发生日期 | 日期 | 2024-01-15 | 格式：YYYY-MM-DD 或 YYYY/MM/DD |
| **金额** | 记账金额 | 数字 | 25.50 | 正数表示收入，负数表示支出 |
| **类型** | 记账类型 | 文本 | 支出 | 支出/收入 或 EXPENSE/INCOME |
| **分类** | 记账分类 | 文本 | 餐饮 | 见下方标准分类列表 |

### 可选字段

| 字段名称 | 字段说明 | 数据类型 | 示例值 | 备注 |
|---------|---------|---------|-------|------|
| **描述** | 记账描述 | 文本 | 午餐 | 可为空，最多200字符 |
| **家庭成员** | 家庭记账时的成员 | 文本 | 张三 | 仅家庭账本需要 |

## 标准分类体系

### 支出分类
1. 餐饮 - 用餐、外卖、聚餐等饮食相关支出
2. 购物 - 日常购物、网购、生活用品等
3. 日用 - 日常生活必需品、家居用品等
4. 交通 - 交通费、油费、停车费、公交地铁等
5. 运动 - 健身、体育用品、运动场馆费用等
6. 娱乐 - 电影、游戏、娱乐活动等
7. 通讯 - 手机费、网费、通讯服务等
8. 服饰 - 衣服、鞋子、配饰等
9. 美容 - 美容美发、化妆品、护肤品等
10. 居家 - 家具、装修、家电等
11. 孩子 - 儿童相关支出、教育费用等
12. 长辈 - 赡养费、老人相关支出等
13. 社交 - 聚会、礼金、人情往来等
14. 旅行 - 旅游、出差、住宿等
15. 数码 - 电子产品、软件、数码配件等
16. 汽车 - 汽车相关费用、保养、维修等
17. 医疗 - 医院费用、药品、保健等
18. 还款 - 信用卡还款、贷款还款等
19. 保险 - 各类保险费用
20. 学习 - 教育培训、书籍、课程等
21. 办公 - 办公用品、办公相关费用
22. 维修 - 维修服务、修理费用等
23. 利息 - 贷款利息、手续费等

### 收入分类
1. 工资 - 基本工资、奖金等
2. 兼职 - 兼职收入、临时工作等
3. 理财 - 投资收益、理财产品收益等
4. 奖金 - 年终奖、绩效奖金等
5. 提成 - 销售提成、佣金等
6. 其他 - 其他收入来源

## 填写指引

### 1. 日期格式
- **标准格式**: 2024-01-15 或 2024/01/15
- **支持格式**: 
  - Excel日期格式（会自动识别）
  - 2024年1月15日
  - 01/15/2024
- **注意事项**: 日期不能为空，不能是未来日期

### 2. 金额填写
- **正数表示收入**: 5000、1200.50
- **负数表示支出**: -25.50、-1200
- **或者通过类型字段区分**: 金额都填正数，通过"类型"字段指定收入/支出
- **小数位数**: 最多2位小数
- **不要包含货币符号**: ❌ ¥25.50  ✅ 25.50

### 3. 记账类型
- **中文**: 收入、支出
- **英文**: INCOME、EXPENSE
- **大小写不敏感**: income、Income、INCOME 都可以

### 4. 分类填写
- **优先使用标准分类**: 直接填写上方列表中的分类名称
- **自定义分类**: 如果填写的分类不在标准列表中，系统会提示进行智能匹配
- **模糊匹配**: 系统支持模糊匹配，如"吃饭"会匹配到"餐饮"

### 5. 描述字段
- **可选填写**: 此字段可以为空
- **字符限制**: 最多200个字符
- **用途**: 记录记账的具体内容，便于后续查询和分析

### 6. 家庭成员
- **仅家庭账本需要**: 个人账本可以留空
- **填写成员姓名**: 如"张三"、"李四"
- **新成员**: 如果填写的成员不存在，系统会自动创建

## 模板示例

### Excel/CSV 格式示例

```csv
日期,金额,类型,分类,描述,家庭成员
2024-01-15,-25.50,支出,餐饮,午餐,
2024-01-14,-50.00,支出,交通,地铁卡充值,
2024-01-14,5000.00,收入,工资,月薪,
2024-01-13,-156.80,支出,购物,超市购物,张三
2024-01-12,-58.00,支出,娱乐,电影票,
```

### 多种填写方式示例

```csv
日期,金额,类型,分类,描述,家庭成员
2024-01-15,25.50,支出,餐饮,午餐,
2024-01-14,-50.00,,交通,地铁卡充值,
2024-01-14,5000,INCOME,工资,月薪,
2024/01/13,156.8,EXPENSE,购物,超市购物,张三
2024年1月12日,58,支出,娱乐,电影票,
```

## 数据验证规则

### 必填字段验证
- ❌ 日期、金额、类型、分类不能为空
- ✅ 描述和家庭成员可以为空

### 数据格式验证
- ❌ 日期格式不正确：2024-13-45
- ❌ 金额不是数字：abc、十五块
- ❌ 类型不是有效值：花费、赚钱
- ✅ 正确格式参考上方示例

### 逻辑验证
- ❌ 金额为负数但类型是收入
- ❌ 金额为正数但类型是支出
- ✅ 金额符号与类型一致，或通过类型字段统一处理

## 智能处理功能

### 1. 自动分类匹配
- **精确匹配**: "餐饮" → "餐饮"
- **模糊匹配**: "吃饭" → "餐饮"
- **关键词匹配**: "肯德基" → "餐饮"
- **需要确认**: 系统无法确定的分类会在预览时提示手动选择

### 2. 数据清洗
- **去除空白字符**: 自动去除前后空格
- **格式标准化**: 统一日期和金额格式
- **重复检测**: 检测可能的重复记账记录

### 3. 错误处理
- **数据错误**: 提供详细的错误信息和修改建议
- **部分导入**: 错误数据不影响正确数据的导入
- **错误报告**: 导入完成后生成详细的错误报告

## 常见问题解答

### Q: 如果我的分类名称和标准分类不一样怎么办？
A: 系统会自动进行智能匹配，比如"吃饭"会匹配到"餐饮"。如果无法自动匹配，会在预览阶段让您手动选择。

### Q: 金额是否必须带符号？
A: 不一定。您可以：
- 用正负号表示：-25.50表示支出，25.50表示收入
- 或者金额都用正数，通过"类型"字段指定收入/支出

### Q: 支持什么日期格式？
A: 支持多种格式，如：2024-01-15、2024/01/15、2024年1月15日等。建议使用标准格式 YYYY-MM-DD。

### Q: 可以批量导入多少条记录？
A: 建议单次导入不超过10,000条记录，文件大小不超过10MB。

### Q: 导入失败怎么办？
A: 系统会提供详细的错误信息，您可以根据提示修改数据后重新导入。部分错误不会影响其他正确数据的导入。

## 下载模板

您可以下载我们提供的标准模板文件：
- [Excel 模板文件 (.xlsx)](./记账记录导入模板.xlsx)
- [CSV 模板文件 (.csv)](./记账记录导入模板.csv)

模板文件包含了示例数据和字段说明，可以直接编辑使用。 