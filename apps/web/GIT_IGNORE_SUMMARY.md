# Git忽略配置总结

## 📁 目录结构重组

Android项目已从 `apps/web/android/` 移动到 `apps/android/`，保持了清晰的目录结构：

```
apps/
├── web/              # Next.js Web应用
├── android/          # Android原生项目  
└── ios/              # iOS原生项目
```

## 🚫 Git忽略的文件和目录

### Android项目 (`apps/android/`)
以下文件和目录**不会**被git跟踪：

#### 构建相关
- `.gradle/` - Gradle缓存目录
- `build/` - 根构建输出
- `app/build/` - 应用构建输出
- `*/build/` - 所有子模块的构建输出

#### 配置文件
- `local.properties` - 本地SDK路径配置
- `*.keystore` - 签名密钥文件
- `*.jks` - Java密钥库文件
- `keystore.properties` - 密钥库配置

#### IDE和缓存
- `.idea/` - Android Studio配置
- `*.iml` - IntelliJ模块文件
- `.externalNativeBuild/` - 原生构建缓存
- `.cxx/` - C++构建缓存
- `captures/` - 性能分析文件

#### 生成文件
- `capacitor-cordova-android-plugins/` - Capacitor插件缓存
- `*.apk` - APK文件
- `*.aab` - Android App Bundle文件

### Web项目 (`apps/web/`)
以下文件**不会**被git跟踪：

#### Next.js相关
- `.next/` - Next.js构建缓存
- `out/` - 静态导出输出
- `*.tsbuildinfo` - TypeScript构建信息

#### 构建产物
- `*.apk` - 生成的APK文件
- `*.aab` - 生成的AAB文件
- `*.backup` - 备份文件

## ✅ Git跟踪的重要文件

### Android项目中**会**被跟踪的文件：
- `build.gradle` - 构建配置
- `settings.gradle` - 项目设置
- `gradle.properties` - Gradle属性
- `variables.gradle` - 变量配置
- `gradlew` / `gradlew.bat` - Gradle包装器
- `gradle/wrapper/` - Gradle包装器配置
- `app/build.gradle` - 应用构建配置
- `app/src/` - 源代码目录
- `.gitignore` - Git忽略配置

### Web项目中**会**被跟踪的文件：
- `capacitor.config.ts` - Capacitor配置
- `package.json` - 项目依赖
- `scripts/` - 构建脚本
- 所有源代码文件

## 🧹 清理命令

使用以下命令清理所有不需要跟踪的文件：

```bash
npm run clean:android
```

这会删除所有构建缓存、临时文件和生成的文件，确保git仓库保持干净。

## 📋 最佳实践

1. **构建前清理**：在重要构建前运行清理命令
2. **提交前检查**：使用 `git status` 确保没有不必要的文件被跟踪
3. **定期清理**：定期运行清理脚本释放磁盘空间
4. **密钥安全**：确保所有密钥文件都被正确忽略 