#!/bin/bash

# 恢复文档中的路径引用
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|// server/server/src/|// server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|server/server/src/|server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|../../../server/server/src/|../../../server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|../../server/server/src/|../../server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|../../../../server/server/src/|../../../../server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|server/server/prisma/|server/prisma/|g'

echo "文档路径修复完成"
