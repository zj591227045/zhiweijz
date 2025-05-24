# 快速设置组件主题变量修复

## 问题描述
快速设置组件在夜间模式下出现图标和字体颜色显示异常的问题，主要表现为：
- 文字颜色在暗色主题下不可见
- 图标颜色不正确
- 背景色和边框色不匹配主题

## 问题原因
CSS变量使用不一致，设置对话框CSS中使用了一些未定义的变量：
- 使用了 `var(--primary)` 但实际定义的是 `var(--primary-color)`
- 使用了 `var(--radius)` 但实际定义的是 `var(--border-radius)`
- 缺少明确的文字颜色定义
- 使用了硬编码的rgba值而不是主题变量

## 修复内容

### 1. 统一CSS变量名称
- `var(--radius)` → `var(--border-radius)`
- `rgba(var(--primary), 0.05)` → `var(--hover-background)`
- `rgba(var(--primary), 0.1)` → `var(--primary-color-light)`
- `0 4px 12px rgba(0, 0, 0, 0.15)` → `var(--card-shadow)`

### 2. 添加明确的颜色定义
- 为所有文本元素添加 `color: var(--text-primary)`
- 为图标添加 `color: inherit` 确保继承父元素颜色
- 为次要文本使用 `color: var(--text-secondary)`

### 3. 修复的具体元素

#### 设置选项
```css
.settings-option {
  color: var(--text-primary);
}

.settings-option:hover {
  background-color: var(--hover-background);
}

.settings-option.active {
  background-color: var(--primary-color-light);
}
```

#### 账本选择器
```css
.account-book-item {
  color: var(--text-primary);
}

.account-book-item:hover {
  background-color: var(--hover-background);
}

.account-book-item.active {
  background-color: var(--primary-color-light);
}
```

#### 关闭按钮
```css
.settings-dialog-header .icon-button {
  color: var(--text-secondary);
}

.settings-dialog-header .icon-button:hover {
  background-color: var(--hover-background);
  color: var(--text-primary);
}
```

### 4. 主题变量对照表

| 亮色主题 | 暗色主题 | 用途 |
|---------|---------|------|
| `--text-primary: #1f2937` | `--text-primary: #f3f4f6` | 主要文字颜色 |
| `--text-secondary: #6b7280` | `--text-secondary: #9ca3af` | 次要文字颜色 |
| `--card-background: #ffffff` | `--card-background: #1f2937` | 卡片背景色 |
| `--border-color: #e5e7eb` | `--border-color: #374151` | 边框颜色 |
| `--hover-background: rgba(0,0,0,0.05)` | `--hover-background: rgba(255,255,255,0.1)` | 悬停背景色 |
| `--primary-color-light: rgba(59,130,246,0.1)` | `--primary-color-light: rgba(96,165,250,0.2)` | 主色调浅色版本 |

## 修复结果
- ✅ 夜间模式下文字颜色正常显示
- ✅ 图标颜色与主题一致
- ✅ 悬停效果在两种主题下都正常
- ✅ 激活状态颜色正确
- ✅ 边框和背景色匹配主题

## 测试建议
1. 在亮色主题下测试快速设置弹窗
2. 切换到暗色主题测试所有交互状态
3. 验证悬停效果和激活状态
4. 确认所有文字和图标都清晰可见

## 注意事项
- 确保所有新的CSS变量都在全局样式中正确定义
- 保持与应用其他组件的主题变量使用一致性
- 在添加新组件时优先使用主题变量而不是硬编码颜色值 