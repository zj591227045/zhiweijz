# 分类管理功能测试清单

## 已完成的修改

### 1. 修复分类图标显示问题 ✅
- **问题**: 添加分类页面中的分类图标没有正确显示
- **解决方案**: 将 `getCategoryIconClass` 改为 `getIconClass` 以正确显示图标
- **测试**: 访问 http://localhost:3003/settings/categories/new 查看图标是否正常显示

### 2. 创建分类编辑页面 ✅
- **功能**: 创建了分类编辑页面 `/settings/categories/[id]/edit`
- **特性**: 
  - 支持编辑分类名称、类型、图标、颜色和隐藏状态
  - 默认分类只允许修改图标、颜色和隐藏状态
  - 默认分类名称和类型不可修改
- **测试**: 从分类管理页面点击编辑按钮进入编辑页面

### 3. 优化分类排序逻辑 ✅
- **问题**: 调整分类排序后会在数据库中生成23条完整的排序记录
- **解决方案**: 
  - 只保存发生变化的分类配置，而不是全部分类
  - 使用插入式顺序ID（如1801）
  - 添加了 `updateChangedDisplayOrder` 方法
- **测试**: 在分类管理页面拖拽调整分类顺序，检查数据库中是否只有变化的记录

### 4. 实现默认分类隐藏功能 ✅
- **功能**: 默认分类不允许删除，只允许隐藏
- **特性**:
  - 修改删除确认对话框，默认分类显示"隐藏"选项
  - 隐藏后分类不会在添加记录时显示
  - 可以在分类管理中重新显示
- **测试**: 尝试删除默认分类，应该显示隐藏选项而不是删除

### 5. 添加隐藏分类管理功能 ✅
- **功能**: 可以查看和管理隐藏的分类
- **特性**:
  - 分类管理页面添加眼睛图标按钮切换查看模式
  - 支持显示隐藏的分类
  - 在查看隐藏分类时，可以重新显示分类
- **测试**: 点击眼睛图标切换查看隐藏分类

## 测试步骤

### 测试1: 分类图标显示
1. 访问 http://localhost:3003/settings/categories/new
2. 检查分类图标是否正常显示
3. 选择不同图标，确认图标能正确显示

### 测试2: 分类编辑功能
1. 访问 http://localhost:3003/settings/categories
2. 点击任意分类的编辑按钮
3. 验证编辑页面是否正常加载
4. 对于默认分类，验证名称和类型字段是否被禁用
5. 修改图标、颜色或隐藏状态，保存并验证更改

### 测试3: 分类排序优化
1. 在分类管理页面切换到列表视图
2. 拖拽调整分类顺序
3. 检查数据库 `user_category_configs` 表
4. 验证只有发生变化的分类有记录，而不是全部23条

### 测试4: 默认分类隐藏
1. 在分类管理页面尝试删除默认分类
2. 验证弹出的是"隐藏分类"对话框而不是"删除分类"
3. 确认隐藏后分类不在可见列表中显示

### 测试5: 隐藏分类管理
1. 隐藏一些分类
2. 点击分类管理页面右上角的眼睛图标
3. 验证能看到隐藏的分类
4. 尝试重新显示隐藏的分类

## 数据库验证

### 检查分类配置表
```sql
-- 查看用户分类配置
SELECT * FROM user_category_configs WHERE user_id = 'your_user_id';

-- 验证只有修改过的分类有记录
SELECT COUNT(*) FROM user_category_configs WHERE user_id = 'your_user_id';
```

### 检查分类排序
```sql
-- 查看分类排序
SELECT 
  c.name,
  c.type,
  c.is_default,
  ucc.display_order,
  ucc.is_hidden
FROM categories c
LEFT JOIN user_category_configs ucc ON c.id = ucc.category_id
WHERE ucc.user_id = 'your_user_id' OR c.is_default = true
ORDER BY ucc.display_order, c.name;
```

## API测试

### 测试隐藏分类API
```bash
# 获取所有分类（包括隐藏）
curl "http://localhost:3000/api/categories?includeHidden=true" \
  -H "Authorization: Bearer your_token"

# 获取可见分类
curl "http://localhost:3000/api/categories" \
  -H "Authorization: Bearer your_token"

# 隐藏分类
curl -X PUT "http://localhost:3000/api/user-category-configs/category_id" \
  -H "Authorization: Bearer your_token" \
  -H "Content-Type: application/json" \
  -d '{"isHidden": true}'
```

## 预期结果

1. **图标显示**: 所有分类图标应该正确显示，包括添加和编辑页面
2. **编辑功能**: 分类编辑页面应该正常工作，默认分类有适当的限制
3. **排序优化**: 数据库中只应该有实际修改过的分类配置记录
4. **隐藏功能**: 默认分类应该可以隐藏但不能删除
5. **管理界面**: 应该能够查看和管理隐藏的分类

## 注意事项

1. 确保前后端服务都在运行
2. 确保用户已登录并有有效的认证token
3. 测试时注意观察浏览器控制台和服务器日志
4. 验证数据库状态变化是否符合预期
