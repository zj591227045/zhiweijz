# 导入记账记录网页 - 技术规划

## 技术选型

### 1. 前端技术栈

#### 核心技术
- **Vue 3.3+**: 使用Composition API，提供更好的TypeScript支持
- **TypeScript 5.0+**: 强类型支持，提高代码质量
- **Vite 4.0+**: 快速构建工具，支持热更新
- **Vue Router 4**: 单页面路由管理
- **Pinia**: 轻量级状态管理

#### UI框架
- **Element Plus**: 成熟的Vue 3组件库
- **TailwindCSS**: 实用性CSS框架（可选）
- **@element-plus/icons-vue**: 图标库

#### 文件处理
- **SheetJS (xlsx)**: Excel文件读写
- **PapaParse**: CSV文件解析
- **FileSaver.js**: 文件下载功能

#### 工具库
- **Axios**: HTTP客户端
- **Day.js**: 日期处理
- **Lodash**: 工具函数库
- **crypto-js**: 数据加密

### 2. 开发工具配置

#### 代码质量
```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts",
    "lint:fix": "eslint . --ext .vue,.js,.jsx,.cjs,.mjs,.ts,.tsx,.cts,.mts --fix",
    "format": "prettier --write src/",
    "type-check": "vue-tsc --noEmit"
  }
}
```

#### ESLint配置
- @typescript-eslint/eslint-plugin
- eslint-plugin-vue
- eslint-config-prettier

#### Prettier配置
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

## 项目结构设计

```
import-records-app/
├── public/
│   ├── favicon.ico
│   └── sample_import_template.xlsx
├── src/
│   ├── api/                    # API接口
│   │   ├── index.ts
│   │   ├── auth.ts
│   │   ├── account-book.ts
│   │   ├── category.ts
│   │   ├── budget.ts
│   │   └── transaction.ts
│   ├── components/             # 组件
│   │   ├── common/
│   │   │   ├── AppHeader.vue
│   │   │   ├── LoadingSpinner.vue
│   │   │   └── ErrorMessage.vue
│   │   ├── server-config/
│   │   │   └── ServerConfigForm.vue
│   │   ├── auth/
│   │   │   └── LoginForm.vue
│   │   ├── account-book/
│   │   │   └── AccountBookSelector.vue
│   │   ├── file-upload/
│   │   │   ├── FileUploader.vue
│   │   │   └── FilePreview.vue
│   │   ├── category-mapping/
│   │   │   ├── CategoryMapper.vue
│   │   │   └── MappingRule.vue
│   │   ├── data-preview/
│   │   │   ├── DataTable.vue
│   │   │   └── DataEditor.vue
│   │   └── import-report/
│   │       └── ImportReport.vue
│   ├── stores/                 # 状态管理
│   │   ├── index.ts
│   │   ├── server-config.ts
│   │   ├── auth.ts
│   │   ├── account-book.ts
│   │   ├── category.ts
│   │   ├── import-data.ts
│   │   └── app-settings.ts
│   ├── utils/                  # 工具函数
│   │   ├── storage.ts
│   │   ├── file-parser.ts
│   │   ├── category-matcher.ts
│   │   ├── data-validator.ts
│   │   ├── encryption.ts
│   │   └── constants.ts
│   ├── types/                  # 类型定义
│   │   ├── api.ts
│   │   ├── storage.ts
│   │   ├── import.ts
│   │   └── common.ts
│   ├── views/                  # 页面视图
│   │   ├── HomePage.vue
│   │   ├── ImportWizard.vue
│   │   └── ImportReport.vue
│   ├── router/
│   │   └── index.ts
│   ├── styles/
│   │   ├── main.css
│   │   └── variables.css
│   ├── App.vue
│   └── main.ts
├── .env.example
├── .env.development
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## 核心技术实现

### 1. 智能分类匹配算法

```typescript
// 分类匹配配置
interface CategoryMappingConfig {
  standardCategories: StandardCategory[];
  mappingRules: MappingRule[];
  customMappings: CustomMapping[];
}

interface MappingRule {
  keywords: string[];
  targetCategory: string;
  confidence: number;
  type: 'exact' | 'fuzzy' | 'regex';
}

// 智能匹配实现
class CategoryMatcher {
  private config: CategoryMappingConfig;
  
  match(originalCategory: string): CategoryMatch {
    // 1. 精确匹配
    const exactMatch = this.exactMatch(originalCategory);
    if (exactMatch) return exactMatch;
    
    // 2. 模糊匹配
    const fuzzyMatch = this.fuzzyMatch(originalCategory);
    if (fuzzyMatch && fuzzyMatch.confidence > 0.8) return fuzzyMatch;
    
    // 3. 关键词匹配
    const keywordMatch = this.keywordMatch(originalCategory);
    if (keywordMatch) return keywordMatch;
    
    // 4. 默认分类
    return this.getDefaultCategory();
  }
}
```

### 2. 文件解析器

```typescript
// 文件解析器接口
interface FileParser {
  parse(file: File): Promise<ImportRecord[]>;
  validate(data: ImportRecord[]): ValidationResult;
}

