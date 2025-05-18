#!/bin/bash

# 编译TypeScript文件
echo "编译TypeScript文件..."
npx tsc src/tests/active-budgets.test.ts --outDir dist/tests --esModuleInterop true --module commonjs

# 运行测试
echo "运行活跃预算测试..."
node dist/tests/active-budgets.test.js

echo "测试完成!"
