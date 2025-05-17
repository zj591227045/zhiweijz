#!/bin/bash

# 这个脚本用于更新所有提示词文件，添加页面布局和样式要求部分

# 已更新的文件列表
UPDATED_FILES=(
  "docs/client/ai_prompts/主题设置页.md"
  "docs/client/ai_prompts/创建编辑账本页.md"
  "docs/client/ai_prompts/分类分析页.md"
  "docs/client/ai_prompts/分类列表页.md"
  "docs/client/ai_prompts/个人资料页.md"
  "docs/client/ai_prompts/设置页.md"
)

# 获取模板内容
TEMPLATE_CONTENT=$(cat docs/client/ai_prompts/update_template.md)

# 查找所有需要更新的文件
for file in docs/client/ai_prompts/*.md; do
  # 跳过已更新的文件和模板文件
  if [[ " ${UPDATED_FILES[@]} " =~ " ${file} " ]] || [[ "$file" == "docs/client/ai_prompts/update_template.md" ]]; then
    continue
  fi
  
  echo "正在处理文件: $file"
  
  # 获取文件名（不含路径和扩展名）
  filename=$(basename "$file" .md)
  
  # 检查文件是否已包含页面布局和样式要求部分
  if grep -q "## 页面布局和样式要求" "$file"; then
    echo "文件 $file 已包含页面布局和样式要求部分，跳过"
    continue
  fi
  
  # 查找组件结构部分
  if grep -q "## 组件结构" "$file"; then
    # 提取主页面组件名称
    main_component=$(grep -A 2 "## 组件结构" "$file" | grep -o "\`[A-Za-z0-9]*Page\`" | head -1 | tr -d '`')
    
    # 如果没有找到主页面组件，使用默认名称
    if [ -z "$main_component" ]; then
      main_component="${filename}Page"
    fi
    
    # 确定activeNavItem
    active_nav_item="home"
    if [[ "$filename" == *"预算"* ]]; then
      active_nav_item="budget"
    elif [[ "$filename" == *"统计"* ]] || [[ "$filename" == *"分析"* ]]; then
      active_nav_item="stats"
    elif [[ "$filename" == *"资料"* ]] || [[ "$filename" == *"设置"* ]] || [[ "$filename" == *"账户"* ]] || [[ "$filename" == *"主题"* ]]; then
      active_nav_item="profile"
    fi
    
    # 创建自定义模板
    custom_template="## 页面布局和样式要求

为确保应用程序中所有页面的布局和样式保持一致，请遵循以下要求：

1. **使用统一的页面容器组件**：
   - 在开发新页面时，始终使用 \`PageContainer\` 组件作为最外层容器
   - 不要在页面中使用自定义的容器结构，如 \`<div className=\"app-container\">\` 等

2. **PageContainer 组件的正确使用**：
   \`\`\`tsx
   import { PageContainer } from \"@/components/layout/page-container\";
   
   export default function ${main_component}() {
     return (
       <PageContainer 
         title=\"${filename//_/ }\"
         showBackButton={true}
         activeNavItem=\"${active_nav_item}\"
       >
         {/* 页面内容 */}
         {/* 在这里放置页面组件 */}
       </PageContainer>
     );
   }
   \`\`\`

3. **参考文档**：
   - 详细了解 PageContainer 组件的使用方法，请参考 \`docs/page_layout_guidelines.md\` 文档
   - 该文档包含了组件的所有属性、使用示例和最佳实践

4. **移动端优先**：
   - 所有页面应保持移动端的固定宽度（最大宽度480px）
   - 即使在宽屏上也不应扩展到整个屏幕宽度
   - PageContainer 组件已经实现了这一限制，请不要覆盖这些样式

5. **代码审查检查点**：
   - 确保页面使用了 PageContainer 组件作为最外层容器
   - 确保没有使用自定义的容器结构覆盖全局样式
   - 确保为页面指定了正确的 activeNavItem
   - 确保页面内容结构符合移动端优先的设计原则"
    
    # 更新文件
    sed -i '' "s/## 组件结构/${custom_template}\n\n## 组件结构/" "$file"
    
    # 更新主页面组件描述
    sed -i '' "s/\`${main_component}\` - 主页面容器/\`${main_component}\` - 主页面（使用PageContainer）/" "$file"
    
    echo "已更新文件: $file"
  else
    echo "文件 $file 中未找到组件结构部分，跳过"
  fi
done

echo "所有文件处理完成"