// Excel解析器
class ExcelParser implements FileParser {
  async parse(file: File): Promise<ImportRecord[]> {
    const workbook = XLSX.read(await file.arrayBuffer());
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    return jsonData.map(row => this.transformRow(row));
  }
}

// CSV解析器
class CSVParser implements FileParser {
  async parse(file: File): Promise<ImportRecord[]> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          resolve(results.data.map(row => this.transformRow(row)));
        },
        error: reject
      });
    });
  }
}
```

### 3. 数据存储管理

```typescript
// 存储管理器
class StorageManager {
  private encryptionKey: string;
  
  // 加密存储敏感数据
  setSecure(key: string, value: any): void {
    const encrypted = CryptoJS.AES.encrypt(
      JSON.stringify(value), 
      this.encryptionKey
    ).toString();
    localStorage.setItem(key, encrypted);
  }
  
  // 解密读取敏感数据
  getSecure(key: string): any {
    const encrypted = localStorage.getItem(key);
    if (!encrypted) return null;
    
    const decrypted = CryptoJS.AES.decrypt(encrypted, this.encryptionKey);
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  }
  
  // 清理过期数据
  cleanup(): void {
    const now = Date.now();
    const expirationTime = 24 * 60 * 60 * 1000; // 24小时
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('import_session_')) {
        const data = this.get(key);
        if (data?.timestamp && (now - data.timestamp) > expirationTime) {
          localStorage.removeItem(key);
        }
      }
    }
  }
}
```

### 4. API封装

```typescript
// API基础配置
class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  
  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.setupInterceptors();
  }
  
  private setupInterceptors(): void {
    // 请求拦截器
    axios.interceptors.request.use(
      (config) => {
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    // 响应拦截器
    axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.handleUnauthorized();
        }
        return Promise.reject(error);
      }
    );
  }
}

// 具体API实现
class TransactionAPI extends ApiClient {
  async batchImport(
    accountBookId: string, 
    transactions: ImportRecord[]
  ): Promise<ImportResult> {
    const response = await this.post('/api/transactions/import', {
      accountBookId,
      transactions,
      options: {
        skipBudgetCalculation: true
      }
    });
    
    return response.data;
  }
}
```

### 5. 状态管理

```typescript
// Pinia Store
export const useImportStore = defineStore('import', {
  state: (): ImportState => ({
    currentStep: 1,
    serverConfig: null,
    userSession: null,
    selectedAccountBook: null,
    uploadedFile: null,
    parsedData: [],
    mappingConfig: null,
    previewData: [],
    importProgress: null,
    importResult: null,
  }),
  
  actions: {
    async parseFile(file: File): Promise<void> {
      this.uploadedFile = file;
      const parser = this.getFileParser(file);
      this.parsedData = await parser.parse(file);
      
      // 触发智能分类匹配
      await this.performCategoryMapping();
    },
    
    async performCategoryMapping(): Promise<void> {
      const matcher = new CategoryMatcher(this.mappingConfig);
      
      this.previewData = this.parsedData.map(record => ({
        ...record,
        mappedCategory: matcher.match(record.originalCategory),
        needsReview: matcher.needsReview(record.originalCategory)
      }));
    },
    
    async executeImport(): Promise<void> {
      const api = new TransactionAPI(this.serverConfig.baseURL);
      api.setToken(this.userSession.token);
      
      this.importProgress = { current: 0, total: this.previewData.length };
      
      // 分批导入
      const batchSize = 50;
      const batches = this.chunkArray(this.previewData, batchSize);
      
      for (const batch of batches) {
        await api.batchImport(this.selectedAccountBook.id, batch);
        this.importProgress.current += batch.length;
      }
    }
  }
});
```

## 部署配置

### 1. 构建配置

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [vue()],
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          ui: ['element-plus'],
          utils: ['axios', 'xlsx', 'papaparse']
        }
      }
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
});
```

### 2. 环境配置

```bash
# .env.production
VITE_APP_TITLE=记账数据导入工具
VITE_OFFICIAL_API_URL=https://api.zhiweijz.com
VITE_APP_VERSION=1.0.0
```

### 3. Docker化部署

```dockerfile
# Dockerfile
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 测试策略

### 1. 单元测试
- **Vitest**: 快速的单元测试框架
- **@vue/test-utils**: Vue组件测试工具
- **Testing Library**: 用户行为驱动的测试

### 2. 集成测试
- **Cypress**: 端到端测试
- **Mock Service Worker**: API模拟

### 3. 性能测试
- **Lighthouse**: 性能评估
- **Bundle Analyzer**: 打包分析

## 优化策略

### 1. 代码分割
- 路由级别的懒加载
- 组件级别的异步加载
- 第三方库的分包处理

### 2. 缓存策略
- Service Worker缓存
- localStorage缓存
- HTTP缓存控制

### 3. 性能监控
- 错误监控集成
- 性能指标收集
- 用户行为分析 