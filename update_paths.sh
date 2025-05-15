#!/bin/bash

# 更新文档中的路径引用
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|// src/|// server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|src/|server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|../../../src/|../../../server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|../../src/|../../server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|../../../../src/|../../../../server/src/|g'
find /Users/jackson/Documents/VSCode/zhiweijz/docs/backend -name "*.md" -type f | xargs sed -i '' 's|prisma/|server/prisma/|g'

echo "文档路径更新完成"
