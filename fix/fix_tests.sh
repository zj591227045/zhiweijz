#!/bin/bash

# 修复auth.api.test.ts
sed -i '' 's/import { createServer } from '\''..\/..\/src\/server'\'';/import app from '\''..\/..\/src\/app'\'';/g' __tests__/integration/auth.api.test.ts
sed -i '' 's/app = createServer();/app = app;/g' __tests__/integration/auth.api.test.ts

# 修复category.api.test.ts
sed -i '' 's/import { createServer } from '\''..\/..\/src\/server'\'';/import app from '\''..\/..\/src\/app'\'';/g' __tests__/integration/category.api.test.ts
sed -i '' 's/app = createServer();/app = app;/g' __tests__/integration/category.api.test.ts

# 修复transaction.api.test.ts
sed -i '' 's/import { createServer } from '\''..\/..\/src\/server'\'';/import app from '\''..\/..\/src\/app'\'';/g' __tests__/integration/transaction.api.test.ts
sed -i '' 's/app = createServer();/app = app;/g' __tests__/integration/transaction.api.test.ts

# 修复user-setting.api.test.ts
sed -i '' 's/import { createServer } from '\''..\/..\/src\/server'\'';/import app from '\''..\/..\/src\/app'\'';/g' __tests__/integration/user-setting.api.test.ts
sed -i '' 's/app = createServer();/app = app;/g' __tests__/integration/user-setting.api.test.ts

echo "修复完成"
