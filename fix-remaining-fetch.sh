#!/bin/bash

# 快速修复剩余的fetch调用脚本

echo "开始修复剩余的fetch调用..."

# 修复 family-members-store.ts
echo "修复 family-members-store.ts..."
sed -i '' 's/const response = await fetch(`\/api\/families\/${familyId}\/members\/${memberId}\/role`, {/const response = await fetchApi(`\/api\/families\/${familyId}\/members\/${memberId}\/role`, {/g' apps/web/src/lib/stores/family-members-store.ts
sed -i '' 's/method: '\''PUT'\'',$/method: '\''PUT'\'',/g' apps/web/src/lib/stores/family-members-store.ts
sed -i '' '/headers: {$/,/},$/d' apps/web/src/lib/stores/family-members-store.ts

# 修复其他组件文件
echo "修复其他组件文件..."

# 添加 fetchApi import 到需要的文件
files=(
  "apps/web/src/components/families/detail/custodial-members.tsx"
  "apps/web/src/components/families/detail/recent-transactions.tsx"
  "apps/web/src/components/families/detail/family-statistics.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "处理文件: $file"
    # 添加 fetchApi import
    sed -i '' '/import.*sonner/a\
import { fetchApi } from '\''@/lib/api-client'\'';
' "$file"
    
    # 替换 fetch 调用
    sed -i '' 's/fetch(`\/api\//fetchApi(`\/api\//g' "$file"
    sed -i '' '/headers: {$/,/},$/d' "$file"
  fi
done

echo "修复完成！"
echo "请检查修复结果并测试API调用是否正常工作。" 